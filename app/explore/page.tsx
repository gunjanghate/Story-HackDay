"use client";

import { useEffect, useMemo, useState } from "react";
import DesignCard from "@/components/DesignCard";

interface Design {
    cid: string;
    title: string;
    preview: string | null;
    owner: string;
    ipId?: string | null;
    transactionHash?: string;
    blockHash?: string | null;
    blockNumber?: string;
}

export default function ExplorePage() {
    const [designs, setDesigns] = useState<Design[]>([]);
    const [rawLogs, setRawLogs] = useState<any[]>([]); // keep original logs for accurate metrics
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [ownerFilter, setOwnerFilter] = useState("");
    const [sortNewest, setSortNewest] = useState(true);

    async function fetchDesigns() {
        try {
            const res = await fetch("/api/designs/list");
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`API error ${res.status}: ${txt}`);
            }

            // viem returns an array of log objects – safe parse
            const logs: any[] = await res.json();
            setRawLogs(logs);

            const items: Design[] = [];

            // collect all cidHashes from logs and request DB mapping in a single call
            const cidHashes: string[] = [];
            const logMetadata: Array<{
                cidHash: string | null;
                owner: string;
                ipId: string | null;
                transactionHash: string;
                blockHash: string | null;
                blockNumber: string;
            }> = [];

            for (const log of logs) {
                const cidHash = log.args.cidHash as `0x${string}`;
                const owner = log.args.owner as string;
                const ipId = log.args.ipId ? String(log.args.ipId) : null;
                const transactionHash = log.transactionHash as string;
                const blockHash = (log.blockHash ?? null) as string | null;
                const blockNumber = String(log.blockNumber ?? "0");

                if (cidHash) cidHashes.push(String(cidHash).toLowerCase());
                logMetadata.push({ cidHash: cidHash ? String(cidHash).toLowerCase() : null, owner, ipId, transactionHash, blockHash, blockNumber });
            }

            let mapping: Record<string, any> = {};
            if (cidHashes.length) {
                const uniq = Array.from(new Set(cidHashes));
                try {
                    const mapRes = await fetch(`/api/story/lookup/batch`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ cidHashes: uniq }),
                    });
                    if (mapRes.ok) {
                        const md = await mapRes.json();
                        mapping = md?.map ?? {};
                    } else {
                        console.warn("Explore: batch lookup failed", await mapRes.text());
                    }
                } catch (e) {
                    console.warn("Explore: batch lookup error", e);
                }
            }

            for (const metaLog of logMetadata) {
                const cidHash = metaLog.cidHash;
                if (!cidHash) continue;
                const rec = mapping[cidHash] ?? null;
                if (!rec || !rec.cid) continue;

                try {
                    const metaRes = await fetch(`/api/ipfs/get?cid=${encodeURIComponent(rec.cid)}`);
                    if (!metaRes.ok) continue;
                    const meta = await metaRes.json();

                    items.push({
                        cid: rec.cid,
                        title: meta?.title ?? (rec.title ?? "Untitled"),
                        preview: meta?.preview ?? null,
                        owner: metaLog.owner,
                        ipId: rec.ipId ?? metaLog.ipId,
                        transactionHash: metaLog.transactionHash,
                        blockHash: metaLog.blockHash,
                        blockNumber: metaLog.blockNumber,
                    });
                } catch (e) {
                    console.warn("Explore: failed to fetch ipfs metadata for cid", rec.cid, e);
                    continue;
                }
            }

            setDesigns(items);
        } catch (err: any) {
            console.error("[Explore] fetch error:", err);
            setError(err.message ?? "Failed to load designs");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchDesigns(); }, []);

    // Derived metrics & filtered view
    const latestBlock = useMemo(() => {
        return rawLogs.reduce((m, l) => {
            const bn = Number(l?.blockNumber || 0);
            return bn > m ? bn : m;
        }, 0);
    }, [rawLogs]);

    const uniqueOwners = useMemo(() => {
        // Compute unique owners from enriched designs (visible dataset)
        const owners = new Set(
            designs
                .map(d => d.owner.toLowerCase().trim())
                .filter(Boolean)
        );
        return owners.size;
    }, [designs]);

    const filteredDesigns = useMemo(() => {
        let list = [...designs];
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(d =>
                d.title.toLowerCase().includes(q) ||
                d.cid.toLowerCase().includes(q) ||
                (d.ipId || '').toLowerCase().includes(q)
            );
        }
        const of = ownerFilter.trim();
        const isValidOwner = /^0x[0-9a-fA-F]{40}$/.test(of);
        if (isValidOwner) {
            const o = of.toLowerCase();
            list = list.filter(d => d.owner.toLowerCase() === o);
        }
        list.sort((a, b) => {
            const ab = Number(a.blockNumber || 0);
            const bb = Number(b.blockNumber || 0);
            return sortNewest ? bb - ab : ab - bb;
        });
        return list;
    }, [designs, search, ownerFilter, sortNewest]);

    return (
        <main className="min-h-screen py-14 px-6 pt-24 bg-white relative overflow-hidden">
            {/* decorative background */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.15),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(99,102,241,0.15),transparent_65%)]" />
            <div className="w-full max-w-7xl mx-auto relative">
                <div className="mb-10 flex flex-col gap-6">
                    <div className="text-center space-y-4">
                        <h1 className="text-5xl font-sans font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-sky-600 via-indigo-600 to-fuchsia-600">
                            Explore Marketplace
                        </h1>
                        <p className="mx-auto max-w-2xl text-sm text-gray-700 leading-relaxed">
                            Browse verified on-chain design IP assets registered through Story Protocol. Filter by owner, search metadata, and inspect on-chain proofs.
                        </p>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="group rounded-xl border border-gray-200 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow md:transition">
                                <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Total Designs</div>
                                <div className="mt-1 text-3xl font-semibold text-gray-900">{designs.length}</div>
                                <div className="mt-1 text-[11px] text-gray-500">Enriched with metadata</div>
                            </div>
                            <div className="group rounded-xl border border-gray-200 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow md:transition">
                                <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Unique Owners</div>
                                <div className="mt-1 text-3xl font-semibold text-gray-900">{uniqueOwners}</div>
                                <div className="mt-1 text-[11px] text-gray-500">Across all registered originals</div>
                            </div>
                            <div className="group rounded-xl border border-gray-200 bg-white/80 backdrop-blur p-4 shadow-sm hover:shadow md:transition">
                                <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Latest Block</div>
                                <div className="mt-1 text-3xl font-semibold text-gray-900">{latestBlock}</div>
                                <div className="mt-1 text-[11px] text-gray-500">Highest observed event</div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <input
                                placeholder="Search title / CID / IP ID"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                            />
                            <input
                                placeholder="Filter by owner (0x…)"
                                value={ownerFilter}
                                onChange={(e) => setOwnerFilter(e.target.value)}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setSortNewest(s => !s)}
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-300"
                            >{sortNewest ? "Newest" : "Oldest"}</button>
                            <button
                                type="button"
                                onClick={() => fetchDesigns()}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-300"
                            >Refresh</button>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-3">
                                <div className="h-40 w-full rounded-lg bg-gray-200 mb-3" />
                                <div className="h-4 w-3/4 rounded bg-gray-200 mb-2" />
                                <div className="h-3 w-1/2 rounded bg-gray-200 mb-1" />
                                <div className="h-3 w-2/3 rounded bg-gray-200" />
                            </div>
                        ))}
                    </div>
                )}
                {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">Error: {error}</div>
                )}
                {!loading && !error && filteredDesigns.length === 0 && (
                    <div className="rounded-md border border-gray-200 bg-white/70 backdrop-blur p-6 text-center text-sm text-gray-600">No designs yet. Be the first to publish.</div>
                )}

                <h1 className="text-4xl text-black font-sans my-4 font-bold">Figma IP's</h1>

                {!loading && filteredDesigns.length > 0 && (
                    <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 justify-center">
                        {filteredDesigns.map((d) => (
                            <DesignCard key={d.cid} {...d} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}