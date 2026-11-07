# 3Monks WhatsApp bot

Admins and branch managers send the bot a command on WhatsApp and get **live**
figures back:

Commands work with or without `/`, in any capitals, and with `-`, `_` or a
space (`yesterday-sales`, `Yesterday Sales`, `/yesterday_sales`).

| Command | Reply |
|---|---|
| `menu` (or `help`, `hi`, anything unknown) | The **tap menu**: a *Menu* button listing every option; tapping one runs it |
| `sales` | Today's sales so far (business day, 3 AM cut-off): sales, orders, shots, blends, cash / UPI, cancelled, received & difference |
| `yesterday-sales` | Yesterday's sales |
| `sales 05-11`, `sales 2026-11-05` | Any day |
| `received` / `yesterday-received` | Expected vs amount received (Daily Collection) |
| `stock` | Current stock, out-of-stock 🔴 and low 🟠 first |
| `low-stock` (or `low`) | Only low / out-of-stock items |
| `pending` | Orders waiting in the queue, with how long |

If the tap menu cannot be shown on someone's phone, the same list is sent as text.

Admins see every branch, or one branch by adding part of its name
(`/sales kharadi`, `/stock baner`). Managers always see only their own branch.

**Who can use it:** active users with role Admin or Shop Manager whose
**phone number in the 3Monks app** (Users → edit) is their WhatsApp number.
Anyone else gets "This number isn't registered" (at most once a day).

**Cost: free.** The bot only replies to people who message it first, which
WhatsApp does not charge for (service messages; from 1 Oct 2026 the first 1,000
a month per number are free). It never starts a conversation.

## One-time setup (about 30–60 minutes)

You need a phone number that is **not** on WhatsApp (delete WhatsApp from it
first if it is). It will only be used by the bot.

1. **Meta Business account** – <https://business.facebook.com>, create or use
   your 3Monks business.
2. **Developer app** – <https://developers.facebook.com/apps> → *Create app* →
   type **Business** → link it to the 3Monks business → add the **WhatsApp**
   product.
3. **Add the number** – WhatsApp → *API Setup* → *Add phone number*: display
   name (e.g. "3Monks"), then verify with the 6-digit code by SMS or call, and
   set a 6-digit PIN when asked. Copy the **Phone number ID** shown there.
4. **Permanent token** – Business settings → *Users → System users* → *Add*
   (Admin) → *Assign assets*: the app and the WhatsApp account (full control) →
   *Generate token* for the app with permissions `whatsapp_business_messaging`
   and `whatsapp_business_management`, expiry **Never**. Copy the token.
5. **App secret** – App → *App settings → Basic* → *App secret* → Show, copy.
6. **Choose a verify token** – any secret word, e.g. a long random string.
7. **GitHub** (Dunj3nMast3r/3monksapp → Settings → Environments → prod):
   - Secrets: `WHATSAPP_TOKEN` (step 4), `WHATSAPP_APP_SECRET` (step 5),
     `WHATSAPP_VERIFY_TOKEN` (step 6)
   - Variable: `WHATSAPP_PHONE_NUMBER_ID` (step 3)
   Then re-run the deploy. The bot stays off until all four are set.
8. **Webhook** – App → WhatsApp → *Configuration* → *Webhook* → *Edit*:
   - Callback URL: `https://3monks.co.in/api/public/whatsapp/webhook`
   - Verify token: the word from step 6 → *Verify and save*
   - Under *Webhook fields*, **subscribe to `messages`**.
9. **Phone numbers in the app** – make sure each admin / manager who should use
   the bot has their WhatsApp number (10 digits) on their user.
10. Message the bot's number `/help` from one of those phones.

Meta may ask for a payment method in WhatsApp Manager; nothing is charged while
the bot only replies.

## Security

- Every incoming webhook must carry Meta's signature (`X-Hub-Signature-256`,
  HMAC-SHA256 with the app secret); unsigned or wrongly signed calls are
  rejected.
- Only registered admin / manager numbers get data; managers only their branch.
- Phone numbers are masked in logs (last 4 digits).
