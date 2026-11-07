package com.threemonks.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Webhook Meta calls for the WhatsApp bot (public URL, no login):
 * GET is Meta's one-time verification, POST delivers incoming messages.
 * Every POST must carry Meta's signature (HMAC-SHA256 of the body with the app
 * secret); anything unsigned or wrongly signed is rejected.
 */
@RestController
@RequestMapping("/api/public/whatsapp/webhook")
public class WhatsAppWebhookController {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppWebhookController.class);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WhatsAppBotService botService;
    private final String verifyToken;
    private final String appSecret;

    public WhatsAppWebhookController(WhatsAppBotService botService,
                                     @Value("${app.whatsapp.verify-token:}") String verifyToken,
                                     @Value("${app.whatsapp.app-secret:}") String appSecret) {
        this.botService = botService;
        this.verifyToken = verifyToken;
        this.appSecret = appSecret;
    }

    // Meta's subscription check: echo the challenge when the verify token matches
    @GetMapping
    public ResponseEntity<String> verify(@RequestParam(name = "hub.mode", required = false) String mode,
                                         @RequestParam(name = "hub.verify_token", required = false) String token,
                                         @RequestParam(name = "hub.challenge", required = false) String challenge) {
        if (botService.isEnabled() && "subscribe".equals(mode) && !verifyToken.isBlank()
                && constantTimeEquals(verifyToken, token) && challenge != null) {
            return ResponseEntity.ok(challenge);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    @PostMapping
    public ResponseEntity<Void> receive(@RequestBody byte[] body,
                                        @RequestHeader(name = "X-Hub-Signature-256", required = false) String signature) {
        if (!botService.isEnabled()) {
            return ResponseEntity.notFound().build();
        }
        if (!validSignature(body, signature)) {
            logger.warn("WhatsApp webhook rejected: missing or wrong signature");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            JsonNode root = objectMapper.readTree(body);
            for (JsonNode entry : root.path("entry")) {
                for (JsonNode change : entry.path("changes")) {
                    for (JsonNode message : change.path("value").path("messages")) {
                        // Typed text, or a tap in the menu (its row id is the command);
                        // delivery receipts, media etc. are ignored
                        String type = message.path("type").asText();
                        String text = "text".equals(type) ? message.path("text").path("body").asText()
                                : "interactive".equals(type) ? interactiveId(message.path("interactive")) : null;
                        if (text != null && !text.isBlank()) {
                            botService.handle(message.path("id").asText(), message.path("from").asText(), text);
                        }
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("WhatsApp webhook: unreadable body: {}", e.getMessage());
        }
        // Always acknowledge quickly; replies are sent in the background
        return ResponseEntity.ok().build();
    }

    private static String interactiveId(JsonNode interactive) {
        String id = interactive.path("list_reply").path("id").asText("");
        return id.isEmpty() ? interactive.path("button_reply").path("id").asText("") : id;
    }

    private boolean validSignature(byte[] body, String header) {
        if (header == null || !header.startsWith("sha256=") || appSecret.isBlank()) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(mac.doFinal(body));
            return constantTimeEquals(expected, header.substring(7).toLowerCase());
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        return b != null && MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
