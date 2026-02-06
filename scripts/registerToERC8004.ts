import { ethers } from "hardhat";

/**
 * 独立脚本：将现有Agent注册到ERC-8004官方注册表
 * 用于已经部署了PostScoringAgent但尚未注册到官方注册表的情况
 */

// ERC-8004官方注册合约地址
// 主网和测试网使用不同的地址
const ERC8004_IDENTITY_REGISTRY_MAINNET = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const ERC8004_IDENTITY_REGISTRY_TESTNET = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

// 根据网络选择地址（通过环境变量或hardhat配置判断）
const ERC8004_IDENTITY_REGISTRY = process.env.NETWORK === "mainnet" || process.env.NETWORK === "base" 
  ? ERC8004_IDENTITY_REGISTRY_MAINNET 
  : ERC8004_IDENTITY_REGISTRY_TESTNET;

// Agent元数据URI（修改为你的实际URI）
const AGENT_METADATA_URI = process.env.VITE_AGENT_METADATA_URI || "https://your-domain.com/agent-metadata.json";

// ERC-8004 IdentityRegistry ABI
const IDENTITY_REGISTRY_ABI = [
  "function register(string calldata agentURI) external returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "event AgentRegistered(uint256 indexed tokenId, address indexed owner, string agentURI)"
];

async function main() {
  console.log("🔗 注册Agent到ERC-8004官方注册表\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  // 根据 Chain ID 选择正确的注册表地址
  let registryAddress: string;
  if (network.chainId === 8453n || network.chainId === 1n) {
    // Base Mainnet (8453) or Ethereum Mainnet (1)
    registryAddress = ERC8004_IDENTITY_REGISTRY_MAINNET;
  } else {
    // Testnets (Base Sepolia 84532, Ethereum Sepolia 11155111, etc.)
    registryAddress = ERC8004_IDENTITY_REGISTRY_TESTNET;
  }
  
  console.log("注册账户:", deployer.address);
  console.log("网络:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("Agent URI:", AGENT_METADATA_URI);
  console.log("官方注册表地址:", registryAddress, "\n");

  // 连接到官方IdentityRegistry合约
  const identityRegistry = new ethers.Contract(
    registryAddress,
    IDENTITY_REGISTRY_ABI,
    deployer
  );

  // 检查是否已注册
  try {
    const balance = await identityRegistry.balanceOf(deployer.address);
    console.log("当前账户已注册Agent数量:", balance.toString(), "\n");
  } catch (error) {
    console.log("无法查询注册状态（合约可能不存在或网络不支持）\n");
  }

  // 执行注册
  console.log("📝 开始注册...");
  
  try {
    const tx = await identityRegistry.register(AGENT_METADATA_URI);
    console.log("交易已提交:", tx.hash);
    console.log("等待确认...\n");

    const receipt = await tx.wait();
    console.log("✅ 注册成功！");
    console.log("区块号:", receipt?.blockNumber);
    console.log("Gas使用:", receipt?.gasUsed.toString(), "\n");

    // 直接从 receipt.logs 中解析事件，避免 RPC 限制
    let agentId: bigint | undefined;
    
    if (receipt && receipt.logs.length > 0) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = identityRegistry.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
          
          if (parsedLog?.name === "AgentRegistered") {
            agentId = parsedLog.args[0];
            break;
          }
        } catch (e) {
          // 无法解析该日志，继续
        }
      }
    }

    if (agentId) {
      
      console.log("🎉 注册完成！");
      console.log("=".repeat(60));
      console.log("官方Agent ID:", agentId?.toString());
      console.log("所有者:", deployer.address);
      console.log("元数据URI:", AGENT_METADATA_URI);
      console.log("\n🔍 查看你的Agent:");
      console.log(`https://www.8004scan.io/agents/ethereum/${agentId}`);
      console.log("=".repeat(60));

      // 验证注册
      const tokenURI = await identityRegistry.tokenURI(agentId);
      const owner = await identityRegistry.ownerOf(agentId);
      
      console.log("\n✅ 验证注册信息:");
      console.log("- Token URI:", tokenURI);
      console.log("- Owner:", owner);
      console.log("- 匹配:", owner.toLowerCase() === deployer.address.toLowerCase() ? "✅" : "❌");

      console.log("\n📝 保存以下信息到 .env.local:");
      console.log(`VITE_OFFICIAL_AGENT_ID=${agentId}`);
      console.log(`VITE_ERC8004_IDENTITY_REGISTRY=${registryAddress}`);

    } else {
      console.log("⚠️  未找到注册事件，但交易已成功");
      console.log("\n💡 请使用查询脚本获取 Agent ID:");
      console.log("npm run agent:query");
    }

  } catch (error: any) {
    console.error("❌ 注册失败");
    console.error("错误信息:", error.message);
    
    if (error.message.includes("already registered")) {
      console.log("\n💡 此账户可能已经注册过Agent");
      console.log("使用以下命令查询已注册的Agent:");
      console.log(`cast call ${registryAddress} "balanceOf(address)" ${deployer.address} --rpc-url $RPC_URL`);
    } else {
      console.log("\n💡 可能的原因:");
      console.log("1. 网络不支持或合约地址不正确");
      console.log("2. Gas不足或gas price过低");
      console.log("3. Agent URI格式不正确或无法访问");
      console.log("4. 已经注册过（每个地址只能注册一次）");
    }
    
    console.log("\n🔧 故障排查:");
    console.log("1. 检查网络配置");
    console.log("2. 确认Agent URI可访问:", AGENT_METADATA_URI);
    console.log("3. 检查账户余额是否充足");
    console.log("4. 查看Etherscan交易详情");
    
    throw error;
  }

  console.log("\n✨ 脚本执行完成！");
  console.log("\n📚 更多资源:");
  console.log("- ERC-8004标准: https://eips.ethereum.org/EIPS/eip-8004");
  console.log("- 8004scan浏览器: https://www.8004scan.io");
  console.log("- 官方GitHub: https://github.com/erc-8004/erc-8004-contracts");
  console.log("- 参考项目: https://github.com/8004Mint/8004MintMainGar");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
