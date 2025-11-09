// app/explore/page.tsx
"use client";

import { useEffect, useState } from "react";
import DesignCard from "@/components/DesignCard";

interface Design {
  cid: string;
  title: string;
  preview: string | null;
  owner: string;
}

export default function ExplorePage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDesigns() {
    try {
      const res = await fetch("/api/designs/list");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API error ${res.status}: ${txt}`);
      }

      // viem returns an array of log objects – safe parse
      const logs: any[] = await res.json();

      const items: Design[] = [];

      for (const log of logs) {
        const cidHash = log.args.cidHash as `0x${string}`;
        const owner = log.args.owner as string;

        // ---- Retrieve CID that was stored in localStorage during upload ----
        const cid = localStorage.getItem(cidHash);
        if (!cid) continue; // no local mapping → skip

        // ---- Pull the JSON metadata from Pinata (or any IPFS gateway) ----
        const metaRes = await fetch(`/api/ipfs/get?cid=${cid}`);
        if (!metaRes.ok) continue;
        const meta = await metaRes.json();

        items.push({
          cid,
          title: meta?.title ?? "Untitled",
          preview: meta?.preview ?? null,
          owner,
        });
      }

      setDesigns(items);
    } catch (err: any) {
      console.error("[Explore] fetch error:", err);
      setError(err.message ?? "Failed to load designs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDesigns();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold mb-6">Explore Designs</h1>

      {loading && <p className="text-gray-600">Loading designs…</p>}

      {error && <p className="text-red-600">Error: {error}</p>}

      {!loading && !error && designs.length === 0 && (
        <p className="text-gray-500">No designs yet. Be the first!</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {designs.map((d, i) => (
          <DesignCard key={i} {...d} />
        ))}
      </div>
    </div>
  );
}