'use client';
import Link from "next/link";
import ConnectWallet from "@/components/ConnectWallet";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="relative min-h-screen overflow-hidden gradient-bg text-black">
      {/* ── Top Navigation ── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-black/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* <div className="h-6 w-6 rounded bg-gradient-to-br from-sky-400 to-indigo-500" aria-hidden /> */}
          <span className="text-4xl font-extrabold">FigMint</span>
        </div>

        {/* Wallet UI – now lives only in the nav */}
        <ConnectWallet />
      </nav>

      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-5xl px-6 pt-20 pb-12 text-center">
        <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
          Own, remix and monetize your Figma designs
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-gray-700 md:text-lg">
          Publish designs as on-chain IP assets, enable collaborative remixes, and automate revenue sharing.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* Start Upload – disabled when not connected */}
          <Link
            href={isConnected ? "/upload" : "#"}
            className={`
              group flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium text-white
              bg-gradient-to-r from-sky-500 to-indigo-500 shadow-lg shadow-indigo-900/20 transition
              hover:from-sky-400 hover:to-indigo-400 active:scale-[.99]
              ${!isConnected ? "pointer-events-none opacity-50" : ""}
            `}
            onClick={(e) => !isConnected && e.preventDefault()}
          >
            Start Upload
            <span className="ml-2 h-px w-5 bg-white/60 transition-all group-hover:w-7" aria-hidden />
          </Link>

          <Link
            href="/explore"
            className="flex items-center justify-center rounded-md border border-black/10 bg-white/70 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-white"
          >
            Explore Designs
          </Link>
        </div>

        {!isConnected && (
          <p className="mt-4 text-xs text-red-600">
            Connect your wallet to upload and register designs.
          </p>
        )}
      </section>

      {/* ── Divider ── */}
      <div className="mx-auto my-8 max-w-5xl border-t border-black/10" />

      {/* ── Feature Grid ── */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "On-chain IP Assets", desc: "Mint canonical records for your UI work, portable across the ecosystem." },
            { title: "Remix Collaboration", desc: "Enable derivatives with attribution to grow shared value across creators." },
            { title: "Programmatic Licensing", desc: "Attach permissive terms and control commercial use via presets." },
            { title: "Revenue Splits", desc: "Automate split distribution for original and remix contributors." },
          ].map((f) => (
            <article
              key={f.title}
              className="rounded-xl bg-white/70 p-5 backdrop-blur-sm transition hover:bg-white border border-black/10"
            >
              <h3 className="mb-2 text-sm font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-700">{f.desc}</p>
            </article>
          ))}
        </div>

        {/* ── How it works ── */}
        <div className="mt-16 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-base font-semibold text-gray-900">How it works</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {[
                "Upload a public Figma file or the .fig export",
                "Metadata is stored on IPFS",
                "Registered as an IP asset on Story Protocol",
                "Anchored in the RemixHub contract for discovery",
                "Enable remix workflows and optional commercial licensing",
              ].map((step) => (
                <li
                  key={step}
                  className="rounded-lg bg-white/70 p-3 backdrop-blur-sm transition hover:bg-white border border-black/10"
                >
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-black/10 bg-white/70 p-6">
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Designed for teams</h4>
            <p className="text-sm text-gray-700">
              Ship design systems collaboratively, keep provenance intact, and capture downstream value with transparent splits.
            </p>
            <div className="mt-4 text-xs text-gray-600">Story Aeneid Testnet</div>
          </div>
        </div>
      </section>
    </main>
  );
}