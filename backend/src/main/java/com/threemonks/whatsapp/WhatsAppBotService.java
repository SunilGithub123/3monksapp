package com.threemonks.whatsapp;

import com.threemonks.dto.DailyCollectionResponse;
import com.threemonks.dto.DailyCollectionResponse.CollectionRow;
import com.threemonks.dto.StockResponse;
import com.threemonks.entity.Order;
import com.threemonks.entity.Shop;
import com.threemonks.entity.User;
import com.threemonks.enums.Role;
import com.threemonks.repository.OrderRepository;
import com.threemonks.repository.ShopRepository;
import com.threemonks.repository.UserRepository;
import com.threemonks.service.CollectionService;
import com.threemonks.service.StockService;
import com.threemonks.util.BusinessDay;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * The 3Monks WhatsApp bot: answers commands such as /sales and /stock with live
 * figures. It only replies to people who message it (free on WhatsApp), and only
 * to admins and branch managers whose WhatsApp number is saved on their user in
 * the app. Admins see every branch (or one, e.g. "/sales kharadi"); managers see
 * their own branch.
 */
@Service
public class WhatsAppBotService {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppBotService.class);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE d MMM", Locale.ENGLISH);
    private static final int MAX_PENDING_LINES = 25;

    /** Text version of the menu (also the fallback if the tap menu can't be sent). */
    static final String HELP = """
            *3Monks Bot* 🤖
            Type a command (with or without /):

            *sales* – today's sales so far
            *yesterday-sales* – yesterday's sales
            *sales 05-11* – any day
            *received* – amount received vs expected today
            *yesterday-received* – the same for yesterday
            *stock* – current stock, low items first
            *low-stock* – only low / out-of-stock items
            *pending* – orders waiting in the queue
            *menu* – show the menu
            """;

    /** reply() returns this to show the tap menu instead of text. */
    static final String MENU = "\u0000MENU";

    /** Rows of the tap menu: command id, title (max 24 chars), description (max 72). */
    static final List<String[]> MENU_ROWS = List.of(
            new String[] {"sales", "Today's sales", "Sales, orders, shots & blends so far"},
            new String[] {"yesterday-sales", "Yesterday's sales", "Full day: sales, orders, cash / UPI"},
            new String[] {"received", "Amount received", "Received vs expected, today"},
            new String[] {"yesterday-received", "Yesterday received", "Received vs expected, yesterday"},
            new String[] {"stock", "Current stock", "All materials, low items first"},
            new String[] {"low-stock", "Low / out of stock", "Only what needs reordering"},
            new String[] {"pending", "Pending orders", "Orders waiting in the queue"});

    private final WhatsAppClient client;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final OrderRepository orderRepository;
    private final CollectionService collectionService;
    private final StockService stockService;
    private final TransactionTemplate readOnly;
    private final boolean enabled;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "whatsapp-bot");
        t.setDaemon(true);
        return t;
    });
    // Meta can deliver the same message twice; remember recent message ids
    private final Set<String> seenMessages = Collections.newSetFromMap(new LinkedHashMap<>() {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Boolean> eldest) {
            return size() > 1000;
        }
    });
    // Unknown numbers get the "not registered" reply at most once a day
    private final Map<String, LocalDate> toldUnknown = new HashMap<>();

    public WhatsAppBotService(WhatsAppClient client, UserRepository userRepository, ShopRepository shopRepository,
                              OrderRepository orderRepository, CollectionService collectionService,
                              StockService stockService, PlatformTransactionManager transactionManager,
                              @Value("${app.whatsapp.access-token:}") String accessToken,
                              @Value("${app.whatsapp.phone-number-id:}") String phoneNumberId,
                              @Value("${app.whatsapp.app-secret:}") String appSecret,
                              @Value("${app.whatsapp.verify-token:}") String verifyToken) {
        this.client = client;
        this.userRepository = userRepository;
        this.shopRepository = shopRepository;
        this.orderRepository = orderRepository;
        this.collectionService = collectionService;
        this.stockService = stockService;
        this.readOnly = new TransactionTemplate(transactionManager);
        this.readOnly.setReadOnly(true);
        this.enabled = !accessToken.isBlank() && !phoneNumberId.isBlank() && !appSecret.isBlank() && !verifyToken.isBlank();
        logger.info("WhatsApp bot {}", enabled ? "enabled" : "disabled (WhatsApp settings not configured)");
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** Queues a reply to one incoming text message (the webhook returns at once). */
    public void handle(String messageId, String from, String text) {
        synchronized (seenMessages) {
            if (messageId != null && !messageId.isBlank() && !seenMessages.add(messageId)) return;
        }
        executor.submit(() -> {
            try {
                // One read-only transaction per reply, so branches and order items load
                String answer = readOnly.execute(status -> reply(from, text));
                if (MENU.equals(answer)) {
                    if (!client.sendMenu(from, MENU_ROWS)) client.sendText(from, HELP);
                    return;
                }
                for (String part : split(answer)) {
                    if (!client.sendText(from, part)) break;
                }
            } catch (Exception e) {
                logger.error("WhatsApp bot failed for {}: {}", WhatsAppClient.mask(from), e.getMessage(), e);
                client.sendText(from, "Sorry, something went wrong. Please try again in a minute.");
            }
        });
    }

    /** The reply text for one message, or null to stay silent. */
    String reply(String from, String text) {
        User user = findUser(from);
        if (user == null) {
            synchronized (toldUnknown) {
                LocalDate today = BusinessDay.today();
                if (today.equals(toldUnknown.get(from))) return null;
                toldUnknown.put(from, today);
            }
            return "This number isn't registered with 3Monks. Ask your admin to add your WhatsApp number to your user in the 3Monks app.";
        }
        List<String> words = new ArrayList<>(Arrays.asList(text.trim().toLowerCase(Locale.ROOT).split("\\s+")));
        // "/sales", "sales", "Yesterday-Sales", "yesterday_sales" and "yesterday sales" all work
        String command = words.isEmpty() ? "" : words.remove(0).replaceFirst("^/", "").replace('_', '-');
        if (("yesterday".equals(command) || "today".equals(command)) && !words.isEmpty()) {
            command = command + "-" + words.remove(0);
        }
        if (command.startsWith("yesterday-")) {
            words.add(0, "yesterday");
            command = command.substring("yesterday-".length());
        } else if (command.startsWith("today-")) {
            command = command.substring("today-".length());
        }
        command = switch (command) {
            case "low", "low-stock", "lowstock" -> "low";
            case "pending-orders", "orders", "queue" -> "pending";
            case "receive", "collection" -> "received";
            default -> command;
        };
        if (!List.of("sales", "received", "stock", "low", "pending").contains(command)) {
            return MENU;    // "menu", "help", "hi" or anything unknown
        }
        List<Shop> shops = shopsFor(user, words);
        if (shops.isEmpty()) {
            return "No branch matches \"" + String.join(" ", words) + "\". Send *menu* for the commands.";
        }
        return switch (command) {
            case "sales" -> sales(shops, user, words, false);
            case "received" -> sales(shops, user, words, true);
            case "stock" -> stock(shops, false);
            case "low" -> stock(shops, true);
            default -> pending(shops);
        };
    }

    // Active admins and branch managers whose saved phone matches the sender
    private User findUser(String from) {
        String sender = normalise(from);
        if (sender == null) return null;
        return userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getActive()))
                .filter(u -> u.getRole() == Role.SUPER_ADMIN || u.getRole() == Role.SHOP_MANAGER)
                .filter(u -> sender.equals(normalise(u.getPhone())))
                .findFirst()
                .orElse(null);
    }

    /** Digits with the country code: "98765 43210", "+91 98765-43210" and "919876543210" all match. */
    static String normalise(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() == 11 && digits.startsWith("0")) digits = digits.substring(1);
        if (digits.length() == 10) digits = "91" + digits;
        return digits.length() >= 11 ? digits : null;
    }

    // Managers: their own branch. Admins: every active branch, or those named in the message.
    // Words that are a date are not branch names.
    private List<Shop> shopsFor(User user, List<String> words) {
        if (user.getRole() == Role.SHOP_MANAGER) {
            return user.getShop() != null ? List.of(user.getShop()) : List.of();
        }
        List<Shop> active = shopRepository.findByActiveTrue().stream()
                .sorted(Comparator.comparing(Shop::getName)).collect(Collectors.toList());
        List<String> names = words.stream().filter(w -> parseDate(w) == null).collect(Collectors.toList());
        if (names.isEmpty()) return active;
        String wanted = String.join(" ", names);
        return active.stream().filter(s -> s.getName().toLowerCase(Locale.ROOT).contains(wanted)).collect(Collectors.toList());
    }

    private String sales(List<Shop> shops, User user, List<String> words, boolean receivedOnly) {
        LocalDate today = BusinessDay.today();
        LocalDate day = today;
        for (String w : words) {
            LocalDate d = parseDate(w);
            if (d != null) day = d;
        }
        if (day.isAfter(today)) return "That day hasn't started yet.";
        LocalDate date = day;
        DailyCollectionResponse data = readOnly.execute(s -> collectionService.getDailyCollection(date, date,
                user.getRole() == Role.SHOP_MANAGER ? shops.get(0).getId() : null));
        Set<Long> ids = shops.stream().map(Shop::getId).collect(Collectors.toSet());
        String when = (day.equals(today) ? "Today" : day.equals(today.minusDays(1)) ? "Yesterday" : "")
                + (day.equals(today) || day.equals(today.minusDays(1)) ? ", " : "") + day.format(DAY)
                + (day.equals(today) ? " (so far)" : "");

        StringBuilder out = new StringBuilder(receivedOnly ? "*Amount received* · " : "*Sales* · ").append(when).append('\n');
        for (CollectionRow r : data.getBranches()) {
            if (!ids.contains(r.getShopId())) continue;
            out.append('\n').append('*').append(r.getShopName()).append("*\n");
            if (!receivedOnly) {
                out.append("Sales: ").append(money(r.getTotalAmount())).append(" · ").append(r.getTotalOrders())
                        .append(r.getTotalOrders() == 1 ? " order\n" : " orders\n")
                        .append("Shots ").append(r.getShots()).append(" · Blends ").append(r.getBlends()).append('\n')
                        .append("Cash ").append(money(r.getCashAmount())).append(" · UPI ").append(money(r.getUpiAmount())).append('\n');
                if (r.getCancelledOrders() > 0) {
                    out.append("Cancelled: ").append(r.getCancelledOrders()).append(" (").append(money(r.getCancelledAmount())).append(")\n");
                }
            } else {
                out.append("Expected: ").append(money(r.getTotalAmount())).append(" (Cash ").append(money(r.getCashAmount()))
                        .append(" · UPI ").append(money(r.getUpiAmount())).append(")\n");
            }
            if (r.getActualEntries() > 0) {
                out.append("Received: ").append(money(r.getActualTotal())).append(" (Cash ").append(money(r.getActualCash()))
                        .append(" · UPI ").append(money(r.getActualUpi())).append(")\n")
                        .append("Difference: ").append(difference(r.getDifference())).append('\n');
                if (r.getActualNote() != null) out.append("Note: ").append(r.getActualNote()).append('\n');
            } else if (receivedOnly || r.getActualSlots() > 0) {
                out.append("Received: not entered yet\n");
            }
        }
        if (shops.size() > 1 && !receivedOnly) {
            CollectionRow t = data.getTotals();
            out.append("\n*All branches*: ").append(money(t.getTotalAmount())).append(" · ").append(t.getTotalOrders()).append(" orders\n");
        }
        return out.toString().trim();
    }

    private String stock(List<Shop> shops, boolean lowOnly) {
        StringBuilder out = new StringBuilder(lowOnly ? "*Low / out of stock*\n" : "*Current stock*\n");
        for (Shop shop : shops) {
            List<StockResponse> rows = readOnly.execute(s -> stockService.currentStock(shop.getId()));
            rows.sort(Comparator.comparingInt((StockResponse r) -> rank(r)).thenComparing(StockResponse::getRawMaterialName));
            List<StockResponse> shown = lowOnly ? rows.stream().filter(r -> rank(r) < 2).collect(Collectors.toList()) : rows;
            out.append('\n').append('*').append(shop.getName()).append("*\n");
            if (shown.isEmpty()) {
                out.append(lowOnly ? "✅ Nothing low or out of stock\n" : "No stock recorded yet\n");
                continue;
            }
            for (StockResponse r : shown) {
                out.append(rank(r) == 0 ? "🔴 " : rank(r) == 1 ? "🟠 " : "• ")
                        .append(r.getRawMaterialName()).append(": ").append(number(r.getQuantity()))
                        .append(rank(r) == 0 ? " (out)" : rank(r) == 1 ? " (low)" : "").append('\n');
            }
        }
        return out.toString().trim();
    }

    // 0 = out of stock, 1 = low, 2 = OK
    private static int rank(StockResponse r) {
        if (r.getQuantity() == null || r.getQuantity().signum() <= 0) return 0;
        return Boolean.TRUE.equals(r.getLowStock()) ? 1 : 2;
    }

    private String pending(List<Shop> shops) {
        LocalDateTime now = LocalDateTime.now(BusinessDay.ZONE);
        StringBuilder out = new StringBuilder("*Pending orders*\n");
        for (Shop shop : shops) {
            List<String> lines = readOnly.execute(s -> orderRepository.findPendingOrdersByShopId(shop.getId()).stream()
                    .map(o -> pendingLine(o, now)).collect(Collectors.toList()));
            out.append('\n').append('*').append(shop.getName()).append("*: ").append(lines.size()).append(" waiting\n");
            lines.stream().limit(MAX_PENDING_LINES).forEach(l -> out.append(l).append('\n'));
            if (lines.size() > MAX_PENDING_LINES) out.append("…and ").append(lines.size() - MAX_PENDING_LINES).append(" more\n");
        }
        return out.toString().trim();
    }

    private static String pendingLine(Order o, LocalDateTime now) {
        long minutes = Math.max(0, Duration.between(o.getOrderDate(), now).toMinutes());
        String wait = minutes < 60 ? minutes + " min" : minutes < 24 * 60 ? (minutes / 60) + " h " + (minutes % 60) + " min"
                : "since " + BusinessDay.dateOf(o.getOrderDate()).format(DAY);
        String items = o.getItems().stream()
                .map(i -> i.getQuantity() + "× " + (i.getCustomization() != null ? i.getCustomization() : i.getProduct().getName()))
                .collect(Collectors.joining(", "));
        return "#" + o.getTokenNumber() + " · " + wait + " · " + items;
    }

    /** today / yesterday / 05-11 / 05/11 / 05-11-2026 / 2026-11-05, or null if the word is not a date. */
    static LocalDate parseDate(String word) {
        LocalDate today = BusinessDay.today();
        switch (word) {
            case "today": return today;
            case "yesterday": case "yday": case "y": return today.minusDays(1);
            default: break;
        }
        try {
            if (word.matches("\\d{4}-\\d{1,2}-\\d{1,2}")) return LocalDate.parse(word, DateTimeFormatter.ofPattern("yyyy-M-d"));
            String[] p = word.split("[-/.]");
            if (p.length == 2 && word.matches("\\d{1,2}[-/.]\\d{1,2}")) {
                LocalDate d = LocalDate.of(today.getYear(), Integer.parseInt(p[1]), Integer.parseInt(p[0]));
                return d.isAfter(today) ? d.minusYears(1) : d;   // "28-12" in January means last December
            }
            if (p.length == 3 && word.matches("\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{4}")) {
                return LocalDate.of(Integer.parseInt(p[2]), Integer.parseInt(p[1]), Integer.parseInt(p[0]));
            }
        } catch (Exception e) {
            return null;
        }
        return null;
    }

    static String money(BigDecimal amount) {
        if (amount == null) amount = BigDecimal.ZERO;
        return "₹" + String.format(Locale.ENGLISH, amount.stripTrailingZeros().scale() > 0 ? "%,.2f" : "%,.0f", amount);
    }

    private static String difference(BigDecimal diff) {
        if (diff.signum() == 0) return "₹0 ✅";
        return (diff.signum() < 0 ? "−" : "+") + money(diff.abs()) + (diff.signum() < 0 ? " 🔴 short" : " 🟢 extra");
    }

    private static String number(BigDecimal q) {
        return q == null ? "0" : q.setScale(3, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    /** Splits a long reply at line breaks so each message fits WhatsApp's limit. */
    static List<String> split(String text) {
        if (text == null || text.isBlank()) return List.of();
        List<String> parts = new ArrayList<>();
        StringBuilder part = new StringBuilder();
        for (String line : text.split("\n", -1)) {
            if (part.length() + line.length() + 1 > WhatsAppClient.MAX_TEXT && part.length() > 0) {
                parts.add(part.toString().trim());
                part.setLength(0);
            }
            part.append(line).append('\n');
        }
        if (!part.toString().isBlank()) parts.add(part.toString().trim());
        return parts;
    }
}
