import type { Abi } from "abitype";
import { defineChain, getContract } from "thirdweb";
import { client } from "../client";

export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  rpc: "https://testrpc.xlayer.tech",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "OKLink",
      url: "https://www.oklink.com/xlayer-test",
    },
  ],
  testnet: true,
});

export const EXPLORER_URL = "https://www.oklink.com/xlayer-test";

export const CONTRACT_ADDRESSES = {
  nationRegistry:
    process.env.NEXT_PUBLIC_NATION_REGISTRY ??
    "0x93A84f111D9f82B4BbBDE830F5f91A254d3C547f",
  dispatchNft:
    process.env.NEXT_PUBLIC_DISPATCH_NFT ??
    "0xFC8D948650e347318EB90244C84cEb2f543d8212",
  intelMarket:
    process.env.NEXT_PUBLIC_INTEL_MARKET ??
    "0xa9E86e95cE97878f263059B2BD94e7ca7B4bE257",
  agentRank:
    process.env.NEXT_PUBLIC_AGENT_RANK ??
    "0x8196014ccC17c0efe3F29b3831aE6E76703FFF7F",
} as const;

export const dispatchNftAbi = [
  {
    type: "event",
    name: "DispatchMinted",
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "dispatchId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "matchId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "homeTeam",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "awayTeam",
        type: "string",
      },
      {
        indexed: false,
        internalType: "enum DispatchNFT.ConfidenceTier",
        name: "tier",
        type: "uint8",
      },
    ],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "id", type: "uint256" },
    ],
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "dispatchCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getDispatch",
    stateMutability: "view",
    inputs: [{ internalType: "uint256", name: "dispatchId", type: "uint256" }],
    outputs: [
      {
        internalType: "struct DispatchNFT.DispatchData",
        name: "",
        type: "tuple",
        components: [
          { internalType: "uint256", name: "matchId", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" },
          { internalType: "string", name: "dispatchText", type: "string" },
          {
            internalType: "enum DispatchNFT.ConfidenceTier",
            name: "tier",
            type: "uint8",
          },
          {
            internalType: "enum DispatchNFT.Status",
            name: "status",
            type: "uint8",
          },
          { internalType: "string", name: "metadataURI", type: "string" },
          { internalType: "string", name: "homeTeam", type: "string" },
          { internalType: "string", name: "awayTeam", type: "string" },
          { internalType: "uint256", name: "minute", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { internalType: "address", name: "operator", type: "address" },
      { internalType: "bool", name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "address", name: "operator", type: "address" },
    ],
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
] as const satisfies Abi;

export const nationRegistryAbi = [
  {
    type: "event",
    name: "AgentRegistered",
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "agent",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "nation",
        type: "string",
      },
    ],
  },
  {
    type: "function",
    name: "agentNation",
    stateMutability: "view",
    inputs: [{ internalType: "address", name: "", type: "address" }],
    outputs: [{ internalType: "string", name: "", type: "string" }],
  },
  {
    type: "function",
    name: "getAgentNation",
    stateMutability: "view",
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    outputs: [{ internalType: "string", name: "", type: "string" }],
  },
  {
    type: "function",
    name: "joinNation",
    stateMutability: "nonpayable",
    inputs: [{ internalType: "string", name: "nation", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "nationAccuracyScore",
    stateMutability: "view",
    inputs: [{ internalType: "string", name: "", type: "string" }],
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "nationMemberCount",
    stateMutability: "view",
    inputs: [{ internalType: "string", name: "", type: "string" }],
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
] as const satisfies Abi;

export const intelMarketAbi = [
  {
    type: "function",
    name: "buyDispatch",
    stateMutability: "payable",
    inputs: [{ internalType: "uint256", name: "listingId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelListing",
    stateMutability: "nonpayable",
    inputs: [{ internalType: "uint256", name: "listingId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "listDispatch",
    stateMutability: "nonpayable",
    inputs: [
      { internalType: "uint256", name: "dispatchId", type: "uint256" },
      { internalType: "uint256", name: "price", type: "uint256" },
    ],
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "listingCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "listings",
    stateMutability: "view",
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    outputs: [
      { internalType: "address", name: "seller", type: "address" },
      { internalType: "uint256", name: "dispatchId", type: "uint256" },
      { internalType: "uint256", name: "price", type: "uint256" },
      { internalType: "bool", name: "active", type: "bool" },
    ],
  },
] as const satisfies Abi;

export const agentRankAbi = [
  {
    type: "function",
    name: "agentPoints",
    stateMutability: "view",
    inputs: [{ internalType: "address", name: "", type: "address" }],
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAgentRank",
    stateMutability: "view",
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    outputs: [{ internalType: "string", name: "", type: "string" }],
  },
] as const satisfies Abi;

export const dispatchNftContract = getContract({
  client,
  chain: xLayerTestnet,
  address: CONTRACT_ADDRESSES.dispatchNft,
  abi: dispatchNftAbi,
});

export const nationRegistryContract = getContract({
  client,
  chain: xLayerTestnet,
  address: CONTRACT_ADDRESSES.nationRegistry,
  abi: nationRegistryAbi,
});

export const intelMarketContract = getContract({
  client,
  chain: xLayerTestnet,
  address: CONTRACT_ADDRESSES.intelMarket,
  abi: intelMarketAbi,
});

export const agentRankContract = getContract({
  client,
  chain: xLayerTestnet,
  address: CONTRACT_ADDRESSES.agentRank,
  abi: agentRankAbi,
});
