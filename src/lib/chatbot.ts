// Rules-based fallback chatbot. Answers only from fixed text or verified DB rows. Never invents prices.
export type ChatResult = { reply: string; escalate: boolean; searchTerm?: string; unknown?: boolean };

const FAQ: { match: RegExp; answer: string }[] = [
  { match: /affiliate|commission|earn/i, answer: "Marketers can activate affiliate access from their dashboard immediately. Commissions are only created from verified conversions, never from clicks alone, and are approved by an administrator. No income is guaranteed." },
  { match: /sell|seller|business|list/i, answer: "Anyone can activate seller access from their dashboard immediately. Businesses and product listings are still reviewed before they go public." },
  { match: /ship|deliver/i, answer: "Shipping and delivery are set by each merchant and may not cover every country. Please confirm at the merchant's checkout." },
  { match: /refund|return/i, answer: "Refunds and returns are handled by the merchant that sold the item. We do not control third-party purchases. See the Refund & Returns page." },
  { match: /privacy|data|delete/i, answer: "See our Privacy Policy. You can request deletion of your personal data by contacting support." },
];

export function answer(message: string): ChatResult {
  const m = message.trim().slice(0, 500);
  if (!m) return { reply: "Please type a question.", escalate: false };
  if (/human|agent|person|complain/i.test(m)) {
    return { reply: "I'll point you to human support. Please use the Contact page.", escalate: true };
  }
  const faq = FAQ.find((f) => f.match.test(m));
  if (faq) return { reply: faq.answer, escalate: false };
  const find = m.match(/(?:find|looking for|search|show me|buy)\s+(.{2,60})/i);
  if (find) return { reply: "", escalate: false, searchTerm: find[1].replace(/[%_,()]/g, " ").trim() };
  return { unknown: true, escalate: false, reply: "I'm not sure about that. I can answer questions about affiliates, sellers, shipping, refunds and privacy, or search products (try \"find solar lantern\"). Say \"human\" to reach support." };
}
