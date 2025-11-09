import { NextResponse } from "next/server";
import { registerDerivativeOnStory, getIpIdFromCid } from "@/lib/story";

export async function POST(req: Request) {
  try {
    const { originalCid, remixCid } = await req.json();

    if (!originalCid?.trim() || !remixCid?.trim()) {
      throw new Error("originalCid and remixCid are required");
    }

    const cleanOriginalCid = originalCid.trim();
    const cleanRemixCid = remixCid.trim();

    console.log("🔍 Resolving original IP:", cleanOriginalCid);

    // ✅ 1) Resolve parent IPId from original CID
    const parentIpId = await getIpIdFromCid(cleanOriginalCid);
    if (!parentIpId) {
      console.error("❌ Original IP not registered on chain");
      throw new Error("Original IP not found on Story protocol chain");
    }

    console.log("🧬 Parent IP ID:", parentIpId);
    console.log("🎨 Minting remix asset for CID:", cleanRemixCid);

    // ✅ 2) Register derivative IP
    const { newIpId, txHash } = await registerDerivativeOnStory({
      parentIpId,
      remixCid: cleanRemixCid,
    });

    console.log("✅ Remix registered on chain:");
    console.log("   • Parent:", parentIpId);
    console.log("   • New Remix:", newIpId);
    console.log("   • Tx:", txHash);

    return NextResponse.json({
      success: true,
      parentIpId,
      newIpId,
      txHash,
    });

  } catch (err: any) {
    console.error("❌ Remix API Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message ?? "Unknown remix error",
      },
      { status: 500 }
    );
  }
}
