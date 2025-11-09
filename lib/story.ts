// lib/story.ts
import {
  StoryClient,
  StoryConfig,
  PILFlavor,
  WIP_TOKEN_ADDRESS,
} from "@story-protocol/core-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { http, toHex, keccak256, stringToBytes } from "viem";

const CHAIN_ID = "aeneid" as const;
const SPG_NFT_CONTRACT = "0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc" as const;

export async function registerIpOnStory(metadataCid: string, title?: string) {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (!pk) throw new Error("Missing PRIVATE_KEY in .env.local");

  const account = privateKeyToAccount(`0x${pk.replace(/^0x/, "")}`);

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://aeneid.storyrpc.io";

  const config: StoryConfig = {
    account,
    transport: http(rpcUrl),
    chainId: CHAIN_ID,
  };

  const client = StoryClient.newClient(config);

  // 32-byte hash of the CID (required by Story)
  const cidHash = keccak256(stringToBytes(metadataCid));

  const response = await client.ipAsset.registerIpAsset({
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

  console.log("IP Registered!");
  console.log("   • IP ID :", response.ipId);
  console.log("   • Tx    :", response.txHash);
  console.log(`   • View  : https://aeneid.storyscan.io/ip/${response.ipId}`);

  return { ipId: response.ipId, txHash: response.txHash };
}