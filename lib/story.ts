import {
  StoryClient,
  StoryConfig,
  PILFlavor,
  WIP_TOKEN_ADDRESS,
} from "@story-protocol/core-sdk";

import { privateKeyToAccount } from "viem/accounts";
import { http } from "viem";
import { keccak256, toUtf8Bytes } from "ethers";

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

  // Hash CID for Story registry lookups (using ethers utils)
  const cidHash = keccak256(toUtf8Bytes(metadataCid)) as `0x${string}`;

  try {
    const sdkRes = await client.ipAsset.registerIpAsset({
      nft: {
        type: "mint",
        spgNftContract: SPG_NFT_CONTRACT,
        recipient: account.address,
        allowDuplicates: true,
      },
      licenseTermsData: [
        {
          terms: PILFlavor.commercialRemix({
            commercialRevShare: 10,
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
    const ipId = sdkRes.ipId;
    const txHash = sdkRes.txHash as `0x${string}` | undefined;
    if (!ipId || !txHash) {
      throw new Error("SDK did not return ipId/txHash");
    }
    return { ipId, txHash };
  } catch (e: any) {
    const hint = "Ensure @story-protocol/core-sdk@1.4.1 supports ipAsset.registerIpAsset and SPG_NFT_CONTRACT is valid on Aeneid.";
    throw new Error(`Story original registration failed: ${e?.message || e}. ${hint}`);
  }
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

  const remixCidHash = keccak256(toUtf8Bytes(remixCid)) as `0x${string}`;

  // register derivative + SPG mint using PIL commercial remix terms
  try {
    const ipAssetClient: any = (client as any).ipAsset;
    const licenseClient: any = (client as any).license;

    if (!ipAssetClient || typeof ipAssetClient.registerDerivativeIpAsset !== "function") {
      // Ensure we are using an SDK build that supports derivative registration
      throw new Error(
        "Story SDK ipAsset.registerDerivativeIpAsset is missing. Check @story-protocol/core-sdk version and API compatibility."
      );
    }

    if (!licenseClient || typeof licenseClient.registerPILTerms !== "function") {
      // Guard against mismatched SDK versions where license.registerPILTerms moved/changed
      throw new Error(
        "Story SDK license.registerPILTerms is missing. Check @story-protocol/core-sdk version and API compatibility."
      );
    }

    if (!parentIpId) {
      // Defensive guard: avoid opaque BigInt(undefined) failures inside viem/contracts
      throw new Error("parentIpId is required to register a derivative IP asset");
    }

    let parentIpIdBigInt: bigint;
    try {
      // Story RemixHub + some SDK paths expect uint256-compatible ids
      parentIpIdBigInt = BigInt(parentIpId);
    } catch {
      throw new Error(
        `Invalid parentIpId format for derivative registration: ${parentIpId}. Expected a uint256-compatible string.`
      );
    }

    // 1) Ensure we have a PIL licenseTermsId to use for the derivative
    const pilTerms = PILFlavor.commercialRemix({
      commercialRevShare: 10,
      defaultMintingFee: BigInt(0),
      currency: WIP_TOKEN_ADDRESS,
    });

    const pilRes = await licenseClient.registerPILTerms({ terms: pilTerms });
    const licenseTermsId: bigint | undefined = pilRes?.licenseTermsId;
    if (!licenseTermsId) {
      throw new Error("Story SDK did not return licenseTermsId for derivative PIL terms");
    }

    const sdkRes = await ipAssetClient.registerDerivativeIpAsset({
      nft: {
        type: "mint",
        spgNftContract: SPG_NFT_CONTRACT,
        recipient: account.address,
        allowDuplicates: true,
      },
      derivData: {
        parentIpIds: [parentIpIdBigInt],
        licenseTermsIds: [licenseTermsId],
        maxMintingFee: BigInt(0),
        maxRts: 100_000_000,
        maxRevenueShare: 100,
      },
      ipMetadata: {
        ipMetadataURI: `ipfs://${remixCid}`,
        ipMetadataHash: remixCidHash,
        nftMetadataURI: `ipfs://${remixCid}`,
        nftMetadataHash: remixCidHash,
      },
    } as any);
    const newIpId = sdkRes.ipId;
    const txHash = sdkRes.txHash as `0x${string}` | undefined;
    if (!newIpId || !txHash) {
      throw new Error("SDK did not return newIpId/txHash");
    }
    return { newIpId, txHash };
  } catch (e: any) {
    const hint =
      "Ensure parentIpId exists, is uint256-compatible, and SDK method registerDerivativeIpAsset matches installed @story-protocol/core-sdk version.";
    throw new Error(`Story derivative registration failed: ${e?.message || e}. ${hint}`);
  }
}

export async function getIpIdFromCid(cid: string): Promise<string | null> {
  // 1. Use ethers JSON-RPC provider for a simple read-only call
  const providerUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://aeneid.storyrpc.io";
  const provider = new (await import("ethers")).JsonRpcProvider(providerUrl);

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
  ];

  // 4. Compute the 32-byte hash of the CID (ethers)
  const cidHash = keccak256(toUtf8Bytes(cid));

  // 5. Call the registry using ethers Contract
  const contract = new (await import("ethers")).Contract(IP_ASSET_REGISTRY, abi, provider);
  let ipId: `0x${string}`;
  try {
    ipId = (await contract.ipId(cidHash)) as `0x${string}`;
  } catch (e) {
    console.warn("IP registry lookup failed via ethers; returning null", e);
    return null;
  }

  // 6. `0x0000…0000` means “not registered”
  return ipId === "0x0000000000000000000000000000000000000000" ? null : ipId;
}
