import { NextResponse } from "next/server";
import { registerDerivativeOnStory } from "@/lib/story";
import { connectToDB } from "@/lib/db";
import StoryRegistration from "@/lib/models/StoryRegistration";
import { keccak256, toUtf8Bytes } from "ethers";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  try {
    const { originalCid, remixCid } = await req.json();

    if (!originalCid?.trim() || !remixCid?.trim()) {
      throw new Error("originalCid and remixCid are required");
    }

    const cleanOriginalCid = originalCid.trim();
    const cleanRemixCid = remixCid.trim();

    console.log("🔍 Resolving original IP from DB:", cleanOriginalCid);

    // ✅ 1) Ensure parent design is anchored & resolve parentIpId from Mongo
    await connectToDB();

    const MAX_ATTEMPTS = 5;
    const DELAY_MS = 2000;
    let parent = await StoryRegistration.findOne({ cid: cleanOriginalCid }).lean();

    // First guard: parent record must exist at all.
    if (!parent) {
      // Briefly wait and retry in case anchoring/persistence is racing this request.
      for (let attempt = 1; attempt < MAX_ATTEMPTS && !parent; attempt++) {
        await delay(DELAY_MS);
        parent = await StoryRegistration.findOne({ cid: cleanOriginalCid }).lean();
      }
    }

    if (!parent) {
      throw new Error(
        "Parent design is not anchored on Story Protocol yet. Anchor the original before remixing."
      );
    }

    const parentIpId = parent.ipId;
    if (!parentIpId) {
      // Retry a few times in case ipId was just written asynchronously.
      let hydratedParent = parent;
      for (let attempt = 1; attempt < MAX_ATTEMPTS && !hydratedParent.ipId; attempt++) {
        await delay(DELAY_MS);
        hydratedParent = (await StoryRegistration.findOne({ cid: cleanOriginalCid }).lean()) || hydratedParent;
      }
      if (!hydratedParent.ipId) {
        throw new Error(
          "Parent design record does not yet contain an on-chain ipId. Wait for anchoring to complete and try again."
        );
      }
    }

    // Use the freshest ipId after any retries. For remix safety we only
    // require that the parent IP asset is registered on Story (i.e. has a
    // valid ipId). We do not block on RemixHub anchoring metadata here.
    const finalParent = await StoryRegistration.findOne({ cid: cleanOriginalCid }).lean();
    const resolvedParentIpId = finalParent?.ipId || parentIpId;

    console.log("🧬 Parent IP ID (from DB):", resolvedParentIpId);
    console.log("🎨 Minting remix asset for CID:", cleanRemixCid);

    // ✅ 2) Register derivative IP on Story, using a valid parentIpId
    const { newIpId, txHash } = await registerDerivativeOnStory({
      // Pass through the validated parent IP identifier
      parentIpId: resolvedParentIpId,
      remixCid: cleanRemixCid,
    });

    console.log("✅ Remix registered on chain:");
    console.log("   • Parent:", parentIpId);
    console.log("   • New Remix:", newIpId);
    console.log("   • Tx:", txHash);

    // ✅ 3) Persist derivative IP mapping for the remix CID in Mongo
    try {
      const cidHash = keccak256(toUtf8Bytes(cleanRemixCid)) as `0x${string}`;
      await StoryRegistration.findOneAndUpdate(
        { cid: cleanRemixCid },
        {
          $set: {
            cid: cleanRemixCid,
            ipId: String(newIpId),
            txHash: String(txHash),
            cidHash: String(cidHash).toLowerCase(),
            anchorTxHash: String(txHash),
            anchorConfirmedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      ).lean();
    } catch (persistErr) {
      // Log but do not fail the chain registration – DB can be repaired separately
      console.warn("Remix derivative persisted failed", persistErr);
    }

    return NextResponse.json({
      success: true,
      parentIpId: resolvedParentIpId,
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
