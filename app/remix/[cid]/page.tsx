import RemixScreen from "@/components/RemixScreen";

export default async function Page({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  return <RemixScreen cid={cid} />;
}
