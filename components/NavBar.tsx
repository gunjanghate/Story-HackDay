"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { BrowserProvider, JsonRpcProvider, formatEther } from "ethers";
import { createPortal } from "react-dom";
import ConnectWallet from "@/components/ConnectWallet";

export default function NavBar() {
  const { authenticated, user, logout } = usePrivy();
  const ethAccount = user?.linkedAccounts?.find((a: any) => a.type === "ethereum");
  const address = (ethAccount as any)?.address as string | undefined;

  const [balance, setBalance] = useState<string | null>(null);
  const [detectedAddress, setDetectedAddress] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalPos, setPortalPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // recursively search for ETH address in user object
  function findEthAddress(obj: any): string | null {
    if (!obj) return null;
    if (typeof obj === "string") {
      return /^0x[0-9a-fA-F]{40}$/.test(obj) ? obj : null;
    }
    if (Array.isArray(obj)) {
      for (const v of obj) {
        const f = findEthAddress(v);
        if (f) return f;
      }
      return null;
    }
    if (typeof obj === "object") {
      for (const k of Object.keys(obj)) {
        try {
          const f = findEthAddress(obj[k]);
          if (f) return f;
        } catch { }
      }
    }
    return null;
  }

  // detect ETH address + fetch balance
  useEffect(() => {
    // Re-scan user object for any embedded ETH addresses whenever `user` or `address` changes
    try {
      const found = findEthAddress(user);
      setDetectedAddress(found);
    } catch {
      setDetectedAddress(null);
    }

    let mounted = true;
    async function loadBalance() {
      const effective = address ?? (detectedAddress ?? null);
      if (!effective) {
        setBalance(null);
        return;
      }

      try {
        const win = (window as any);
        const provider = win?.ethereum
          ? new BrowserProvider(win.ethereum)
          : new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL as string);

        const bal = await provider.getBalance(effective);
        if (!mounted) return;
        setBalance(formatEther(bal));
      } catch (e) {
        console.warn("balance fetch failed", e);
        if (mounted) setBalance(null);
      }
    }

    loadBalance();

    return () => { mounted = false; };
  }, [user, address, detectedAddress]);

  const effectiveAddress = address ?? detectedAddress ?? null;
  const shortAddr = effectiveAddress
    ? `${effectiveAddress.slice(0, 6)}…${effectiveAddress.slice(-4)}`
    : null;

  async function handleLogout() {
    try {
      await logout?.();
      // Close menu then reload to clear any residual Privy state across the app
      setMenuOpen(false);
      try {
        window.location.reload();
        return;
      } catch (e) {
        console.warn("Forced reload after logout failed", e);
      }
    } catch (e) {
      console.error("Privy logout failed", e);
    }
  }

  // close popup on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed backdrop-blur-2xl top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-black/10 bg-white/70">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl font-sans font-bold text-black">FigMint</span>
        </Link>
        {/* Primary nav links */}
        <div className="hidden md:flex items-center gap-4 text-sm">
          <Link href="/explore" className="text-gray-800 hover:text-black">Explore</Link>
          <Link href="/upload" className="text-gray-800 hover:text-black">Upload</Link>
          <Link href="/ip-assets/mine" className="text-gray-800 hover:text-black">My IPs</Link>
          {/* <Link href="/ip-assets/all" className="text-gray-800 hover:text-black">All IPs</Link> */}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!authenticated && <ConnectWallet />}

        {authenticated && (
          <div className="relative">
            <button
              ref={btnRef}
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-3 rounded-full px-3 py-1 bg-white/70 border border-black/10"
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium text-white bg-linear-to-br from-indigo-500 to-blue-500">
                {shortAddr ? shortAddr.slice(2, 4).toUpperCase() : "U"}
              </div>

              <div className="flex flex-col items-start">
                <span className="text-sm font-mono text-gray-900">{shortAddr}</span>
                <span className="text-xs text-gray-500">Connected</span>
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-black/10 p-4 animate-fade-in z-50">
                <div className="text-xs font-semibold text-gray-700 mb-1">Connected Wallet</div>
                <div className="text-sm font-mono break-all mb-2 text-gray-900">
                  {effectiveAddress ? `${effectiveAddress.slice(0, 6)}...${effectiveAddress.slice(-3)}` : "—"}
                </div>

                <div className="text-xs font-semibold text-gray-700 mb-1">ETH Balance</div>
                <div className="text-sm font-medium mb-3 text-black">
                  {balance ? `${Number(balance).toFixed(4)} IP` : "—"}
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      console.debug("NavBar: logout button clicked");
                      handleLogout();
                    }}
                    className="flex-1 text-sm bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
