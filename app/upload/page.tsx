// app/upload/page.tsx
"use client";

import React, { useState } from "react";
import { useRemixHub } from "@/hooks/useRemixHub";
import { keccak256, stringToBytes } from "viem"; // stringToBytes is the correct viem function

export default function UploadDesignPage() {
    const [figmaUrl, setFigmaUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const { registerOriginal, txHash, txReceipt, isPending } = useRemixHub();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("Uploading to IPFS...");

        try {
            // --- 1. Upload to IPFS ---
            const formData = new FormData();
            formData.append("title", title);
            formData.append("figmaUrl", figmaUrl);
            if (file) formData.append("file", file);
            formData.append("previewUrl", previewUrl);

            const uploadRes = await fetch("/api/ipfs/upload", { method: "POST", body: formData });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || !uploadData?.cid) {
                throw new Error(uploadData?.error || "IPFS upload failed");
            }
            const cid = uploadData.cid as string;
            console.log("Uploaded to IPFS:", cid);

            setMessage("Registering with Story Protocol...");

            // --- 2. Register on Story ---
            const storyRes = await fetch("/api/story/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cid, title }),
            });

            const storyData = await storyRes.json();
            if (!storyRes.ok || !storyData.success) {
                throw new Error(storyData?.error || "Story registration failed");
            }

            const ipId = storyData.ipId;
            if (!ipId) throw new Error("Missing ipId from Story");

            // --- 3. Compute cidHash locally (RemixHub format) ---
            const cidHash = keccak256(stringToBytes(cid)) as `0x${string}`;
            console.log("CID Hash:", cidHash);

            // Persist CID → Hash mapping
            localStorage.setItem(cidHash, cid);

            setMessage("Anchoring in RemixHub contract...");

            // --- 4. Register in RemixHub ---
            const ipIdBigInt = BigInt(ipId);
            const presetId = 1;
            await registerOriginal(ipIdBigInt, cidHash, presetId); // AWAIT!

            setMessage("All done! Transaction submitted.");
        } catch (err: any) {
            console.error("Upload flow error:", err);
            setMessage("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="gradient-bg min-h-screen py-12 px-6">
            <div className="max-w-3xl mx-auto">
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600">
                        Upload & Register Design
                    </h1>
                    <p className="mt-3 text-sm text-gray-700 max-w-lg mx-auto">
                        Publish your Figma work as an on-chain IP asset. Provide either a public Figma URL or upload the exported <code>.fig</code> file, then we handle IPFS storage and Story Protocol registration.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6 bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white/40">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-800" htmlFor="title">Design Title *</label>
                            <input
                                id="title"
                                className="w-full text-black rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                placeholder="e.g. Dashboard Layout"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-800" htmlFor="figmaUrl">Public Figma URL</label>
                            <input
                                id="figmaUrl"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-black"
                                placeholder="https://www.figma.com/file/..."
                                value={figmaUrl}
                                onChange={(e) => setFigmaUrl(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-800" htmlFor="file">.fig File (optional)</label>
                            <input
                                id="file"
                                type="file"
                                accept=".fig"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="w-full text-sm text-black file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-500"
                            />
                            <p className="text-xs text-gray-500">If provided, overrides remote Figma retrieval data.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-800" htmlFor="preview">Preview Image URL</label>
                            <input
                                id="preview"
                                className="w-full rounded-md border border-gray-300 text-black px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                placeholder="https://... (optional)"
                                value={previewUrl}
                                onChange={(e) => setPreviewUrl(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || isPending}
                            className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition disabled:opacity-50 hover:from-sky-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            {loading || isPending ? "Processing…" : "Upload & Register"}
                        </button>
                    </div>
                    {message && (
                        <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 whitespace-pre-line">
                            {message}
                        </div>
                    )}
                    {(txHash || txReceipt?.data?.transactionHash) && (
                        <div className="grid gap-3 md:grid-cols-2 text-xs">
                            {txHash && (
                                <div className="rounded border border-gray-200 bg-white/80 p-3 font-mono text-gray-700 truncate" title={txHash}>
                                    Pending Tx: {txHash}
                                </div>
                            )}
                            {txReceipt?.data?.transactionHash && (
                                <div className="rounded border border-green-200 bg-green-50 p-3 font-mono text-green-700 truncate" title={txReceipt.data.transactionHash}>
                                    Confirmed: {txReceipt.data.transactionHash}
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>
        </main>
    );
}