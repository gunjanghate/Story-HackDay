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
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload Figma Design</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          className="border p-2 w-full"
          placeholder="Design Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          className="border p-2 w-full"
          placeholder="Public Figma File URL"
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
        />

        <p className="text-center text-gray-500 text-sm">or upload .fig file</p>

        <input
          type="file"
          accept=".fig"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Preview Image URL (optional)"
          value={previewUrl}
          onChange={(e) => setPreviewUrl(e.target.value)}
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:opacity-50"
          type="submit"
          disabled={loading || isPending}
        >
          {loading || isPending ? "Processing..." : "Upload & Register"}
        </button>

        {message && <p className="text-sm mt-2">{message}</p>}

        {txHash && (
          <p className="text-xs text-gray-500">
            Tx submitted: {txHash.slice(0, 10)}…{txHash.slice(-6)}
          </p>
        )}

        {txReceipt?.data?.transactionHash && (
          <p className="text-green-600 text-sm mt-2">
            Completed! Tx: {txReceipt.data.transactionHash}
          </p>
        )}
      </form>
    </div>
  );
}