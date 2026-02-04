import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
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
});

// Contract addresses
export const CONTRACT_ADDRESSES = {
  SPARK_TOKEN: import.meta.env.VITE_SPARK_TOKEN_ADDRESS || '',
  MINT_CONTROLLER: import.meta.env.VITE_MINT_CONTROLLER_ADDRESS || '',
  MEMBERSHIP_MANAGER: import.meta.env.VITE_MEMBERSHIP_MANAGER_ADDRESS || '',
  REWARD_POOL: import.meta.env.VITE_REWARD_POOL_ADDRESS || '',
  USDT: import.meta.env.VITE_USDT_ADDRESS || '',
};

// Wagmi config
export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia, mainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

// Contract ABIs (minimal)
export const SPARK_TOKEN_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;

export const USDT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;

// MockUSDT 测试网领水（仅测试合约有）
export const MOCK_USDT_ABI = [
  ...USDT_ABI,
  'function faucet(address to) external',
] as const;

export const MINT_CONTROLLER_ABI = [
  'function isEligible(address) view returns (bool)',
  'function hasMinted(address) view returns (bool)',
  'function totalMintedUsers() view returns (uint256)',
  'function remainingSlots() view returns (uint256)',
  'function mint() external',
  'function canMint(address) view returns (bool)',
  'event UserMinted(address indexed user, uint256 amount, uint256 timestamp)',
] as const;

export const MEMBERSHIP_MANAGER_ABI = [
  'function isMemberActive(address) view returns (bool)',
  'function getRemainingTime(address) view returns (uint256)',
  'function buyMembership() external',
  'function memberships(address) view returns (uint256 startTime, uint256 expireTime, bool isActive)',
  'event MembershipPurchased(address indexed user, uint256 startTime, uint256 expireTime, uint256 cost)',
  'event MembershipRenewed(address indexed user, uint256 newExpireTime, uint256 cost)',
] as const;

export const REWARD_POOL_ABI = [
  'function getWeeklyReward(uint256 weekId, address user) view returns (uint256 rank, uint256 amount, bool claimed)',
  'function claimWeeklyReward(uint256 weekId) external',
  'function getCurrentWeekId() view returns (uint256)',
  'function getWeeklyWinners(uint256 weekId) view returns (address[])',
  'event WeeklyRewardSet(uint256 indexed weekId, address indexed user, uint256 rank, uint256 amount)',
  'event RewardClaimed(uint256 indexed weekId, address indexed user, uint256 amount)',
] as const;

// Constants
export const MINT_COST_USDT = 10; // 10 USDT
export const MINT_REWARD_SPARK = 10000; // 10000 SPARK
export const MEMBERSHIP_COST_USDT = 10; // 10 USDT
export const MEMBERSHIP_DURATION_DAYS = 30;
