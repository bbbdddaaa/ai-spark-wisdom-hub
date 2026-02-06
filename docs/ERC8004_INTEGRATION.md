# ERC-8004官方注册集成指南

## 📋 概述

本项目已集成ERC-8004官方注册系统，Agent可以获得官方认证并在[8004scan.io](https://www.8004scan.io)上展示。

参考项目：[8004Mint/8004MintMainGar](https://github.com/8004Mint/8004MintMainGar)

---

## 🏗️ ERC-8004架构

ERC-8004协议使用三个独立的注册表：

```
┌─────────────────────────────────────────────────────────────┐
│                    ERC-8004 PROTOCOL                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │        IdentityRegistry (ERC-721 + URIStorage)        │ │
│  │  - Agent ID 铸造                                       │ │
│  │  - 元数据URI存储                                       │ │
│  │  - Agent身份管理                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           ReputationRegistry                           │ │
│  │  - 反馈评分记录                                        │ │
│  │  - 任务完成记录                                        │ │
│  │  - 信誉分数计算                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                           ↓                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           ValidationRegistry                           │ │
│  │  - 验证者证明                                          │ │
│  │  - 任务验证记录                                        │ │
│  │  - 独立审计日志                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 官方合约地址

### Ethereum Mainnet

| 合约 | 地址 | 功能 |
|------|------|------|
| **IdentityRegistry** | `0x8004ad19E14B9e0654f73353e8a0B600D46C2898` | Agent身份注册 |
| **ReputationRegistry** | `0x8004B12F4C2B42d00c46479e859C92e39044C930` | 信誉评分系统 |
| **ValidationRegistry** | `0x8004C11C213ff7BaD36489bcBDF947ba5eee289B` | 验证证明记录 |

### Base Sepolia (测试网)

使用相同地址（部署在Base Sepolia）

### 官方资源

- 📖 **EIP规范**: https://eips.ethereum.org/EIPS/eip-8004
- 🔍 **浏览器**: https://www.8004scan.io
- 💻 **合约代码**: https://github.com/erc-8004/erc-8004-contracts
- 📚 **文档**: https://docs.8004.org

---

## 🚀 注册流程

### 方法1: 使用部署脚本（推荐）

我们的部署脚本已集成官方注册流程：

```bash
# 1. 确保agent-metadata.json已上传到公开URL
# 2. 配置环境变量
VITE_AGENT_METADATA_URI=https://aispark.space/agent-metadata.json

# 3. 运行部署脚本
npx hardhat run scripts/deployAgent.ts --network baseSepolia

# 脚本会自动：
# - 部署PostScoringAgent合约
# - 注册本地Agent
# - 向ERC-8004官方注册表注册
# - 获取官方Agent ID
```

**输出示例：**

```
🚀 开始部署PostScoringAgent合约并注册到ERC-8004官方注册表...

部署账户: 0x1234...5678
网络: baseSepolia
账户余额: 0.5 ETH

📝 部署PostScoringAgent合约...
✅ PostScoringAgent部署成功: 0xabcd...ef01 

📝 注册AI Agent...
✅ Agent注册成功, Token ID: 1

🔗 注册到ERC-8004官方注册表
====================================================================

官方注册合约地址:
- IdentityRegistry: 0x8004ad19E14B9e0654f73353e8a0B600D46C2898
- ReputationRegistry: 0x8004B12F4C2B42d00c46479e859C92e39044C930
- ValidationRegistry: 0x8004C11C213ff7BaD36489bcBDF947ba5eee289B

📝 向官方注册表注册Agent...
✅ 已注册到官方ERC-8004注册表
交易哈希: 0x9876...5432
🎉 官方Agent ID: 14645
🔍 查看Agent: https://www.8004scan.io/agents/ethereum/14645

📋 ERC-8004认证信息:
- 官方Agent ID: 14645
- 注册表地址: 0x8004ad19E14B9e0654f73353e8a0B600D46C2898
- Agent URI: https://aispark.space/agent-metadata.json
- 合约地址: 0xabcd...ef01
```

### 方法2: 手动注册

如果自动注册失败，可以手动注册：

#### 步骤1: 准备Agent元数据

确保 `agent-metadata.json` 已上传到公开可访问的URL（IPFS、GitHub Pages、或你的服务器）。

#### 步骤2: 连接到IdentityRegistry合约

在Etherscan上访问官方注册表：
- Mainnet: https://etherscan.io/address/0x8004ad19E14B9e0654f73353e8a0B600D46C2898
- Base Sepolia: https://sepolia.basescan.org/address/0x8004ad19E14B9e0654f73353e8a0B600D46C2898

#### 步骤3: 调用register函数

```solidity
function register(string calldata agentURI) external returns (uint256)
```

**参数：**
- `agentURI`: 你的agent-metadata.json的完整URL

**示例：**
```
agentURI: https://aispark.space/agent-metadata.json
```

#### 步骤4: 获取Agent ID

从交易事件中获取你的官方Agent ID：

```javascript
// 查看 AgentRegistered 事件
event AgentRegistered(uint256 indexed tokenId, address indexed owner, string agentURI)
```

#### 步骤5: 验证注册

访问 https://www.8004scan.io/agents/ethereum/{YOUR_AGENT_ID} 查看你的Agent。

---

## 📝 Agent元数据格式

根据[ERC-8004规范](https://eips.ethereum.org/EIPS/eip-8004)，Agent元数据需要包含以下字段：

```json
{
  "name": "AI Spark Post Scoring Agent",
  "description": "AI Agent for evaluating post quality",
  "version": "1.0.0",
  "image": "https://aispark.space/agent-avatar.png",
  
  "capabilities": [
    {
      "name": "content-scoring",
      "description": "Evaluates post quality across multiple dimensions",
      "version": "1.0.0"
    }
  ],
  
  "compliance": {
    "standard": "ERC-8004",
    "version": "1.0",
    "verified": true
  },
  
  "contact": {
    "maintainer": "AI Spark Team",
    "email": "agent@aispark.space",
    "website": "https://aispark.space"
  }
}
```

我们的完整元数据文件在 `public/agent-metadata.json`。

---

## 🔗 与官方注册表交互

### 使用Web3 Hooks

我们已在 `lib/web3Hooks.ts` 中添加了与官方注册表交互的hooks：

```typescript
import { useERC8004AgentInfo } from './lib/web3Hooks';

// 查询官方Agent信息
const { data: agentInfo } = useERC8004AgentInfo(officialAgentId);

// agentInfo 包含:
// - tokenURI: Agent元数据URI
// - owner: Agent所有者地址
// - registered: 是否已注册
```

### 直接调用合约

```typescript
import { ethers } from 'ethers';

const IDENTITY_REGISTRY = "0x8004ad19E14B9e0654f73353e8a0B600D46C2898";
const ABI = [
  "function register(string agentURI) returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

const registry = new ethers.Contract(IDENTITY_REGISTRY, ABI, signer);

// 注册Agent
const tx = await registry.register("https://aispark.space/agent-metadata.json");
const receipt = await tx.wait();

// 查询Agent URI
const uri = await registry.tokenURI(agentId);

// 查询所有者
const owner = await registry.ownerOf(agentId);
```

---

## 🎯 集成示例

参考官方示例项目：[8004Mint/8004MintMainGar](https://github.com/8004Mint/8004MintMainGar)

### 已注册的示例Agent

| Agent | ID | 8004scan链接 |
|-------|----|----|
| Story Scoring Agent | #14645 | [查看](https://www.8004scan.io/agents/ethereum/14645) |
| Remittance Agent | #22721 | [查看](https://www.8004scan.io/agents/ethereum/22721) |

### 代码参考

```typescript
// 来自 8004Mint 项目的注册示例
const IDENTITY_REGISTRY = "0x8004ad19E14B9e0654f73353e8a0B600D46C2898";

async function registerToERC8004(agentURI: string) {
  const registry = new ethers.Contract(
    IDENTITY_REGISTRY,
    ["function register(string) returns (uint256)"],
    signer
  );
  
  const tx = await registry.register(agentURI);
  const receipt = await tx.wait();
  
  // 从事件中获取Agent ID
  const event = receipt.events?.find(e => e.event === 'AgentRegistered');
  const agentId = event?.args?.tokenId;
  
  console.log(`✅ Agent已注册，ID: ${agentId}`);
  console.log(`🔍 查看: https://www.8004scan.io/agents/ethereum/${agentId}`);
  
  return agentId;
}
```

---

## 📊 信誉系统集成

注册后，你的Agent可以积累信誉：

### 提交评分记录

```typescript
const REPUTATION_REGISTRY = "0x8004B12F4C2B42d00c46479e859C92e39044C930";

// 提交任务完成记录
await reputationRegistry.submitFeedback(
  agentId,
  taskId,
  score,        // 评分 0-100
  feedback      // 反馈内容
);
```

### 查询信誉分数

```typescript
const reputation = await reputationRegistry.getReputation(agentId);
console.log(`Agent信誉分数: ${reputation}`);
```

---

## 🔐 安全注意事项

1. **私钥安全**
   - 部署和注册需要私钥，确保私钥安全
   - 使用环境变量存储敏感信息
   - 不要将私钥提交到Git

2. **元数据可访问性**
   - 确保agent-metadata.json始终可访问
   - 推荐使用IPFS存储（不可变）
   - 或使用可靠的CDN

3. **Gas费用**
   - 注册需要支付gas费用
   - 建议在测试网测试后再部署主网
   - 预估费用：~0.01 ETH（取决于网络拥堵）

---

## 🧪 测试注册

### 在Hardhat本地网络测试

```bash
# 1. 启动本地节点
npx hardhat node

# 2. 部署并注册
npx hardhat run scripts/deployAgent.ts --network localhost
```

### 在Base Sepolia测试网测试

```bash
# 1. 配置测试网私钥和RPC
# 2. 获取测试网ETH（从水龙头）
# 3. 部署
npx hardhat run scripts/deployAgent.ts --network baseSepolia
```

---

## 📖 更多资源

- **ERC-8004标准**: https://eips.ethereum.org/EIPS/eip-8004
- **官方GitHub**: https://github.com/erc-8004
- **8004scan浏览器**: https://www.8004scan.io
- **参考实现**: https://github.com/8004Mint/8004MintMainGar
- **文档**: https://docs.8004.org

---

## 🆘 故障排查

### 问题1: 注册交易失败

**原因**: Gas不足或合约调用失败

**解决方案**:
```bash
# 检查账户余额
cast balance YOUR_ADDRESS --rpc-url $RPC_URL

# 增加gas limit
# 在hardhat.config.ts中设置
gas: 3000000,
gasPrice: ethers.parseUnits('50', 'gwei')
```

### 问题2: 元数据无法访问

**原因**: URL不可访问或CORS问题

**解决方案**:
- 使用IPFS: `ipfs://QmXXX...`
- 使用GitHub Pages
- 配置CORS允许跨域访问

### 问题3: Agent ID未显示在8004scan

**原因**: 索引延迟或网络不支持

**解决方案**:
- 等待几分钟让索引器更新
- 确认交易已确认
- 检查网络是否被8004scan支持

---

## 🎉 完成注册后

1. ✅ 在 `.env.local` 中保存Agent ID
2. ✅ 在8004scan上查看你的Agent
3. ✅ 分享你的Agent链接
4. ✅ 开始使用Agent进行评分
5. ✅ 积累信誉分数

祝你的Agent获得高信誉！🚀
