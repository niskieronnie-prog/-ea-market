"use client";
import { useState } from "react";
import { createCampaign } from "@/app/dashboard/campaign-actions";

type Opt = { id: string; name: string };
export default function CampaignWizard({ businesses, products }: { businesses: Opt[]; products: (Opt & { business_id: string })[] }) {
  const [step, setStep] = useState(1);
  const [v, setV] = useState({ business_id: businesses[0]?.id ?? "", product_id: "", name: "", objective: "leads", target_country: "UG",
    audience_note: "", commission_pct: "10", budget: "100000", currency: "UGX", attribution_days: "30" });
  const set = (k: string) => (e: React.ChangeEvent<any>) => setV({ ...v, [k]: e.target.value });
  const prods = products.filter((p) => p.business_id === v.business_id);
  const ok1 = v.name.trim().length >= 2 && v.product_id;
  return (
    <form action={createCampaign}>
      {Object.entries(v).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}
      <p className="muted">Step {step} of 3</p>
      {step === 1 && (<>
        <label htmlFor="cb">Business</label>
        <select id="cb" value={v.business_id} onChange={(e) => setV({ ...v, business_id: e.target.value, product_id: "" })}>{businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <label htmlFor="cp">Product</label>
        <select id="cp" value={v.product_id} onChange={set("product_id")}><option value="">Choose…</option>{prods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <label htmlFor="cn">Campaign name</label><input id="cn" value={v.name} onChange={set("name")} maxLength={120} />
        <label htmlFor="co">Objective</label>
        <select id="co" value={v.objective} onChange={set("objective")}><option value="awareness">Awareness</option><option value="leads">Qualified leads</option><option value="sales">Sales</option></select>
      </>)}
      {step === 2 && (<>
        <label htmlFor="ct">Target country</label>
        <select id="ct" value={v.target_country} onChange={set("target_country")}><option value="UG">Uganda</option><option value="KE">Kenya</option><option value="TZ">Tanzania</option><option value="RW">Rwanda</option></select>
        <label htmlFor="ca">Audience notes (optional)</label><textarea id="ca" rows={2} maxLength={500} value={v.audience_note} onChange={set("audience_note")} />
        <label htmlFor="cc">Affiliate commission (% of confirmed sale value)</label><input id="cc" type="number" min={0} max={100} step="0.5" value={v.commission_pct} onChange={set("commission_pct")} />
        <label htmlFor="cu">Currency</label>
        <select id="cu" value={v.currency} onChange={set("currency")}><option>UGX</option><option>KES</option><option>TZS</option><option>RWF</option><option>USD</option></select>
        <label htmlFor="cbud">Maximum commission budget (whole units)</label><input id="cbud" type="number" min={0} value={v.budget} onChange={set("budget")} />
        <label htmlFor="cw">Attribution window (days, 1 to 90)</label><input id="cw" type="number" min={1} max={90} value={v.attribution_days} onChange={set("attribution_days")} />
      </>)}
      {step === 3 && (<div className="card">
        <h2>Review</h2>
        <p>{v.name}: {v.objective}, {v.target_country}</p>
        <p>Affiliates earn {v.commission_pct}% of <strong>verified</strong> sales within {v.attribution_days} days of a click, up to {v.budget} {v.currency} in total commissions. Clicks and unverified leads earn nothing. The campaign starts as a draft.</p>
      </div>)}
      <p>
        {step > 1 && <button type="button" className="btn secondary" onClick={() => setStep(step - 1)}>Back</button>}{" "}
        {step < 3 && <button type="button" className="btn" disabled={step === 1 && !ok1} onClick={() => setStep(step + 1)}>Next</button>}
        {step === 3 && <button className="btn">Save campaign</button>}
      </p>
    </form>
  );
}
