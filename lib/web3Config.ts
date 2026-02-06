import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';

// Local Hardhat network
export const hardhat = defineChain({
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hardhat',
      url: 'http://127.0.0.1:8545',
    },
  },
});

// Contract addresses (Base 主网)
export const CONTRACT_ADDRESSES = {
  SPARK_TOKEN: '0xEABD7e41D19c9b977419aE054815C4bF9B028d20',
  MINT_CONTROLLER: '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839',
  MEMBERSHIP_MANAGER: '0xE2602C575eF77b5F3c783B00cE29F0b9DcB31552',
  REWARD_POOL: '0x873B9298B689bD4D1703ABef0AeB9738d826214B',
  USDT: '0x0786B0ee44DDABE474efc6E72EB18521873BBE2A',
  POST_SCORING_AGENT: import.meta.env.VITE_POST_SCORING_AGENT_ADDRESS || '', // 待部署
};

// Wagmi config
export const wagmiConfig = createConfig({
  chains: [base, hardhat],
  connectors: [
    injected(),
  ],
  transports: {
    [base.id]: http(),
    [hardhat.id]: http(),
  },
});

// Contract ABIs (standard JSON format)
export const SPARK_TOKEN_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const USDT_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// MockUSDT 测试网领水（仅测试合约有）
export const MOCK_USDT_ABI = [
  ...USDT_ABI,
  {
    inputs: [{ name: 'to', type: 'address' }],
    name: 'faucet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const MINT_CONTROLLER_ABI = [
  {
    type: 'function',
    name: 'isEligible',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
  },
  {
    type: 'function',
    name: 'hasMinted',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
  },
  {
    type: 'function',
    name: 'totalMintedUsers',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'function',
    name: 'remainingSlots',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'canMint',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
  },
  {
    type: 'event',
    name: 'UserMinted',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address', internalType: 'address' },
      { indexed: false, name: 'amount', type: 'uint256', internalType: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256', internalType: 'uint256' },
    ],
  },
] as const;

export const MEMBERSHIP_MANAGER_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'isMemberActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getRemainingTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'buyMembership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'memberships',
    outputs: [
      { name: 'startTime', type: 'uint256' },
      { name: 'expireTime', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'startTime', type: 'uint256' },
      { indexed: false, name: 'expireTime', type: 'uint256' },
      { indexed: false, name: 'cost', type: 'uint256' },
    ],
    name: 'MembershipPurchased',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'newExpireTime', type: 'uint256' },
      { indexed: false, name: 'cost', type: 'uint256' },
    ],
    name: 'MembershipRenewed',
    type: 'event',
  },
] as const;

export const REWARD_POOL_ABI = [
  {
    inputs: [
      { name: 'weekId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    name: 'getWeeklyReward',
    outputs: [
      { name: 'rank', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'claimed', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'weekId', type: 'uint256' }],
    name: 'claimWeeklyReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentWeekId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'weekId', type: 'uint256' }],
    name: 'getWeeklyWinners',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'weekId', type: 'uint256' },
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'rank', type: 'uint256' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'WeeklyRewardSet',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'weekId', type: 'uint256' },
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'RewardClaimed',
    type: 'event',
  },
] as const;

export const POST_SCORING_AGENT_ABI = [
  'function registerAgent(string agentURI) external returns (uint256)',
  'function updateAgentURI(uint256 tokenId, string newAgentURI) external',
  'function recordScore(bytes32 postHash, uint8 relevanceScore, uint8 qualityScore, uint8 valueScore) external returns (uint8 totalScore, bool passed)',
  'function activateAgent(uint256 tokenId) external',
  'function deactivateAgent(uint256 tokenId) external',
  'function getAgentInfo(uint256 tokenId) view returns (tuple(string agentURI, uint256 totalScores, uint256 totalPosts, uint256 averageScore, uint256 reputation, bool isActive, uint256 registeredAt))',
  'function getScoringRecord(bytes32 postHash) view returns (tuple(bytes32 postHash, address agent, uint8 relevanceScore, uint8 qualityScore, uint8 valueScore, uint8 totalScore, uint256 timestamp))',
  'function isPostScored(bytes32 postHash) view returns (bool)',
  'function getAgentAverageScore(uint256 tokenId) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function agentTokenIds(address) view returns (uint256)',
  'function MIN_PASSING_SCORE() view returns (uint8)',
  'function MAX_SCORE() view returns (uint8)',
  'event AgentRegistered(uint256 indexed tokenId, address indexed owner, string agentURI)',
  'event AgentURIUpdated(uint256 indexed tokenId, string newAgentURI)',
  'event AgentActivated(uint256 indexed tokenId)',
  'event AgentDeactivated(uint256 indexed tokenId)',
  'event PostScored(bytes32 indexed postHash, uint256 indexed agentTokenId, uint8 totalScore, bool passed)',
  'event ReputationUpdated(uint256 indexed tokenId, uint256 newReputation)',
] as const;

// Constants
export const MINT_COST_ETH = "0.003"; // 0.003 ETH (approximately $10 if ETH = $3333)
export const MINT_REWARD_SPARK = 10000; // 10000 SPARK
export const MEMBERSHIP_COST_USDT = 10; // 10 USDT
export const MEMBERSHIP_DURATION_DAYS = 30;
export const MIN_PASSING_SCORE = 60; // 最低通过分数
