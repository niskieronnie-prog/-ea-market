"use client";
import { useRouter } from "next/navigation";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

export default function CurrencySelect({ current }: { current: string }) {
  const router = useRouter();
  return (
    <label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0, fontWeight: 400 }}>
      <span className="muted">Currency</span>
      <select style={{ width: "auto" }} value={current} aria-label="Display currency"
        onChange={(e) => { document.cookie = `currency=${e.target.value}; max-age=31536000; path=/; SameSite=Lax`; router.refresh(); }}>
        {SUPPORTED_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
      </select>
    </label>
  );
}
