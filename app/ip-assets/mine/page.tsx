"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import DesignCard from "@/components/DesignCard";

interface Design {
    cid: string;
    title: string;
    preview: string | null;
    owner: string;
    ipId?: string | null;
    transactionHash?: string;
    blockHash?: string | null;
}

export default function MyIpAssetsPage() {
    const { ready, authenticated, user } = usePrivy();

    // robust address discovery similar to NavBar
    function findEthAddress(obj: any): string | null {
        if (!obj) return null;
        if (typeof obj === "string") {
            return /^0x[0-9a-fA-F]{40}$/.test(obj) ? obj : null;
        }
        if (Array.isArray(obj)) {
            for (const v of obj) {
                const f = findEthAddress(v);
                if (f) return f;
            }
            return null;
        }
        if (typeof obj === "object") {
            for (const k of Object.keys(obj)) {
                try {
                    const f = findEthAddress((obj as any)[k]);
                    if (f) return f;
                } catch { }
            }
        }
        return null;
    }

    const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

    useEffect(() => {
        try {
            const ethAccount = (user as any)?.linkedAccounts?.find((a: any) => a.type === "ethereum");
            const direct = ethAccount?.address ? String(ethAccount.address) : null;
            const scanned = direct || findEthAddress(user);
            setConnectedAddress(scanned ?? null);
            console.log("[MyIPs] resolved address", { ready, authenticated, direct, scanned });
        } catch (e) {
            console.warn("[MyIPs] address resolution failed", e);
            setConnectedAddress(null);
        }
    }, [ready, authenticated, user]);

    console.log("[MyIPs] connectedAddress:", connectedAddress);

    const [items, setItems] = useState<Design[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const totalMine = items.length;
    const [latestBlock, setLatestBlock] = useState<number>(0);

    useEffect(() => {
        async function load() {
            if (!authenticated || !connectedAddress) {
                setItems([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                console.log("[MyIPs] fetching /api/designs/list …");
                const res = await fetch("/api/designs/list");
                if (!res.ok) throw new Error(`API ${res.status}`);
                const logs: any[] = await res.json();

                // Filter logs to only those owned by the connected wallet
                const mineLogs = logs.filter(
                    (log) => (String(log?.args?.owner || "").toLowerCase()) === connectedAddress.toLowerCase()
                );

                // Compute latest block KPI from filtered logs
                const latest = mineLogs.reduce((m: number, log: any) => {
                    const bn = Number(log?.blockNumber || 0);
                    return bn > m ? bn : m;
                }, 0);
                setLatestBlock(latest);


                const enriched: Design[] = [];
                const cidHashes: string[] = [];
                const logMetadata: Array<{
                    cidHash: string;
                    owner: string;
                    ipId: string | null;
                    transactionHash: string;
                    blockHash: string | null;
                }> = [];

                for (const log of mineLogs) {
                    const cidHash = log.args?.cidHash as `0x${string}` | undefined;
                    const owner = log.args?.owner as string;
                    const ipId = log.args?.ipId ? String(log.args.ipId) : null;
                    const transactionHash = log.transactionHash as string;
                    const blockHash = (log.blockHash ?? null) as string | null;
                    if (!cidHash) continue;
                    const ch = String(cidHash).toLowerCase();
                    cidHashes.push(ch);
                    logMetadata.push({ cidHash: ch, owner, ipId, transactionHash, blockHash });
                }

                let mapping: Record<string, any> = {};
                if (cidHashes.length) {
                    try {
                        const uniq = Array.from(new Set(cidHashes));
                        const mapRes = await fetch(`/api/story/lookup/batch`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ cidHashes: uniq }),
                        });
                        if (mapRes.ok) {
                            const md = await mapRes.json();
                            mapping = md?.map ?? {};
                        } else {
                            console.warn("MyIPs: batch lookup failed", await mapRes.text());
                        }
                    } catch (e) {
                        console.warn("MyIPs: batch lookup error", e);
                    }
                }

                for (const metaLog of logMetadata) {
                    const rec = mapping[metaLog.cidHash] ?? null;
                    if (!rec || !rec.cid) continue;
                    try {
                        const metaRes = await fetch(`/api/ipfs/get?cid=${encodeURIComponent(rec.cid)}`);
                        if (!metaRes.ok) continue;
                        const meta = await metaRes.json();
                        enriched.push({
                            cid: rec.cid,
                            title: meta?.title ?? (rec.title ?? "Untitled"),
                            preview: meta?.preview ?? null,
                            owner: metaLog.owner,
                            ipId: rec.ipId ?? metaLog.ipId,
                            transactionHash: metaLog.transactionHash,
                            blockHash: metaLog.blockHash,
                        });
                    } catch (e) {
                        console.warn("MyIPs: failed to fetch ipfs metadata for cid", rec?.cid, e);
                        continue;
                    }
                }

                setItems(enriched);
            } catch (e: any) {
                console.error("[MyIPs] load failed", e);
                setError(e?.message || "Failed to load IPs");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [authenticated, connectedAddress]);

    return (
        <main className="gradient-bg min-h-screen py-12 px-6 pt-20">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-sans font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-sky-600 to-indigo-600">
                        My IP Assets
                    </h1>
                    {!authenticated && (
                        <p className="mt-2 text-sm text-gray-700">Sign in to view your registered IP assets.</p>
                    )}
                </div>

                {authenticated && connectedAddress && (
                    <div className="mb-4 text-xs text-gray-600 text-center">
                        Connected as <span className="font-mono text-gray-800">{connectedAddress}</span>
                    </div>
                )}

                {loading && <div className="text-sm text-gray-600 text-center">Loading…</div>}
                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
                        Error: {error}
                    </div>
                )}

                {!loading && authenticated && items.length === 0 && (
                    <div className="rounded-md border border-gray-200 bg-white/70 backdrop-blur p-6 text-center text-sm text-gray-600">
                        No IPs found for your wallet.
                    </div>
                )}

                {authenticated && !loading && !error && items.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
                            <div className="text-xs text-gray-600">My IPs Registered</div>
                            <div className="text-2xl font-semibold text-gray-900">{totalMine}</div>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
                            <div className="text-xs text-gray-600">Latest Block</div>
                            <div className="text-2xl font-semibold text-gray-900">{latestBlock}</div>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
                            <div className="text-xs text-gray-600">Connected Wallet</div>
                            <div className="text-sm font-mono text-gray-900 break-all">{connectedAddress}</div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((d) => (
                        <DesignCard key={d.cid} {...d} />
                    ))}
                </div>
            </div>
        </main>
    );
}
