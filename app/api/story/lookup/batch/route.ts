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

    const MAX_HASHES = 200;
    if (cidHashes.length > MAX_HASHES) {
      return NextResponse.json(
        { error: `Too many cidHashes requested (max ${MAX_HASHES})` },
        { status: 400 }
      );
    }

    await connectToDB();

    const normalized = cidHashes.map((c) => String(c).toLowerCase());
    // Deduplicate to avoid unnecessarily large queries for duplicate hashes
    const unique = Array.from(new Set(normalized));
    const recs = await StoryRegistration.find({ cidHash: { $in: unique } }).lean();

    const map: Record<string, any> = {};
    for (const c of unique) map[c] = null;
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
