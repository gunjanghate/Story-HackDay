"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemixScreen({ cid }: { cid: string }) {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [figmaUrl, setFigmaUrl] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function remixDesign(e: any) {
        e.preventDefault();

        if (!title.trim() || (!file && !figmaUrl.trim())) {
            setMessage("Title and either a Figma URL or .fig file are required.");
            return;
        }

        setLoading(true);
        setMessage("Uploading remix metadata to IPFS…");

        try {
            // ✅ Upload remix metadata to IPFS
            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("remixOf", cid);
            if (file) formData.append("file", file);
            if (figmaUrl.trim()) formData.append("figmaUrl", figmaUrl.trim());

            const uploadRes = await fetch("/api/ipfs/upload", { method: "POST", body: formData });
            const uploadJson = await uploadRes.json();

            if (!uploadRes.ok || !uploadJson.cid) {
                throw new Error(uploadJson.error || "IPFS upload failed");
            }

            const remixCid = uploadJson.cid;

            setMessage("Registering remix on Story Protocol…");

            // ✅ Register remix on chain
            const remixRes = await fetch("/api/story/remix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ originalCid: cid, remixCid }),
            });

            const remixJson = await remixRes.json();
            if (!remixJson.success) {
                throw new Error(remixJson.error || "Remix transaction failed");
            }

            // ✅ Optimistic remix UI counter
            try {
                const key = `remix-count:${cid}`;
                const current = Number(localStorage.getItem(key) || "0");
                localStorage.setItem(key, String(current + 1));
            } catch { }

            const explorerUrl = `https://aeneid.storyscan.io/ip/${remixJson.newIpId}`;

            setMessage(
                `Remix minted on chain.\n\n` +
                `StoryScan: ${explorerUrl}\n` +
                `Parent CID: ${cid}\n` +
                `Remix CID: ${remixCid}\n\n` +
                `Redirecting…`
            );

            // Redirect after short celebration 😎
            setTimeout(() => {
                router.push(`/design/${remixCid}?remixed=true`);
            }, 1800);

        } catch (err: any) {
            console.error(err);
            setMessage(`${err.message || "Something went wrong"}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="gradient-bg min-h-screen py-12 px-6">
            <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600">Remix Design</h2>
                    <p className="text-sm text-gray-700">Original CID: <span className="font-mono text-gray-800">{cid}</span></p>
                </div>
                <form onSubmit={remixDesign} className="space-y-6 bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-white/40">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-800" htmlFor="title">Remix Title *</label>
                        <input
                            id="title"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                            placeholder="e.g. Dark Theme Variant"
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-800" htmlFor="figmaUrl">Figma URL (optional)</label>
                        <input
                            id="figmaUrl"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                            placeholder="https://www.figma.com/file/..."
                            onChange={(e) => setFigmaUrl(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-800" htmlFor="file">Upload .fig File</label>
                        <input
                            id="file"
                            type="file"
                            accept=".fig"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-500"
                        />
                        <p className="text-xs text-gray-500">Optional: attach a .fig to override remote Figma asset retrieval.</p>
                    </div>
                    <div>
                        <button
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition disabled:opacity-50 hover:from-sky-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            {loading ? "Processing…" : "Remix & Publish"}
                        </button>
                    </div>
                    {message && (
                        <pre className="text-sm whitespace-pre-line rounded-md border border-indigo-100 bg-indigo-50 px-4 py-3 text-indigo-700">
                            {message}
                        </pre>
                    )}
                </form>
            </div>
        </main>
    );
}
