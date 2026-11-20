import Link from "next/link";
import { BRAND } from "./Header";
export default function Footer() {
  const pages = [["privacy","Privacy"],["terms","Terms"],["cookies","Cookies"],["affiliate-disclosure","Affiliate disclosure"],["refunds","Refunds & returns"],["ai-chatbot","AI chatbot"],["contact","Contact"]];
  return (
    <footer className="site"><div className="wrap">
      <p>{pages.map(([s,t]) => <Link key={s} href={`/legal/${s}`}>{t}</Link>)}</p>
      <p>{BRAND} is an independent platform. It is not officially partnered with Amazon or Jumia unless stated otherwise. Some links are affiliate links and we may earn a commission at no extra cost to you.</p>
    <p>Currency conversions are indicative only, using daily rates from <a href="https://www.exchangerate-api.com">exchangerate-api.com</a>. Merchants confirm the final price at checkout.</p>
    </div></footer>
  );
}
