# Gobron Payment Matcher (Humo P2P)

Node.js + GramJS userbot that listens to **Humo** Telegram notifications and
auto-confirms owner subscription payments by **unique amount** matching.

## Flow

1. Owner opens Admin PWA → **Toʻlovni boshlash**
2. API creates `payment_intents` row with `unique_amount = base + tip(1–99)`, TTL 15 min
3. Owner transfers **exactly** that amount to the platform card via Humo
4. Humo bot sends a notification to the logged-in userbot account
5. Matcher parses amount → finds `pending` intent → marks `paid` + activates fields

## Setup

```bash
cd payment-matcher
cp .env.example .env
# fill TELEGRAM_API_ID / API_HASH from https://my.telegram.org/apps
# DATABASE_URL = same Postgres as gobron-backend
npm install
npm run dev
```

First run: enter phone + code. Copy printed `TELEGRAM_SESSION` into `.env`.

Apply backend migration first:

```bash
cd ../gobron-backend
alembic upgrade head
```

## Modules

| Path | Role |
|------|------|
| `src/config` | dotenv config |
| `src/utils/amountGenerator.ts` | base + 1..99 unique amount |
| `src/services/paymentParser.ts` | RegEx amount extraction |
| `src/services/orderMatcher.ts` | DB match / unpaid / expired_paid |
| `src/services/telegramUserbot.ts` | GramJS listener + reconnect |
| `src/index.ts` | entrypoint |

## Security notes

- Use a **dedicated** Telegram account that receives Humo SMS/push notifications
- Never commit `.env` or session strings
- Idempotency: `message_hash` unique on intents + unmatched table
