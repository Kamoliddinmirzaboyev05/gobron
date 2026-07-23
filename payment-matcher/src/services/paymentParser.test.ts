/**
 * Run with: npx tsx src/services/paymentParser.test.ts
 */
import { parsePaymentMessage, toIntegerSom } from "./paymentParser.js";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(toIntegerSom("50 014") === 50014, "space thousands");
assert(toIntegerSom("50,014") === 50014, "comma thousands");
assert(toIntegerSom("+50014.00") === 50014, "plus decimal");
assert(toIntegerSom("100 000 so'm".replace(/\s*so'm/, "")) === 100000, "strip later");

const samples = [
  "Sizning hisobingizga 50 014 so'm qabul qilindi",
  "Summa: 50014 UZS",
  "+50,014.00 UZS o'tkazildi 12.07.2026 14:30",
  "Miqdor 100000 so'm",
];

for (const s of samples) {
  const p = parsePaymentMessage(s);
  assert(p && p.amount > 0, `parse failed: ${s}`);
  console.log("OK", s.slice(0, 40), "→", p!.amount);
}

console.log("all parser checks passed");
