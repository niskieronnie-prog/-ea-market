import { requireRole } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import CampaignWizard from "@/components/CampaignWizard";
export const metadata = { title: "New campaign", robots: { index: false } };

export default async function NewCampaign() {
  const user = await requireRole(["seller"]);
  const supabase = await supabaseServer();
  const { data: biz } = await supabase.from("businesses").select("id,name").eq("owner_id", user.id);
  const { data: prods } = await supabase.from("products").select("id,title,business_id,businesses!inner(owner_id)").eq("businesses.owner_id", user.id).eq("status", "published");
  return (<><h1>New campaign</h1>
    {biz?.length && prods?.length ? <div className="card"><CampaignWizard businesses={biz} products={prods.map((p) => ({ id: p.id, name: p.title, business_id: p.business_id }))} /></div>
      : <p className="notice">You need a business and at least one <strong>published</strong> product first.</p>}</>);
}
