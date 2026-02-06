import { ethers } from "hardhat";

/**
 * 查询已注册的 Agent ID
 */

// ERC-8004官方注册合约地址
const ERC8004_IDENTITY_REGISTRY_MAINNET = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const ERC8004_IDENTITY_REGISTRY_TESTNET = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const IDENTITY_REGISTRY_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function totalSupply() external view returns (uint256)",
  "event AgentRegistered(uint256 indexed tokenId, address indexed owner, string agentURI)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

async function main() {
  console.log("🔍 查询已注册的 Agent\n");

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
  
  console.log("查询账户:", deployer.address);
  console.log("网络:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("官方注册表地址:", registryAddress, "\n");

  const identityRegistry = new ethers.Contract(
    registryAddress,
    IDENTITY_REGISTRY_ABI,
    deployer
  );

  try {
    // 查询该地址拥有的 Agent 数量
    const balance = await identityRegistry.balanceOf(deployer.address);
    console.log("✅ 已注册 Agent 数量:", balance.toString(), "\n");

    if (balance > 0n) {
      console.log("📋 正在查询你的 Agent...\n");
      
      // 由于合约可能不支持 tokenOfOwnerByIndex，我们从 Transfer 事件中查找
      console.log("🔍 从区块链事件中查询 Agent ID...");
      
      try {
        // 查询所有 Transfer 到该地址的事件 (mint 或 transfer)
        const transferFilter = identityRegistry.filters.Transfer(null, deployer.address);
        
        // 限制查询范围，避免超时（查询最近 10000 个块）
        const currentBlock = await ethers.provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000);
        
        console.log(`查询区块范围: ${fromBlock} - ${currentBlock}`);
        
        const transferEvents = await identityRegistry.queryFilter(
          transferFilter,
          fromBlock,
          currentBlock
        );
        
        if (transferEvents.length > 0) {
          console.log(`\n✅ 找到 ${transferEvents.length} 个 Transfer 事件\n`);
          console.log("📋 你的 Agent 列表:");
          console.log("=".repeat(80));
          
          const agentIds = new Set<string>();
          
          for (const event of transferEvents) {
            const tokenId = event.args?.tokenId;
            if (tokenId && !agentIds.has(tokenId.toString())) {
              agentIds.add(tokenId.toString());
              
              try {
                // 验证当前所有者
                const currentOwner = await identityRegistry.ownerOf(tokenId);
                
                if (currentOwner.toLowerCase() === deployer.address.toLowerCase()) {
                  const tokenURI = await identityRegistry.tokenURI(tokenId);
                  
                  console.log(`\n🤖 Agent ID: ${tokenId.toString()}`);
                  console.log("元数据 URI:", tokenURI);
                  console.log(`8004scan 链接: https://www.8004scan.io/agents/${network.chainId}/${tokenId}`);
                  console.log("-".repeat(80));
                }
              } catch (error: any) {
                console.log(`⚠️  无法获取 Token ${tokenId} 的详细信息:`, error.message);
              }
            }
          }
          
          console.log("\n" + "=".repeat(80));
          console.log("\n💡 提示:");
          console.log("- 将 Agent ID 保存到 .env.local 文件（VITE_OFFICIAL_AGENT_ID=...）");
          console.log("- 访问 8004scan.io 查看你的 Agent 详情");
        } else {
          console.log("❌ 未找到 Transfer 事件");
          console.log("\n💡 这可能意味着:");
          console.log("1. 注册时间太久，超出查询范围");
          console.log("2. 需要扩大查询范围");
        }
      } catch (error: any) {
        console.log("❌ 查询事件失败:", error.message);
        console.log("\n⚠️  由于 RPC 限制，无法自动获取 Agent ID");
        console.log("\n📝 手动查询方法:");
        console.log("1. 访问你的钱包地址:");
        console.log(`   https://basescan.org/address/${deployer.address}#tokentxnsErc721`);
        console.log("2. 查找 AgentIdentity (AGENT) token 的 Transfer 事件");
        console.log("3. 记录下 Token ID");
        console.log("4. 访问: https://www.8004scan.io");
        console.log("5. 搜索你的钱包地址或 Token ID");
      }
      
    } else {
      console.log("❌ 此账户尚未注册任何 Agent");
      console.log("\n💡 可能的原因:");
      console.log("1. 注册交易可能失败了（检查交易状态）");
      console.log("2. 正在使用错误的网络（检查 Chain ID）");
      console.log("3. 正在使用错误的钱包地址");
      console.log("\n🔍 检查交易:");
      console.log("https://basescan.org/tx/0xb491118c879c5511de04fe1686aaf954a845ab0ed59104eaefa797d70f154d6c");
    }

  } catch (error: any) {
    console.error("❌ 查询失败:", error.message);
    console.log("\n💡 可能的原因:");
    console.log("1. 注册表合约不存在或地址错误");
    console.log("2. 网络配置错误");
    console.log("3. RPC 节点问题");
  }

  // 尝试从最近的交易中获取事件
  console.log("\n\n🔍 从交易中查询注册事件...\n");
  
  try {
    const tx = await ethers.provider.getTransaction(
      "0xb491118c879c5511de04fe1686aaf954a845ab0ed59104eaefa797d70f154d6c"
    );
    
    if (tx) {
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      
      console.log("交易详情:");
      console.log("- 状态:", receipt?.status === 1 ? "✅ 成功" : "❌ 失败");
      console.log("- 区块号:", receipt?.blockNumber);
      console.log("- Gas 使用:", receipt?.gasUsed.toString());
      console.log("- 日志数量:", receipt?.logs.length, "\n");
      
      if (receipt && receipt.logs.length > 0) {
        console.log("📋 交易日志:");
        
        for (let i = 0; i < receipt.logs.length; i++) {
          const log = receipt.logs[i];
          console.log(`\n日志 #${i + 1}:`);
          console.log("- 合约:", log.address);
          console.log("- Topics:", log.topics.length);
          
          // 尝试解析 AgentRegistered 事件
          try {
            const parsedLog = identityRegistry.interface.parseLog({
              topics: [...log.topics],
              data: log.data
            });
            
            if (parsedLog?.name === "AgentRegistered") {
              console.log("\n🎉 找到 AgentRegistered 事件!");
              console.log("=".repeat(80));
              console.log("Agent ID:", parsedLog.args[0]?.toString());
              console.log("所有者:", parsedLog.args[1]);
              console.log("元数据 URI:", parsedLog.args[2]);
              console.log(`\n🔗 查看你的 Agent:`);
              console.log(`https://www.8004scan.io/agents/${network.chainId}/${parsedLog.args[0]}`);
              console.log("=".repeat(80));
            }
          } catch (e) {
            // 无法解析该日志，继续下一个
          }
        }
      }
    }
  } catch (error: any) {
    console.log("⚠️  无法查询交易详情:", error.message);
  }
  
  console.log("\n✨ 查询完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
