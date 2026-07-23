/**
 * GramJS userbot: listen only to @HUMOcardbot (or configured) messages.
 * 2FA password comes from superadmin UI / payment_settings / env.
 */
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";
import input from "input";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { parsePaymentMessage } from "./paymentParser.js";
import { matchPaymentMessage } from "./orderMatcher.js";
import { saveSessionToDb } from "./settingsLoader.js";

function isFromHumo(event: NewMessageEvent): boolean {
  const msg = event.message;
  const chat = msg.chat as { username?: string } | undefined;
  const sender = (msg as { sender?: { username?: string } }).sender;

  const usernames = [chat?.username, sender?.username]
    .filter(Boolean)
    .map((u) => String(u).replace(/^@/, "").toLowerCase());

  if (usernames.some((u) => config.humoBots.includes(u))) {
    return true;
  }

  const peerId = msg.peerId;
  if (peerId && "userId" in peerId) {
    const id = String((peerId as { userId: unknown }).userId);
    if (config.humoBots.includes(id)) return true;
  }

  return false;
}

export async function startUserbot(): Promise<TelegramClient> {
  if (!config.telegram.apiId || !config.telegram.apiHash) {
    throw new Error(
      "TELEGRAM_API_ID / TELEGRAM_API_HASH yo'q. Superadmin → Humo to'lovlar da to'ldiring yoki .env",
    );
  }

  const session = new StringSession(config.telegram.session || "");
  const client = new TelegramClient(
    session,
    config.telegram.apiId,
    config.telegram.apiHash,
    {
      connectionRetries: Infinity,
      retryDelay: 2000,
      autoReconnect: true,
      useWSS: false,
    },
  );

  logger.info("connecting telegram userbot…", {
    hasSession: Boolean(config.telegram.session),
    has2fa: Boolean(config.telegram.twoFaPassword),
    phone: config.telegram.phone ? "***" + config.telegram.phone.slice(-4) : null,
  });

  await client.start({
    phoneNumber: async () => {
      if (config.telegram.phone) return config.telegram.phone;
      return await input.text("Phone (+998…): ");
    },
    // Cloud password (2FA) — superadmin UI / env, else interactive prompt
    password: async () => {
      if (config.telegram.twoFaPassword) {
        logger.info("using 2FA password from settings");
        return config.telegram.twoFaPassword;
      }
      return await input.text("2FA cloud password: ");
    },
    phoneCode: async () => await input.text("Code from Telegram: "),
    onError: (err) => logger.error("telegram start error", { err: String(err) }),
  });

  const sessionStr = client.session.save() as unknown as string;
  if (sessionStr && sessionStr !== config.telegram.session) {
    config.telegram.session = sessionStr;
    await saveSessionToDb(sessionStr);
    logger.info("new session saved (DB + memory)");
  }

  logger.info("userbot online; listening for Humo notifications", {
    bots: config.humoBots,
  });

  client.addEventHandler(async (event: NewMessageEvent) => {
    try {
      if (!isFromHumo(event)) return;
      const text = event.message.message ?? "";
      if (!text.trim()) return;
      logger.debug("humo message received", { preview: text.slice(0, 120) });
      const parsed = parsePaymentMessage(text);
      const result = await matchPaymentMessage(text, parsed);
      logger.info("match result", { result });
    } catch (err) {
      logger.error("message handler error", { err: String(err) });
    }
  }, new NewMessage({}));

  return client;
}
