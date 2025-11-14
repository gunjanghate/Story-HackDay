import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { remixHubAbi } from "@/lib/remixHubAbi";

export async function GET() {
  try {
    const contract = process.env.NEXT_PUBLIC_REMIX_HUB_ADDRESS;
    if (!contract) {
      return NextResponse.json(
        { error: "RemixHub contract address not configured" },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const iface = new ethers.Interface(remixHubAbi as any);

    // -----------------------------------------------------------------
    // 1. Scan OriginalRegistered events via JSON-RPC logs
    // -----------------------------------------------------------------
    // Some versions of ethers.Interface expose `getEventTopic`; if not available
    // compute the topic from the event signature as a fallback.
    const topic = typeof (iface as any).getEventTopic === "function"
      ? (iface as any).getEventTopic("OriginalRegistered")
      : ethers.id("OriginalRegistered(uint256,address,uint16,bytes32)");
    const rawLogs = await provider.getLogs({
      address: contract as `0x${string}`,
      fromBlock: 0,
      topics: [topic],
    });

    // -----------------------------------------------------------------
    // 2. Serialize BigInt → string
    // -----------------------------------------------------------------
    // Parse logs with the ABI
    const parsed = rawLogs.map((l) => {
      const parsedLog = iface.parseLog({ topics: l.topics, data: l.data } as any);
      return {
        blockNumber: String(l.blockNumber),
        logIndex: String((l as any).logIndex ?? "0"),
        transactionIndex: String((l as any).transactionIndex ?? "0"),
        transactionHash: l.transactionHash,
        args: {
          ipId: parsedLog?.args.ipId !== undefined && parsedLog?.args.ipId !== null ? String(parsedLog?.args.ipId) : null,
          owner: parsedLog?.args.owner ?? null,
          presetId: parsedLog?.args.presetId !== undefined && parsedLog?.args.presetId !== null ? Number(parsedLog?.args.presetId) : null,
          cidHash: parsedLog?.args.cidHash ?? null,
        },
      };
    });

    // -----------------------------------------------------------------
    // 3. Return safe JSON
    // -----------------------------------------------------------------
    return NextResponse.json(parsed, { status: 200 });
  } catch (err: any) {
    console.error("[/api/designs/list] error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to fetch logs" },
      { status: 500 }
    );
  }
}