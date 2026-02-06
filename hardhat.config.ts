import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// 优先读取 .env.local（包含私钥等敏感信息）
dotenv.config({ path: '.env.local' });
// 然后读取 .env（不覆盖已存在的变量）
dotenv.config();

const config: HardhatUserConfig = {
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local dev network
    hardhat: {
      chainId: 31337,
    },
    // Connect to local node (after npx hardhat node)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      // 本地开发使用Hardhat默认账户，不需要私钥
      // accounts字段留空会自动使用节点提供的账户
    },
    // Base Sepolia testnet (推荐用于测试)
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
      timeout: 120000,
      gasPrice: "auto",
    },
    // Base mainnet
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
      timeout: 120000,
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY || "",
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
