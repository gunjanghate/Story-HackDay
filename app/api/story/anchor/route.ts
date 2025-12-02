import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import StoryRegistration from "@/lib/models/StoryRegistration";

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
      ipId: String(ipId),
    };
    if (normalizedCidHash) update.cidHash = normalizedCidHash;
    if (anchorTxHash) {
      update.anchorTxHash = String(anchorTxHash);
      update.anchorConfirmedAt = new Date();
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
