import { ethers } from "hardhat";

// ERC-8004官方注册合约地址
const ERC8004_REGISTRIES = {
  // Ethereum Mainnet
  mainnet: {
    identityRegistry: "0x8004ad19E14B9e0654f73353e8a0B600D46C2898",
    reputationRegistry: "0x8004B12F4C2B42d00c46479e859C92e39044C930",
    validationRegistry: "0x8004C11C213ff7BaD36489bcBDF947ba5eee289B"
  },
  // Base Mainnet
  base: {
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputationRegistry: "0x8004B12F4C2B42d00c46479e859C92e39044C930",
    validationRegistry: "0x8004C11C213ff7BaD36489bcBDF947ba5eee289B"
  },
  // Base Sepolia测试网
  baseSepolia: {
    identityRegistry: "0x8004ad19E14B9e0654f73353e8a0B600D46C2898",
    reputationRegistry: "0x8004B12F4C2B42d00c46479e859C92e39044C930",
    validationRegistry: "0x8004C11C213ff7BaD36489bcBDF947ba5eee289B"
  },
  // Hardhat本地网络（使用测试网地址）
  hardhat: {
    identityRegistry: "0x8004ad19E14B9e0654f73353e8a0B600D46C2898",
    reputationRegistry: "0x8004B12F4C2B42d00c46479e859C92e39044C930",
    validationRegistry: "0x8004C11C213ff7BaD36489bcBDF947ba5eee289B"
  }
};

// ERC-8004 IdentityRegistry ABI（最小化版本）
const IDENTITY_REGISTRY_ABI = [
  "function register(string calldata agentURI) external returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "event AgentRegistered(uint256 indexed tokenId, address indexed owner, string agentURI)"
];

async function main() {
  console.log("🚀 开始部署PostScoringAgent合约并注册到ERC-8004官方注册表...\n");

  // 获取签名者
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("❌ 没有找到可用的账户。请检查网络配置或私钥设置。");
  }
  
  const deployer = signers[0];
  if (!deployer) {
    throw new Error("❌ 部署账户未定义。请检查Hardhat配置。");
  }

  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  
  console.log("部署账户:", deployer.address);
  console.log("网络:", networkName);
  console.log("Chain ID:", network.chainId.toString());
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("账户余额:", ethers.formatEther(balance), "ETH\n");
  
  if (balance === 0n) {
    console.warn("⚠️  警告：账户余额为0，可能无法支付gas费用\n");
  }

  // 1. 部署PostScoringAgent合约
  console.log("📝 部署PostScoringAgent合约...");
  const PostScoringAgentFactory = await ethers.getContractFactory("PostScoringAgent");
  const agent = await PostScoringAgentFactory.deploy();
  await agent.waitForDeployment();
  const agentAddress = await agent.getAddress();
  console.log("✅ PostScoringAgent部署成功:", agentAddress, "\n");

  // 等待几个区块确认
  console.log("⏳ 等待区块确认...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 2. 注册第一个Agent
  const agentMetadataURI = process.env.VITE_AGENT_METADATA_URI || "https://your-domain.com/agent-metadata.json";
  console.log("📝 注册AI Agent...");
  console.log("Agent元数据URI:", agentMetadataURI);
  
  const registerTx = await agent.registerAgent(agentMetadataURI);
  const registerReceipt = await registerTx.wait();
  
  // 从事件中获取tokenId
  const agentRegisteredEvent = registerReceipt?.logs.find(
    (log: any) => {
      try {
        const parsed = agent.interface.parseLog({ topics: log.topics as string[], data: log.data });
        return parsed?.name === 'AgentRegistered';
      } catch {
        return false;
      }
    }
  );

  let tokenId = 1n;
  if (agentRegisteredEvent) {
    const parsed = agent.interface.parseLog({ 
      topics: agentRegisteredEvent.topics as string[], 
      data: agentRegisteredEvent.data 
    });
    tokenId = parsed?.args.tokenId;
  }

  console.log("✅ Agent注册成功, Token ID:", tokenId.toString());
  
  // 获取Agent信息
  const agentInfo = await agent.getAgentInfo(tokenId);
  console.log("\n📊 Agent信息:");
  console.log("  - URI:", agentInfo.agentURI);
  console.log("  - 总评分次数:", agentInfo.totalPosts.toString());
  console.log("  - 信誉分数:", agentInfo.reputation.toString(), "/ 10000");
  console.log("  - 状态:", agentInfo.isActive ? "激活" : "未激活");

  // 3. 输出配置信息
  console.log("\n" + "=".repeat(60));
  console.log("🎉 部署完成！");
  console.log("=".repeat(60));
  
  console.log("\n📋 合约地址汇总:");
  console.log("PostScoringAgent:", agentAddress);
  console.log("Agent Token ID:", tokenId.toString());

  console.log("\n🔧 环境变量配置 (.env.local):");
  console.log("VITE_POST_SCORING_AGENT_ADDRESS=" + agentAddress);
  console.log("VITE_AGENT_METADATA_URI=" + agentMetadataURI);

  console.log("\n📝 下一步操作:");
  console.log("1. 将上述环境变量添加到 .env.local 文件");
  console.log("2. 确保 agent-metadata.json 文件已上传到指定URI");
  console.log("3. 重启前端应用以加载新配置");
  console.log("4. 测试帖子评分功能");

  console.log("\n💡 Agent合约功能:");
  console.log("- MIN_PASSING_SCORE:", (await agent.MIN_PASSING_SCORE()).toString(), "分");
  console.log("- MAX_SCORE:", (await agent.MAX_SCORE()).toString(), "分");
  console.log("- Agent Owner:", await agent.ownerOf(tokenId));

  // 4. 注册到ERC-8004官方注册表
  console.log("\n" + "=".repeat(60));
  console.log("🔗 注册到ERC-8004官方注册表");
  console.log("=".repeat(60) + "\n");

  const registries = ERC8004_REGISTRIES[networkName as keyof typeof ERC8004_REGISTRIES] || ERC8004_REGISTRIES.hardhat;
  
  console.log("官方注册合约地址:");
  console.log("- IdentityRegistry:", registries.identityRegistry);
  console.log("- ReputationRegistry:", registries.reputationRegistry);
  console.log("- ValidationRegistry:", registries.validationRegistry);

  try {
    // 连接到官方IdentityRegistry合约
    const identityRegistry = new ethers.Contract(
      registries.identityRegistry,
      IDENTITY_REGISTRY_ABI,
      deployer
    );

    console.log("\n📝 向官方注册表注册Agent...");
    const registerTx = await identityRegistry.register(agentMetadataURI);
    const registerReceipt = await registerTx.wait();
    
    console.log("✅ 已注册到官方ERC-8004注册表");
    console.log("交易哈希:", registerReceipt?.hash);

    // 获取官方Agent ID
    const filter = identityRegistry.filters.AgentRegistered(null, deployer.address);
    const events = await identityRegistry.queryFilter(filter, registerReceipt?.blockNumber, registerReceipt?.blockNumber);
    
    if (events.length > 0) {
      const officialAgentId = events[0].args?.tokenId;
      console.log("🎉 官方Agent ID:", officialAgentId?.toString());
      console.log("🔍 查看Agent:", `https://www.8004scan.io/agents/ethereum/${officialAgentId}`);
      
      console.log("\n📋 ERC-8004认证信息:");
      console.log("- 官方Agent ID:", officialAgentId?.toString());
      console.log("- 注册表地址:", registries.identityRegistry);
      console.log("- Agent URI:", agentMetadataURI);
      console.log("- 合约地址:", agentAddress);
    }

  } catch (error: any) {
    console.log("⚠️  注册到官方注册表失败（可能已注册或网络不支持）");
    console.log("错误信息:", error.message);
    console.log("\n💡 手动注册步骤:");
    console.log("1. 访问官方注册表合约:", registries.identityRegistry);
    console.log("2. 调用 register(string agentURI) 函数");
    console.log("3. 参数 agentURI:", agentMetadataURI);
    console.log("4. 完成后在 8004scan.io 查看你的Agent");
  }

  console.log("\n✨ 部署和注册流程完成！");
  console.log("\n🔗 相关链接:");
  console.log("- 合约地址:", agentAddress);
  console.log("- Agent元数据:", agentMetadataURI);
  console.log("- ERC-8004官方文档: https://eips.ethereum.org/EIPS/eip-8004");
  console.log("- 8004scan浏览器: https://www.8004scan.io");
  console.log("- 参考项目: https://github.com/8004Mint/8004MintMainGar");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
