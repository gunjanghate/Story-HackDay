"use client";

import React, { useEffect, useState } from "react";
import { useRemixHub } from "@/hooks/useRemixHub";
import { keccak256, toUtf8Bytes } from "ethers";

export default function UploadDesignPage() {
    const [figmaUrl, setFigmaUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [storyIpUrlState, setStoryIpUrlState] = useState<string | null>(null);
    const [storyTxUrlState, setStoryTxUrlState] = useState<string | null>(null);
    const [storyAddressUrlState, setStoryAddressUrlState] = useState<string | null>(null);

    const { registerOriginal, txHash, txReceipt, isPending } = useRemixHub();

    // Log RemixHub tx lifecycle changes
    useEffect(() => {
        if (isPending) console.log("[UPLOAD] Stage 4: RemixHub tx pending...");
    }, [isPending]);
    useEffect(() => {
        if (txHash) console.log("[UPLOAD] Stage 4: RemixHub txHash", txHash);
    }, [txHash]);
    useEffect(() => {
        if (txReceipt?.data?.transactionHash) {
            console.log("[UPLOAD] Stage 4: RemixHub confirmed", txReceipt.data.transactionHash);
        }
    }, [txReceipt]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        console.log("[UPLOAD] Submit clicked");
        setLoading(true);
        setMessage("Uploading to IPFS...");

        try {
            // --- 1. Upload to IPFS ---
            console.log("[UPLOAD] Stage 1: Preparing IPFS form data");
            const formData = new FormData();
            formData.append("title", title);
            formData.append("figmaUrl", figmaUrl);
            if (file) formData.append("file", file);
            formData.append("previewUrl", previewUrl);

            console.log("[UPLOAD] Stage 1: Sending IPFS upload request");
            const uploadRes = await fetch("/api/ipfs/upload", { method: "POST", body: formData });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || !uploadData?.cid) {
                console.error("[UPLOAD] Stage 1 ERROR: IPFS upload failed", uploadData);
                throw new Error(uploadData?.error || "IPFS upload failed");
            }
            const cid = uploadData.cid as string;
            console.log("[UPLOAD] Stage 1 SUCCESS: Uploaded to IPFS", { cid });

            setMessage("Registering with Story Protocol...");

            // --- 2. Register on Story ---
            console.log("[UPLOAD] Stage 2: Registering on Story Protocol", { cid, title });
            const storyRes = await fetch("/api/story/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cid, title }),
            });

            const storyData = await storyRes.json();
            if (!storyRes.ok || !storyData.success) {
                console.error("[UPLOAD] Stage 2 ERROR: Story registration failed", storyData);
                throw new Error(storyData?.error || "Story registration failed");
            }

            const ipId = storyData.ipId;
            if (!ipId) throw new Error("Missing ipId from Story");
            console.log("[UPLOAD] Stage 2 SUCCESS: Story registered", { ipId, txHash: storyData.txHash });

            // Show Story explorer & tx links persistently (clickable below)
            const storyIpUrl = `https://aeneid.storyscan.io/ip-id/${ipId}`;
            const storyAddressUrl = `https://aeneid.storyscan.io/address/${ipId}`;
            const storyTxUrl = storyData.txHash ? `https://aeneid.storyscan.io/tx/${storyData.txHash}` : null;
            setStoryIpUrlState(storyIpUrl);
            setStoryTxUrlState(storyTxUrl);
            setStoryAddressUrlState(storyAddressUrl);

            setMessage(`Registered on Story. Anchoring in RemixHub contract...`);

            // --- 3. Compute cidHash locally (RemixHub format) ---
            console.log("[UPLOAD] Stage 3: Computing cidHash");
            const cidHash = keccak256(toUtf8Bytes(cid)) as `0x${string}`;
            console.log("[UPLOAD] Stage 3 SUCCESS: cidHash computed", { cidHash });

            // --- 4. Register in RemixHub ---
            const ipIdBigInt = BigInt(ipId);
            const presetId = 1;
            console.log("[UPLOAD] Stage 4: Anchoring in RemixHub", { ipId: ipIdBigInt.toString(), cidHash, presetId });
            await registerOriginal(ipIdBigInt, cidHash, presetId);
            console.log("[UPLOAD] Stage 4 SUCCESS: RemixHub anchoring tx dispatched");

            // --- 5. Persist final anchor information to server-side MongoDB ---
            try {
                const anchorTx = txReceipt?.data?.transactionHash || txHash || null;
                const payload = {
                    cid,
                    ipId,
                    cidHash: (cidHash as string).toLowerCase(),
                    anchorTxHash: anchorTx,
                };
                console.log("[UPLOAD] Persisting anchor to server", payload);
                const persistRes = await fetch("/api/story/anchor", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const persistData = await persistRes.json();
                if (!persistRes.ok || !persistData?.success) {
                    console.warn("[UPLOAD] Server anchor persist failed", persistData);
                } else {
                    console.log("[UPLOAD] Server anchor persisted", persistData);
                }
            } catch (e) {
                console.warn("[UPLOAD] Error persisting anchor to server", e);
            }

            setMessage("All done! See on-chain proof and transaction details below.");
        } catch (err: any) {
            console.error("[UPLOAD] FATAL ERROR: Flow failed", err);
            setMessage("Error: " + (err?.message || String(err)));
        } finally {
            console.log("[UPLOAD] Flow finished (success or error)");
            setLoading(false);
        }
    }

    return (
        <main className="gradient-bg min-h-screen py-12 px-6 pt-30">
            <div className="max-w-3xl mx-auto">
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-sans font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600">
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
                            className="w-full inline-flex font-sans text-xl items-center justify-center rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 font-medium text-white shadow-sm transition disabled:opacity-50 hover:from-sky-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            {loading || isPending ? "Processing…" : "Upload & Register"}
                        </button>
                    </div>
                    {message && (
                        <div className="rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 whitespace-pre-line">
                            {message}
                        </div>
                    )}

                    <div className="rounded-md border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-800 space-y-2">
                        <div className="font-medium">On-chain Proof (Story Protocol)</div>
                        <div>
                            IP Asset: {storyIpUrlState ? (
                                <a className="text-indigo-600 underline" href={storyIpUrlState} target="_blank" rel="noreferrer noopener">{storyIpUrlState}</a>
                            ) : (
                                <span className="text-gray-500">—</span>
                            )}
                        </div>
                        <div>
                            Asset Address: {storyAddressUrlState ? (
                                <a className="text-indigo-600 underline" href={storyAddressUrlState} target="_blank" rel="noreferrer noopener">{storyAddressUrlState}</a>
                            ) : (
                                <span className="text-gray-500">—</span>
                            )}
                        </div>
                        <div className="text-[11px] text-gray-500">Explorer may take ~30–60s to index new IPs. If the IP Asset link 404s, use the Asset Address link and retry later.</div>
                        <div>
                            Story Registration Tx: {storyTxUrlState ? (
                                <a className="text-indigo-600 underline" href={storyTxUrlState} target="_blank" rel="noreferrer noopener">{storyTxUrlState}</a>
                            ) : (
                                <span className="text-gray-500">—</span>
                            )}
                        </div>
                    </div>
                    {(txHash || txReceipt?.data?.transactionHash) && (
                        <div className="grid gap-3 md:grid-cols-2 text-xs">
                            {txHash && !txReceipt?.data?.transactionHash && (
                                <div className="rounded border border-gray-200 bg-white/80 p-3 font-mono text-gray-700 truncate" title={txHash}>
                                    RemixHub Anchor Tx (Pending): <a className="text-indigo-600 underline" href={`https://aeneid.storyscan.io/tx/${txHash}`} target="_blank" rel="noreferrer noopener">{txHash}</a>
                                </div>
                            )}
                            {txReceipt?.data?.transactionHash && (
                                <div className="rounded border border-green-200 bg-green-50 p-3 font-mono text-green-700 truncate" title={txReceipt.data.transactionHash}>
                                    RemixHub Anchor Tx (Confirmed): <a className="text-green-700 underline" href={`https://aeneid.storyscan.io/tx/${txReceipt.data.transactionHash}`} target="_blank" rel="noreferrer noopener">{txReceipt.data.transactionHash}</a>
                                </div>
                            )}
                        </div>
                    )}
                </form>
            </div>
        </main>
    );
}