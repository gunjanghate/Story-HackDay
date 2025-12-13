"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { keccak256, toUtf8Bytes } from "ethers";

export default function RemixScreen({ cid }: { cid: string }) {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [figmaUrl, setFigmaUrl] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function remixDesign(e: any) {
        e.preventDefault();
        console.log("[REMIX] Submit clicked", { originalCid: cid });

        if (!title.trim() || (!file && !figmaUrl.trim())) {
            setMessage("Title and either a Figma URL or .fig file are required.");
            return;
        }

        setLoading(true);
        setMessage("Uploading remix metadata to IPFS…");
        console.log("[REMIX] Stage 1: Preparing form data for IPFS");

        try {
            // ✅ Upload remix metadata to IPFS
            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("remixOf", cid);
            if (file) formData.append("file", file);
            if (figmaUrl.trim()) formData.append("figmaUrl", figmaUrl.trim());

            console.log("[REMIX] Stage 1: Sending IPFS upload request");
            const uploadRes = await fetch("/api/ipfs/upload", { method: "POST", body: formData });
            const uploadJson = await uploadRes.json();

            if (!uploadRes.ok || !uploadJson.cid) {
                console.error("[REMIX] Stage 1 ERROR: IPFS upload failed", uploadJson);
                throw new Error(uploadJson.error || "IPFS upload failed");
            }

            const remixCid = uploadJson.cid as string;
            console.log("[REMIX] Stage 1 SUCCESS: Remix CID from IPFS", { remixCid });

            // Removed the call to the anchor endpoint as ipId is null
            setMessage("Registering remix on Story Protocol…");
            console.log("[REMIX] Stage 2: Registering derivative on Story", { originalCid: cid, remixCid });
            setMessage("Registering remix on Story Protocol…");
            console.log("[REMIX] Stage 2: Registering derivative on Story", { originalCid: cid, remixCid });

            // ✅ Register remix on chain
            const remixRes = await fetch("/api/story/remix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ originalCid: cid, remixCid }),
            });

            const remixJson = await remixRes.json();
            if (!remixJson.success) {
                console.error("[REMIX] Stage 2 ERROR: Remix API failed", remixJson);
                throw new Error(remixJson.error || "Remix transaction failed");
            }
            console.log("[REMIX] Stage 2 SUCCESS: Derivative registered", { parentIpId: remixJson.parentIpId, newIpId: remixJson.newIpId, txHash: remixJson.txHash });

            // No local optimistic counters — server-side data will drive remix counts in DesignView

            const explorerUrl = `https://aeneid.storyscan.io/ip-id/${remixJson.newIpId}`;
            const txUrl = remixJson.txHash ? `https://aeneid.storyscan.io/tx/${remixJson.txHash}` : null;

            // Persist the on-chain registration result (newIpId and txHash) to the server
            try {
                const cidHash = keccak256(toUtf8Bytes(remixCid)) as `0x${string}`;
                const payload = {
                    cid: remixCid,
                    ipId: remixJson.newIpId,
                    cidHash: String(cidHash).toLowerCase(),
                    anchorTxHash: remixJson.txHash ?? null,
                };
                await fetch("/api/story/anchor", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                console.log("[REMIX] Persisted remix registration to server", { payload });
            } catch (e) {
                console.warn("[REMIX] Failed to persist remix registration to server", e);
            }

            setMessage(
                `Remix minted on chain.\n\n` +
                `StoryScan: ${explorerUrl}\n` +
                (txUrl ? `Tx: ${txUrl}\n` : "") +
                `Parent CID: ${cid}\n` +
                `Remix CID: ${remixCid}\n\n` +
                `Redirecting…`
            );

            // Redirect after short celebration
            setTimeout(() => {
                router.push(`/design/${remixCid}?remixed=true`);
            }, 1800);

        } catch (err: any) {
            console.error("[REMIX] FATAL ERROR: Flow failed", err);
            setMessage(`${err.message || "Something went wrong"}`);
        } finally {
            console.log("[REMIX] Flow finished (success or error)");
            setLoading(false);
        }
    }

    return (
        <main className="gradient-bg min-h-screen py-24 px-6">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-600 mb-3">
                        Remix Design
                    </h2>
                    <p className="text-sm text-gray-600">Original CID: <span className="font-mono text-gray-800">{cid}</span></p>
                </div>

                <form onSubmit={remixDesign} className="space-y-6 bg-white border border-gray-100 rounded-2xl p-8 shadow-lg">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-800" htmlFor="title">Remix Title *</label>
                        <input
                            id="title"
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            placeholder="e.g. Dark Theme Variant"
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-800" htmlFor="figmaUrl">Figma URL (optional)</label>
                        <input
                            id="figmaUrl"
                            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                            placeholder="https://www.figma.com/file/..."
                            onChange={(e) => setFigmaUrl(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-800" htmlFor="file">Upload .fig File</label>
                        <div className="flex items-center gap-3">
                            <input
                                id="file"
                                type="file"
                                accept=".fig"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="text-sm text-gray-700"
                            />
                            <span className="text-xs text-gray-500">Optional: attach a .fig to override remote Figma asset retrieval.</span>
                        </div>
                    </div>
                    <div>
                        <button
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-md transition disabled:opacity-60 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            {loading ? "Processing…" : "Remix & Publish"}
                        </button>
                    </div>
                    {message && (
                        <pre className="text-sm whitespace-pre-line rounded-md border border-gray-100 bg-gray-50 px-4 py-3 text-gray-800">
                            {message}
                        </pre>
                    )}
                </form>
            </div>
        </main>
    );
}
