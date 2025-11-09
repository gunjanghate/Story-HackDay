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

            // 🔹 Load local remix count
            try {
                const key = `remix-count:${cid}`;
                const count = Number(localStorage.getItem(key) || "0");
                setRemixCount(count);
            } catch { }

            // 🔹 Get on-chain IP ID for explorer link
            try {
                const r = await fetch(`/api/story/lookup?cid=${cid}`);
                const j = await r.json();
                if (j?.ipId) setIpId(j.ipId);
            } catch (e) {
                console.warn("Story lookup failed", e);
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
                    <div className="h-64 bg-gradient-to-r from-gray-100 to-gray-200 rounded" />
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
        <div className="gradient-bg min-h-screen max-w-4xl mx-auto p-8">

            {/* Card */}
            <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">

                {/* Header */}
                <div className="px-6 py-6 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center text-lg font-bold">
                            {(title[0] || "D").toUpperCase()}
                        </div>

                        <div>
                            <h1 className="text-xl font-semibold leading-tight">{title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">

                        {/* Remix button */}
                        <button
                            onClick={() => window.location.href = `/remix/${cid}`}
                            className="bg-indigo-800 px-4 py-2 text-sm rounded-lg hover:opacity-90"
                        >
                            Remix
                        </button>

                        {/* Remix count */}
                        <span className="bg-white/20 border border-white/30 px-3 py-1 rounded-md text-xs">
                            Remixes: {remixCount}
                        </span>

                        {/* Story Explorer */}
                        {ipId && (
                            <a
                                href={`https://aeneid.storyscan.io/ip/${ipId}`}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="bg-white/10 border border-white/20 px-4 py-2 text-sm rounded-lg hover:bg-white/5"
                            >
                                Story Explorer →
                            </a>
                        )}

                        {/* Download */}
                        {figUrl && (
                            <a
                                href={figUrl}
                                download
                                className="bg-white/10 border border-white/20 px-4 py-2 text-sm rounded-lg hover:bg-white/5"
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
                            className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm relative cursor-pointer"
                            onClick={() => previewSrc && setPreviewOpen(true)}
                        >
                            <Image
                                src={imgg}
                                alt={title}
                                className="w-full object-cover"
                                loading="lazy"
                            />

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

                        {description && <p className="mt-4 text-gray-700 leading-relaxed">{description}</p>}
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-4">

                        {/* CID */}
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
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
                        <div className="p-4 rounded-lg border border-gray-100 bg-gray-50 text-center">
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
    );
}
