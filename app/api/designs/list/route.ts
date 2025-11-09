// app/api/designs/list/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { storyAeneid } from "@/lib/storychain";
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

    const client = createPublicClient({
      chain: storyAeneid,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL!),
    });

    // -----------------------------------------------------------------
    // 1. Scan OriginalRegistered events
    // -----------------------------------------------------------------
    const rawLogs = await client.getLogs({
      address: contract as `0x${string}`,
      event: {
        type: "event",
        name: "OriginalRegistered",
        inputs: [
          { name: "ipId", type: "uint256", indexed: true },
          { name: "owner", type: "address", indexed: true },
          { name: "presetId", type: "uint16", indexed: false },
          { name: "cidHash", type: "bytes32", indexed: false },
        ],
      },
      fromBlock: BigInt(0),
    });

    // -----------------------------------------------------------------
    // 2. Serialize BigInt → string
    // -----------------------------------------------------------------
    const logs = rawLogs.map((log) => ({
      ...log,
      blockNumber: log.blockNumber.toString(),
      logIndex: log.logIndex.toString(),
      transactionIndex: log.transactionIndex.toString(),
      // args may contain uint256 → convert to string
      args: log.args
        ? {
            ...log.args,
            ipId:
              log.args.ipId !== undefined && log.args.ipId !== null
                ? log.args.ipId.toString()
                : null,
            presetId:
              log.args.presetId !== undefined && log.args.presetId !== null
                ? Number(log.args.presetId) // uint16 → number
                : null,
          }
        : { ipId: null, presetId: null },
    }));

    // -----------------------------------------------------------------
    // 3. Return safe JSON
    // -----------------------------------------------------------------
    return NextResponse.json(logs, { status: 200 });
  } catch (err: any) {
    console.error("[/api/designs/list] error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to fetch logs" },
      { status: 500 }
    );
  }
}