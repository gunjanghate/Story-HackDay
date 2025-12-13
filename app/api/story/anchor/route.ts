import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import StoryRegistration from "@/lib/models/StoryRegistration";

// This endpoint is responsible for persisting the final on-chain anchoring
// result for an IP (original or derivative). Registration itself happens
// via the Story SDK, and this endpoint makes that state durable in Mongo.
export async function POST(req: Request) {
  try {
    const { cid, ipId, cidHash, anchorTxHash } = await req.json();

    if (!cid || typeof cid !== "string") {
      return NextResponse.json({ success: false, error: "cid is required" }, { status: 400 });
    }
    if (!ipId) {
      return NextResponse.json({ success: false, error: "ipId is required" }, { status: 400 });
    }

    await connectToDB();

    const normalizedCidHash = typeof cidHash === "string" ? cidHash.toLowerCase() : undefined;

    const update: any = {
      cid,
      // Always persist ipId as string to avoid bigint/JSON issues
      ipId: String(ipId),
    };
    if (normalizedCidHash) update.cidHash = normalizedCidHash;
    if (anchorTxHash) {
      const anchorHashStr = String(anchorTxHash);
      update.anchorTxHash = anchorHashStr;
      // anchoredAt marks when the IP was finalized on-chain
      const now = new Date();
      update.anchoredAt = now;
      update.anchorConfirmedAt = now;
    }

    // Upsert: create if missing, or update existing registration
    const doc = await StoryRegistration.findOneAndUpdate(
      { cid },
      { $set: update },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ success: true, doc });
  } catch (err: any) {
    console.error("Anchor persist error:", err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
