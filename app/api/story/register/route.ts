import { NextResponse } from "next/server";
import { registerIpOnStory } from "@/lib/story";

export async function POST(req: Request) {
  try {
    const { cid, title } = await req.json();

    if (!cid || typeof cid !== "string" || !cid.startsWith("Qm")) {
      return NextResponse.json(
        { success: false, error: "Valid IPFS CID required" },
        { status: 400 }
      );
    }

    const { ipId, txHash } = await registerIpOnStory(cid);

    return NextResponse.json({
      success: true,
      ipId,
      txHash,
      explorer: `https://aeneid.storyscan.io/ip/${ipId}`,
    });
  } catch (err: any) {
    console.error("Story registration error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to register IP" },
      { status: 500 }
    );
  }
}