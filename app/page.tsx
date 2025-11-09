'use client';
import Link from "next/link";
import ConnectWallet from "@/components/ConnectWallet";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="p-6 min-h-screen bg-gray-50">
      <nav className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="font-bold text-xl">Figma IP Protocol 🚀</h1>
        <ConnectWallet />
      </nav>

      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-bold ">Own, Remix & Earn from Figma Designs</h2>
        <p className="text-gray-600">
          Publish your UI designs as on-chain IP assets.
          Enable remix collaboration. Split revenue automatically.
        </p>

        <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
          <Link
            href="/upload"
            className={"px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition " +
              (!isConnected ? "opacity-50 cursor-not-allowed" : "")
            }
          >
            Upload Design 🎨
          </Link>

          <Link
            href="/explore"
            className="px-6 py-3 rounded-lg bg-gray-800 text-white hover:bg-gray-900 transition"
          >
            Explore Designs 🧭
          </Link>
        </div>

        {!isConnected && (
          <p className="text-sm text-red-500 mt-2">
            Connect wallet to upload and register designs
          </p>
        )}

        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-2">How it works</h3>
          <ul className="text-left text-gray-600 space-y-1 mx-auto w-fit">
            <li>✅ Upload Figma file or link</li>
            <li>✅ Stored on IPFS</li>
            <li>✅ Registered on Story Protocol</li>
            <li>✅ Anchored in RemixHub smart contract</li>
            <li>✅ Earn from Remixers & Commercial licenses</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
