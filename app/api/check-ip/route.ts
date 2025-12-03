import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  try {
    // 🔥 Extract ipId from query parameters
    const { searchParams } = new URL(request.url);
    const ipId = searchParams.get("ipId");

    // 🔥 Validate that ipId is provided
    if (!ipId) {
      return NextResponse.json(
        {
          exists: false,
          error: "Missing required parameter: ipId (20-byte hex format, e.g., 0x...)"
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 🔥 Validate hex format (should be 0x + 40 hex characters)
    const hexRegex = /^0x[0-9a-fA-F]{40}$/;
    if (!hexRegex.test(ipId)) {
      return NextResponse.json(
        {
          exists: false,
          error: "Invalid ipId format. Must be 20-byte hex (0x + 40 hex chars)"
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Story API Lookup (staging)
    const res = await fetch("https://staging-api.storyprotocol.net/api/v4/assets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "KOTbaGUSWQ6cUJWhiJYiOjPgB0kTRu1eCFFvQL0IWls",
      },
      body: JSON.stringify({
        where: { ipIds: [ipId] },
      }),
    });

    const json = await res.json();

    // 🔥 Story API returns the asset in `data`
    if (json.data && json.data.length > 0) {
      return NextResponse.json(
        { exists: true, ipId, data: json.data[0] },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { exists: false, ipId, error: "IP Asset not found" },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (e: any) {
    return NextResponse.json(
      { exists: false, error: e.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
