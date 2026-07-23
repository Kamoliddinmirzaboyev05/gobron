/**
 * GramJS userbot: listen only to messages from the Humo notification bot.
 * Auto-reconnect on disconnect. Never crash the process on a bad message.
 */
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";
import input from "input";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { parsePaymentMessage } from "./paymentParser.js";
import { matchPaymentMessage } from "./orderMatcher.js";

function isFromHumo(event: NewMessageEvent): boolean {
  const msg = event.message;
  // Prefer username match; fall back to title/name heuristics.
  const chat = msg.chat as { username?: string; title?: string; className?: string } | undefined;
  const sender = (msg as { sender?: { username?: string } }).sender;

  const usernames = [
    chat?.username,
    sender?.username,
  ]
    .filter(Boolean)
    .map((u) => String(u).replace(/^@/, "").toLowerCase());

  if (usernames.some((u) => config.humoBots.includes(u))) {
    return true;
  }

  // Some bank bots deliver as service / channel without username on every event —
  // allow peer id match if configured as numeric id in HUMO_BOT_EXTRA.
  const peerId = msg.peerId;
  if (peerId && "userId" in peerId) {
    const id = String((peerId as { userId: unknown }).userId);
    if (config.humoBots.includes(id)) return true;
  }

  return false;
}

export async function startUserbot(): Promise<TelegramClient> {
  const session = new StringSession(config.telegram.session);
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

  logger.info("connecting telegram userbot…");

  await client.start({
    phoneNumber: async () =>
      config.telegram.phone || (await input.text("Phone (+998…): ")),
    password: async () => await input.text("2FA password (if any): "),
    phoneCode: async () => await input.text("Code from Telegram: "),
    onError: (err) => logger.error("telegram start error", { err: String(err) }),
  });

  // Persist session for next boot
  const sessionStr = client.session.save() as unknown as string;
  if (sessionStr && sessionStr !== config.telegram.session) {
    logger.info(
      "Telegram session ready. Save this as TELEGRAM_SESSION in .env to skip re-login:",
    );
    // Print on its own line for easy copy
    console.log(sessionStr);
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
      // Isolate handler failures so the client stays up
      logger.error("message handler error", { err: String(err) });
    }
  }, new NewMessage({}));

  client.addEventHandler(() => {
    logger.warn("telegram disconnected — GramJS will auto-reconnect");
  });

  return client;
}
