import { NextResponse } from "next/server";
import axios from "axios";

export const runtime = "nodejs"; // ensure file streaming works

export async function POST(req: Request) {
    try {
        if (!process.env.PINATA_JWT) {
            throw new Error(
                "Missing PINATA_JWT in environment. Add PINATA_JWT to .env.local to enable IPFS uploads."
            );
        }
        const formData = await req.formData();

        const title = formData.get("title") as string;
        const figmaUrl = formData.get("figmaUrl") as string;
        const previewUrl = formData.get("previewUrl") as string;
        const file = formData.get("file") as File | null;

        let figFileCid = "";
        let figFileName = "";

        // 1️⃣ Upload .fig file if exists
        if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());

            const res = await axios.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                buffer,
                {
                    maxBodyLength: Infinity,
                    headers: {
                        "Content-Type": file.type || "application/octet-stream",
                        "Content-Disposition": `attachment; filename=${file.name}`,
                        Authorization: `Bearer ${process.env.PINATA_JWT}`,
                    },
                }
            );

            figFileCid = res.data.IpfsHash;
            figFileName = file.name;
            console.log("✅ .fig uploaded:", figFileCid);
        }

        // 2️⃣ Build metadata JSON
        const metadata = {
            title,
            type: "figma-design",
            figmaUrl: figmaUrl || null,
            figFile: figFileCid
                ? `ipfs://${figFileCid}`
                : null,
            figFileName: figFileName || null,
            preview: previewUrl || null,
            createdAt: Date.now(),
        };

        // 3️⃣ Upload metadata to Pinata
        const metaRes = await axios.post(
            "https://api.pinata.cloud/pinning/pinJSONToIPFS",
            metadata,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.PINATA_JWT}`,
                },
            }
        );

        const cid = metaRes.data.IpfsHash;

        console.log("✅ Metadata CID:", cid);

        return NextResponse.json({ cid, metadata });
    } catch (err: any) {
        console.error("❌ IPFS upload error:", err.response?.data || err);
        const msg = (err?.response?.data && JSON.stringify(err.response.data)) || err.message || String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
