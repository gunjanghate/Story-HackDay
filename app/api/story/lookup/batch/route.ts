import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db";
import StoryRegistration from "@/lib/models/StoryRegistration";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cidHashes: string[] = Array.isArray(body?.cidHashes) ? body.cidHashes : [];
    if (!cidHashes.length) {
      return NextResponse.json({ error: "cidHashes required" }, { status: 400 });
    }

    await connectToDB();

    const normalized = cidHashes.map((c) => String(c).toLowerCase());
    const recs = await StoryRegistration.find({ cidHash: { $in: normalized } }).lean();

    const map: Record<string, any> = {};
    for (const c of normalized) map[c] = null;
    for (const r of recs) {
      if (r.cidHash) map[String(r.cidHash).toLowerCase()] = {
        cid: r.cid,
        ipId: r.ipId,
        txHash: r.txHash ?? null,
        title: r.title ?? null,
      };
    }

    return NextResponse.json({ success: true, map }, { status: 200 });
  } catch (err: any) {
    console.error("/api/story/lookup/batch error:", err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
