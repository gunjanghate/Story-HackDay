"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import imgg from "@/public/ippy.png";

export default function DesignView({ cid }: { cid: string }) {
    const [metadata, setMetadata] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const [ipId, setIpId] = useState<string | null>(null);
    const [remixCount, setRemixCount] = useState<number>(0);
    const [derivatives, setDerivatives] = useState<Array<{ cid: string | null; title: string; ipId?: string | null }>>([]);

    // Story Protocol API data
    const [storyData, setStoryData] = useState<any>(null);
    const [storyLoading, setStoryLoading] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        if (!cid) return;

        async function load() {
            try {
                const url = `https://ipfs.io/ipfs/${cid}`;
                const res = await fetch(url);
                const data = await res.json();
                setMetadata(data);
            } catch (err) {
                console.error("Metadata fetch failed", err);
            } finally {
                setLoading(false);
            }

            // 🔹 Initialize remix count (will be derived from derivatives below)
            setRemixCount(0);

            // 🔹 Get on-chain IP ID for explorer link
            try {
                const r = await fetch(`/api/story/lookup?cid=${cid}`);
                const j = await r.json();
                if (j?.ipId) {
                    setIpId(j.ipId);
                    // 🔥 Once we have ipId, fetch Story Protocol API data
                    fetchStoryProtocolData(j.ipId);
                }
            } catch (e) {
                console.warn("Story lookup failed", e);
            }
            // 🔹 Derivatives via chain-first API (child IPs of this parent)
            try {
                const res = await fetch(`/api/story/derivatives?parentCid=${cid}`);
                if (res.ok) {
                    const entries: any[] = await res.json();
                    const items: Array<{ cid: string | null; title: string; ipId?: string | null }> = [];
                    // collect childCidHashes to resolve them in batch from server DB
                    const childHashes: string[] = [];
                    for (const entry of entries) {
                        const childCidHash = entry?.args?.childCidHash || null;
                        if (childCidHash) childHashes.push(String(childCidHash).toLowerCase());
                    }

                    let mapping: Record<string, any> = {};
                    if (childHashes.length) {
                        try {
                            const uniq = Array.from(new Set(childHashes));
                            const mapRes = await fetch(`/api/story/lookup/batch`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ cidHashes: uniq }),
                            });
                            if (mapRes.ok) {
                                const md = await mapRes.json();
                                mapping = md?.map ?? {};
                            } else {
                                console.warn("DesignView: batch lookup failed", await mapRes.text());
                            }
                        } catch (e) {
                            console.warn("DesignView: batch lookup error", e);
                        }
                    }

                    for (const entry of entries) {
                        const childIpId = entry?.args?.childIpId || null;
                        const childCidHash = entry?.args?.childCidHash || null;
                        let childCid: string | null = null;
                        if (childCidHash) {
                            const rec = mapping[String(childCidHash).toLowerCase()] ?? null;
                            if (rec && rec.cid) childCid = rec.cid;
                        }

                        if (childCid) {
                            try {
                                const mRes = await fetch(`/api/ipfs/get?cid=${encodeURIComponent(childCid)}`);
                                if (mRes.ok) {
                                    const m = await mRes.json();
                                    items.push({ cid: childCid, title: m?.title ?? "Untitled", ipId: childIpId });
                                } else {
                                    items.push({ cid: childCid, title: "Untitled", ipId: childIpId });
                                }
                            } catch {
                                items.push({ cid: childCid, title: "Untitled", ipId: childIpId });
                            }
                        } else {
                            // No CID available in DB; still show an entry with StoryScan link
                            items.push({ cid: null, title: "Derivative", ipId: childIpId });
                        }
                    }
                    setDerivatives(items);
                    // set remix count based on derivatives we found
                    setRemixCount(items.length);
                }
            } catch (e) {
                console.warn("Derivatives fetch failed", e);
            }
        }

        load();
    }, [cid]);

    // 🔥 Fetch Story Protocol API data via check-ip route
    async function fetchStoryProtocolData(ipIdHex: string) {
        setStoryLoading(true);
        try {
            // Call our backend route which handles the API call to Story Protocol
            const res = await fetch(`/api/check-ip?ipId=${encodeURIComponent(ipIdHex)}`);
            const json = await res.json();

            if (json.exists && json.data) {
                setStoryData(json.data);
                console.log("Story Protocol Data:", json.data);
            } else {
                console.warn("IP Asset not found:", json.error);
            }
        } catch (err) {
            console.error("Story Protocol API fetch failed:", err);
        } finally {
            setStoryLoading(false);
        }
    }

    async function copyCid() {
        try {
            await navigator.clipboard.writeText(cid);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }

    // Copy any field to clipboard
    async function copyToClipboard(text: string, fieldName: string) {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (e) {
            console.error("Copy failed:", e);
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3" />
                    <div className="h-64 bg-linear-to-r from-gray-100 to-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-10 bg-gray-200 rounded w-1/2 mt-2" />
                </div>
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className="max-w-3xl mx-auto p-8">
                <div className="rounded-lg border border-red-100 bg-red-50 p-6 text-center">
                    <h2 className="text-lg font-semibold text-red-700">Design not found</h2>
                    <p className="text-sm text-red-600 mt-2">No metadata available for this CID.</p>
                    <a
                        className="inline-block mt-4 text-sm text-red-700 underline"
                        href={`https://ipfs.io/ipfs/${cid}`}
                        rel="noreferrer noopener"
                    >
                        View raw metadata
                    </a>
                </div>
            </div>
        );
    }

    const title = metadata.title || "Untitled design";
    const description = metadata.description || metadata.summary || "";
    const previewSrc = metadata.preview?.startsWith("ipfs://")
        ? `https://ipfs.io/ipfs/${metadata.preview.replace("ipfs://", "")}`
        : metadata.preview;

    const figFile = metadata.figFile ? metadata.figFile.replace("ipfs://", "") : null;
    const figUrl = figFile ? `https://ipfs.io/ipfs/${figFile}` : null;

    return (
        <main className="relative min-h-screen overflow-hidden gradient-bg text-black">
            <div className="mx-auto max-w-5xl px-6 pt-20 pb-12">
                <div className="relative hero-glow mb-6" />

                {/* Card */}
                <div className="rounded-2xl border border-black/10 bg-white/70 shadow-lg overflow-hidden">

                    {/* Header */}
                    <div className="px-6 py-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-16 h-16 rounded-lg flex items-center justify-center text-lg font-bold text-white"
                                style={{
                                    background: "linear-gradient(135deg,#6366F1 0%,#EC4899 100%)",
                                    boxShadow: "0 6px 20px rgba(99,102,241,0.12)",
                                }}
                            >
                                {(title[0] || "D").toUpperCase()}
                            </div>

                            <div>
                                <h1 className="text-2xl font-semibold leading-tight text-gray-900 flex items-center gap-3">
                                    <span>{title}</span>
                                    {ipId && (
                                        <button
                                            onClick={() => copyToClipboard(ipId, "ipId")}
                                            className="text-xs font-normal text-indigo-600 break-all hover:opacity-75 transition"
                                            title="Click to copy IP ID"
                                        >
                                            IP ID: {`${ipId.slice(0, 10)}…${ipId.slice(-4)}`}
                                            {copiedField === "ipId" ? " ✓" : " 📋"}
                                        </button>
                                    )}
                                </h1>
                                {description && <p className="text-sm text-gray-700 mt-1">{description}</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => window.location.href = `/remix/${cid}`}
                                className={`group flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white
                                                                    bg-linear-to-r from-sky-500 to-indigo-500 shadow-lg shadow-indigo-900/20 transition
                                                                    hover:from-sky-400 hover:to-indigo-400 active:scale-[.99]`}
                            >
                                Remix
                            </button>

                            <span className="px-3 py-1 rounded-md text-xs bg-white/70 border border-black/10 text-gray-900">Remixes: {remixCount}</span>

                            {storyData?.txHash && (
                                <a
                                    href={`https://aeneid.storyscan.io/tx/${storyData.txHash}`}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="px-4 py-2 text-sm rounded-lg border border-black/10 bg-white/70 text-gray-900"
                                >
                                    View Tx →
                                </a>
                            )}

                            {figUrl && (
                                <a
                                    href={figUrl}
                                    download
                                    className="px-4 py-2 text-sm rounded-lg border border-black/10 bg-white/70 text-gray-900"
                                >
                                    Download .fig
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Preview */}
                        <div className="md:col-span-2">
                            <div
                                className="rounded-xl overflow-hidden bg-white p-0 border border-black/10 shadow-sm relative cursor-pointer"
                                onClick={() => previewSrc && setPreviewOpen(true)}
                            >
                                {previewSrc ? (
                                    <img src={previewSrc} alt={title} className="w-full object-cover max-h-[520px]" />
                                ) : (
                                    <Image
                                        src={imgg}
                                        alt={title}
                                        className="w-full object-cover"
                                        loading="lazy"
                                    />
                                )}

                                <div className="absolute top-3 right-3 bg-white/60 backdrop-blur rounded-md px-3 py-1 text-xs text-gray-800">
                                    Preview
                                </div>
                            </div>

                            {/* Derived from */}
                            {metadata.remixOf && (
                                <div className="mt-3 text-sm">
                                    <span className="text-gray-500">Derived from: </span>
                                    <a
                                        className="text-indigo-600 underline break-all"
                                        href={`/design/${metadata.remixOf}`}
                                    >
                                        {metadata.remixOf}
                                    </a>
                                </div>
                            )}
                            {/* Derivatives section */}
                            <div className="mt-8">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Derivatives</h3>
                                {derivatives.length === 0 ? (
                                    <p className="text-sm text-gray-600">No derivatives published yet.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {derivatives.map((d, idx) => (
                                            <li key={`${d.cid ?? 'missing'}-${idx}`} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white/70 px-3 py-2">
                                                <div className="min-w-0">
                                                    {d.cid ? (
                                                        <a href={`/design/${d.cid}`} className="text-sm font-medium text-gray-900 truncate underline">
                                                            {d.title}
                                                        </a>
                                                    ) : (
                                                        <div className="text-sm font-medium text-gray-900 truncate">{d.title}</div>
                                                    )}
                                                    <div className="text-xs text-gray-600 break-all">CID: {d.cid ?? (d.ipId ? `childIpId:${d.ipId}` : '—')}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {d.cid ? (
                                                        <a
                                                            href={`https://ipfs.io/ipfs/${d.cid}`}
                                                            target="_blank"
                                                            rel="noreferrer noopener"
                                                            className="text-xs text-gray-700 underline"
                                                            title="Open metadata on IPFS"
                                                        >
                                                            IPFS
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">IPFS</span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {description && <p className="mt-4 text-gray-700 leading-relaxed">{description}</p>}
                        </div>

                        {/* Sidebar */}
                        <aside className="space-y-4">

                            {/* CID */}
                            <div className="bg-white/70 border border-black/10 p-4 rounded-lg">
                                <p className="text-xs text-gray-500">CID</p>
                                <p className="text-xs break-all font-mono text-gray-800 mt-1">{cid}</p>
                                <button
                                    onClick={copyCid}
                                    className="mt-2 text-sm bg-sky-600 text-white px-3 py-1 rounded hover:opacity-95"
                                >
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>

                            {/* Figma link */}
                            <div className="p-4 rounded-lg border border-black/10 bg-white/70 text-center">
                                {metadata.figmaUrl ? (
                                    <a
                                        href={metadata.figmaUrl}
                                        target="_blank"
                                        className="text-sm bg-sky-600 text-white px-4 py-2 rounded-lg inline-block"
                                    >
                                        Open in Figma
                                    </a>
                                ) : (
                                    <span className="text-xs text-gray-500">No Figma URL provided</span>
                                )}
                            </div>
                        </aside>
                    </div>
                </div>

                {/* 🔥 Story Protocol Data Section */}
                {storyData && (
                    <div className="mt-8 rounded-2xl border border-black/10 bg-white/70 overflow-hidden shadow-lg">
                        {/* Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-black/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">✓ Registered on Story Protocol</h2>
                                    <p className="text-sm text-gray-600 mt-1">Complete on-chain registration proof & comprehensive metadata</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Chain ID</p>
                                    <p className="text-lg font-bold text-indigo-600">{storyData.chainId}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* 1. Core Identity */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🆔</span>
                                    Core Identity
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-2">IP ID (Hex Format)</p>
                                        <p className="text-sm font-mono text-gray-900 break-all bg-white p-2 rounded border border-indigo-100">{storyData.ipId}</p>
                                        <button
                                            onClick={() => copyToClipboard(storyData.ipId, "ipId")}
                                            className="mt-3 w-full text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition font-semibold"
                                        >
                                            {copiedField === "ipId" ? "✓ Copied" : "Copy IP ID"}
                                        </button>
                                    </div>

                                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-2">Owner Address</p>
                                        <p className="text-sm font-mono text-gray-900 break-all bg-white p-2 rounded border border-purple-100">{storyData.ownerAddress}</p>
                                        <button
                                            onClick={() => copyToClipboard(storyData.ownerAddress, "owner")}
                                            className="mt-3 w-full text-sm bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition font-semibold"
                                        >
                                            {copiedField === "owner" ? "✓ Copied" : "Copy Address"}
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* 2. NFT Details */}
                            <section className="border-t pt-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🎨</span>
                                    NFT Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">NFT Name</p>
                                        <p className="text-sm font-semibold text-gray-900">{storyData.name}</p>
                                    </div>

                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Token ID</p>
                                        <p className="text-sm font-semibold text-gray-900">{storyData.tokenId}</p>
                                    </div>

                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl md:col-span-2">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">IPFS URI</p>
                                        <p className="text-xs font-mono text-gray-900 break-all bg-white p-2 rounded border border-blue-100 mb-2">{storyData.uri}</p>
                                        <a
                                            href={`https://ipfs.io/ipfs/${storyData.uri.replace("ipfs://", "")}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-blue-600 underline"
                                        >
                                            View on IPFS →
                                        </a>
                                    </div>
                                </div>
                            </section>

                            {/* 3. On-Chain Transaction Proof */}
                            <section className="border-t pt-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">📜</span>
                                    On-Chain Proof
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl md:col-span-2">
                                        <p className="text-xs text-gray-500 font-semibold mb-2">Transaction Hash</p>
                                        <p className="text-xs font-mono text-gray-900 break-all bg-white p-2 rounded border border-gray-100 mb-3">{storyData.txHash}</p>
                                        <a
                                            href={`https://aeneid.storyscan.io/tx/${storyData.txHash}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-semibold"
                                        >
                                            View on StoryScan →
                                        </a>
                                    </div>

                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Block Number</p>
                                        <p className="text-2xl font-bold text-gray-900">{storyData.blockNumber}</p>
                                    </div>

                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Log Index</p>
                                        <p className="text-2xl font-bold text-gray-900">{storyData.logIndex}</p>
                                    </div>

                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Token Contract</p>
                                        <p className="text-xs font-mono text-gray-900 break-all">{storyData.tokenContract}</p>
                                    </div>

                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Token Type</p>
                                        <p className="text-sm font-semibold text-gray-900">ERC721</p>
                                    </div>
                                </div>
                            </section>

                            {/* 4. Registration & Timestamps */}
                            <section className="border-t pt-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">📅</span>
                                    Registration & Timestamps
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Registration Date</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Date(parseInt(storyData.registrationDate) * 1000).toLocaleDateString('en-US', {
                                                year: 'numeric', month: 'long', day: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {new Date(parseInt(storyData.registrationDate) * 1000).toLocaleTimeString()}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Last Updated</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Date(storyData.lastUpdatedAt).toLocaleDateString('en-US', {
                                                year: 'numeric', month: 'long', day: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {new Date(storyData.lastUpdatedAt).toLocaleTimeString()}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Created At</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Date(storyData.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric', month: 'long', day: 'numeric'
                                            })}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">IP Registration Status</p>
                                        <p className="text-sm font-semibold text-green-600">✓ Active</p>
                                        <p className="text-xs text-gray-600">Registered on chain</p>
                                    </div>
                                </div>
                            </section>

                            {/* 5. IP Lineage & Graph */}
                            <section className="border-t pt-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🔗</span>
                                    IP Lineage & Statistics
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                                        <p className="text-xs text-gray-500 font-semibold mb-2">Parents</p>
                                        <p className="text-3xl font-bold text-emerald-600">{storyData.parentsCount}</p>
                                        <p className="text-xs text-gray-600 mt-1">Original IPs</p>
                                    </div>

                                    <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-xl text-center">
                                        <p className="text-xs text-gray-500 font-semibold mb-2">Children</p>
                                        <p className="text-3xl font-bold text-cyan-600">{storyData.childrenCount}</p>
                                        <p className="text-xs text-gray-600 mt-1">Remixes</p>
                                    </div>

                                    <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl text-center">
                                        <p className="text-xs text-gray-500 font-semibold mb-2">Ancestors</p>
                                        <p className="text-3xl font-bold text-violet-600">{storyData.ancestorsCount}</p>
                                        <p className="text-xs text-gray-600 mt-1">All Origins</p>
                                    </div>

                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                                        <p className="text-xs text-gray-500 font-semibold mb-2">Descendants</p>
                                        <p className="text-3xl font-bold text-amber-600">{storyData.descendantsCount}</p>
                                        <p className="text-xs text-gray-600 mt-1">All Children</p>
                                    </div>
                                </div>
                            </section>

                            {/* 6. Moderation Status */}
                            <section className="border-t pt-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🛡️</span>
                                    Moderation Status
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {Object.entries(storyData.moderationStatus || {}).map(([key, value]: [string, any]) => (
                                        <div key={key} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                                            <p className="text-xs font-semibold text-gray-700 capitalize mb-2">{key}</p>
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${value === "MISSING_IMAGE" ? "bg-gray-100 text-gray-600" :
                                                value === "APPROVED" ? "bg-green-100 text-green-700" :
                                                    "bg-yellow-100 text-yellow-700"
                                                }`}>
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* 7. Infringement Checks */}
                            {storyData.infringementStatus && storyData.infringementStatus.length > 0 && (
                                <section className="border-t pt-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="text-2xl">✅</span>
                                        Infringement Verification
                                    </h3>
                                    <div className="space-y-3">
                                        {storyData.infringementStatus.map((check: any, idx: number) => (
                                            <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{check.status}</p>
                                                    <p className="text-xs text-gray-600">
                                                        {check.providerName ? `Provider: ${check.providerName}` : "Verification Check"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Checked: {new Date(check.responseTime).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-bold ${check.isInfringing ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                                        }`}>
                                                        {check.isInfringing ? "⚠️ Infringing" : "✓ Clear"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* 8. Additional Metadata */}
                            <section className="border-t pt-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">📋</span>
                                    Additional Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Is In Group</p>
                                        <p className="text-sm font-semibold text-gray-900">{storyData.isInGroup ? "Yes" : "No"}</p>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <p className="text-xs text-gray-500 font-semibold mb-1">Root IPs</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {storyData.rootIPs && storyData.rootIPs.length > 0 ? storyData.rootIPs.length : "None"}
                                        </p>
                                    </div>

                                    {storyData.title && (
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl md:col-span-2">
                                            <p className="text-xs text-gray-500 font-semibold mb-1">Title</p>
                                            <p className="text-sm text-gray-900">{storyData.title}</p>
                                        </div>
                                    )}

                                    {storyData.description && (
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl md:col-span-2">
                                            <p className="text-xs text-gray-500 font-semibold mb-1">Description</p>
                                            <p className="text-sm text-gray-900">{storyData.description}</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 9. Raw Metadata from IPFS */}
                            {storyData.raw?.metadata && (
                                <section className="border-t pt-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="text-2xl">🔬</span>
                                        Raw Metadata (IPFS)
                                    </h3>
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                                        <pre className="text-xs font-mono text-gray-700 break-all whitespace-pre-wrap overflow-y-auto max-h-64 bg-white p-3 rounded border border-gray-200">
                                            {JSON.stringify(storyData.raw.metadata, null, 2)}
                                        </pre>
                                    </div>
                                </section>
                            )}

                            {/* 10. Quick Links & Actions */}
                            <section className="border-t pt-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🔗</span>
                                    Quick Links
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <a
                                        href={`https://aeneid.storyscan.io/tx/${storyData.txHash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
                                    >
                                        <span>📜</span> View Transaction
                                    </a>

                                    <a
                                        href={`https://ipfs.io/ipfs/${storyData.uri?.replace("ipfs://", "")}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition"
                                    >
                                        <span>🌐</span> IPFS Metadata
                                    </a>

                                    {storyData.nftMetadata?.tokenUri && (
                                        <a
                                            href={storyData.nftMetadata.tokenUri}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
                                        >
                                            <span>🎨</span> NFT URI
                                        </a>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {storyLoading && (
                    <div className="mt-8 rounded-2xl border border-black/10 bg-white/70 p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-6 bg-gray-200 rounded w-1/3" />
                            <div className="h-4 bg-gray-200 rounded w-2/3" />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-20 bg-gray-200 rounded" />
                                <div className="h-20 bg-gray-200 rounded" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview modal */}
                {previewOpen && previewSrc && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
                        onClick={() => setPreviewOpen(false)}
                    >
                        <div
                            className="max-w-5xl w-full rounded-xl overflow-hidden bg-white"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h3 className="text-sm font-medium">{title}</h3>
                                <button
                                    onClick={() => setPreviewOpen(false)}
                                    className="text-sm text-gray-600 px-3 py-1 rounded hover:bg-gray-100"
                                >
                                    Close
                                </button>
                            </div>
                            <img src={previewSrc} alt={title} className="w-full object-contain max-h-[80vh]" />
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
