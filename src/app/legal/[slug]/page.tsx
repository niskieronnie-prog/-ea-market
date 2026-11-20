import { notFound } from "next/navigation";
import { LEGAL } from "@/lib/legal";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; return { title: LEGAL[slug]?.title ?? "Legal" };
}
export default async function Legal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = Object.hasOwn(LEGAL, slug) ? LEGAL[slug] : undefined;
  if (!page) return notFound();
  return (<><h1>{page.title}</h1>
    <p className="notice">Draft template. Requires review by a qualified lawyer before launch.</p>
    {page.body.map((t, i) => <p key={i}>{t}</p>)}</>);
}
