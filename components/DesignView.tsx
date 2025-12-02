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
                if (j?.ipId) setIpId(j.ipId);
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

    async function copyCid() {
        try {
            await navigator.clipboard.writeText(cid);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
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
                                        <a
                                            href={`https://aeneid.storyscan.io/ip-id/${ipId}`}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="text-xs font-normal text-indigo-600 underline break-all"
                                            title={ipId}
                                        >
                                            IP: {`${ipId.slice(0, 10)}…${ipId.slice(-4)}`}
                                        </a>
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

                            {ipId && (
                                <a
                                    href={`https://aeneid.storyscan.io/ip-id/${ipId}`}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="px-4 py-2 text-sm rounded-lg border border-black/10 bg-white/70 text-gray-900"
                                >
                                    Story Explorer →
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
                                                    {d.ipId && (
                                                        <a
                                                            href={`https://aeneid.storyscan.io/ip-id/${d.ipId}`}
                                                            target="_blank"
                                                            rel="noreferrer noopener"
                                                            className="text-xs text-indigo-600 underline"
                                                            title="Open on StoryScan"
                                                        >
                                                            StoryScan
                                                        </a>
                                                    )}
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
