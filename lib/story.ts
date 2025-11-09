import {
  StoryClient,
  StoryConfig,
  PILFlavor,
  WIP_TOKEN_ADDRESS,
} from "@story-protocol/core-sdk";

import { privateKeyToAccount } from "viem/accounts";
import {createPublicClient ,http, keccak256, stringToBytes } from "viem";

const CHAIN_ID = "aeneid" as const;
const SPG_NFT_CONTRACT = "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc" as const;

export async function registerIpOnStory(metadataCid: string) {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (!pk) throw new Error("Missing PRIVATE_KEY in .env.local");

   const account = privateKeyToAccount(`0x${pk.replace(/^0x/, "")}`);

  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL || "https://aeneid.storyrpc.io";

  const config: StoryConfig = {
    account,
    transport: http(rpcUrl),
    chainId: CHAIN_ID,
  };

  const client = StoryClient.newClient(config);

  // Hash CID for Story registry lookups
  const cidHash = keccak256(stringToBytes(metadataCid));

  const res = await client.ipAsset.registerIpAsset({
    nft: {
      type: "mint",
      spgNftContract: SPG_NFT_CONTRACT,
      recipient: account.address,
      allowDuplicates: true,
    },
    licenseTermsData: [
      {
        terms: PILFlavor.commercialRemix({
          commercialRevShare: 10, // 10% rev share for parent creator
          defaultMintingFee: BigInt(0),
          currency: WIP_TOKEN_ADDRESS,
        }),
      },
    ],
    ipMetadata: {
      ipMetadataURI: `ipfs://${metadataCid}`,
      ipMetadataHash: cidHash,
      nftMetadataURI: `ipfs://${metadataCid}`,
      nftMetadataHash: cidHash,
    },
  });

  return {
    ipId: res.ipId,
    txHash: res.txHash,
  };
}

export async function registerDerivativeOnStory({
  parentIpId,
  remixCid,
}: {
  parentIpId: string;
  remixCid: string;
}) {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (!pk) throw new Error("Missing PRIVATE_KEY in .env.local");

   const account = privateKeyToAccount(`0x${pk.replace(/^0x/, "")}`);

  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL || "https://aeneid.storyrpc.io";

  const config: StoryConfig = {
    account,
    transport: http(rpcUrl),
    chainId: CHAIN_ID,
  };

  const client = StoryClient.newClient(config);

  const remixCidHash = keccak256(stringToBytes(remixCid));

  // register derivative + SPG mint + PIL flavor commercial remix
  const res = await client.ipAsset.registerDerivativeIpAsset({
    parentIpId,
    nft: {
      type: "mint",
      spgNftContract: SPG_NFT_CONTRACT,
      recipient: account.address,
      allowDuplicates: true,
    },
    licenseTermsData: [
      {
        terms: PILFlavor.commercialRemix({
          commercialRevShare: 10, // match parent IP royalty
          defaultMintingFee: BigInt(0),
          currency: WIP_TOKEN_ADDRESS,
        }),
      },
    ],
    ipMetadata: {
      ipMetadataURI: `ipfs://${remixCid}`,
      ipMetadataHash: remixCidHash,
      nftMetadataURI: `ipfs://${remixCid}`,
      nftMetadataHash: remixCidHash,
    },
  });

  return {
    newIpId: res.ipId,
    txHash: res.txHash,
  };
}

export async function getIpIdFromCid(cid: string): Promise<string | null> {
  // 1. Build a *read-only* public client (no private key needed)
  const publicClient = createPublicClient({
    chain: {
      id: 1513, // Aeneid chain id (Story testnet)
      name: "Story Aeneid",
      network: "aeneid",
      nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
      rpcUrls: {
        default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://aeneid.storyrpc.io"] },
      },
    },
    transport: http(),
  });

  // 2. IPAssetRegistry address (hard-coded for Aeneid – see docs)
  const IP_ASSET_REGISTRY = "0x4c2dB1eF1cC5d5b1cB9f2E4B3c2F5e6d7F8a9b0c" as const;

  // 3. ABI for the `ipId(bytes32)` view function
  const abi = [
    {
      name: "ipId",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "hash", type: "bytes32" }],
      outputs: [{ name: "", type: "address" }],
    },
  ] as const;

  // 4. Compute the 32-byte hash of the CID
  const cidHash = keccak256(stringToBytes(cid));

  // 5. Call the registry
  const ipId = (await publicClient.readContract({
    address: IP_ASSET_REGISTRY,
    abi,
    functionName: "ipId",
    args: [cidHash],
  })) as `0x${string}`;

  // 6. `0x0000…0000` means “not registered”
  return ipId === "0x0000000000000000000000000000000000000000" ? null : ipId;
}
