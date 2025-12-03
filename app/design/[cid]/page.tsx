import DesignView from "@/components/DesignView";

export default async function Page({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  return (
  <>
  <DesignView cid={cid} />
  </>
  );
}

