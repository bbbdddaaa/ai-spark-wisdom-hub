# 🚀 区块链功能快速启动指南

## 第一步：配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑.env文件，填入以下信息：
```

```env
# Supabase配置（已有）
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key

# 区块链配置（新增）
PRIVATE_KEY=your-wallet-private-key-for-deployment
SEPOLIA_RPC_URL=https://rpc.sepolia.org
MAINNET_RPC_URL=https://eth.llamarpc.com
ETHERSCAN_API_KEY=your-etherscan-api-key
```

## 第二步：执行数据库迁移

1. 登录Supabase控制台
2. 进入SQL Editor
3. 复制`DATABASE_MIGRATION.sql`的全部内容
4. 粘贴并执行

✅ 完成后会创建4个新表和多个触发器

## 第三步：部署智能合约（测试网）

```bash
# 1. 编译合约
npx hardhat compile

# 2. 部署到Sepolia测试网
npx hardhat run scripts/deploy.ts --network sepolia

# 3. 记录输出的合约地址
```

部署完成后会输出类似：
```
SparkToken: 0x1234...
MintController: 0x5678...
MembershipManager: 0x9abc...
RewardPool: 0xdef0...
```

## 第四步：更新.env文件

将上面的合约地址填入`.env`：
```env
VITE_SPARK_TOKEN_ADDRESS=0x1234...
VITE_MINT_CONTROLLER_ADDRESS=0x5678...
VITE_MEMBERSHIP_MANAGER_ADDRESS=0x9abc...
VITE_REWARD_POOL_ADDRESS=0xdef0...
VITE_USDT_ADDRESS=0x... (测试网USDT地址)
```

## 第五步：启动应用

```bash
npm install
npm run dev
```

## 第六步：测试功能

### 本地测试：给钱包领测试 USDT

使用 **MockUSDT** 时（本地或测试网），可以用下面方式给「测试钱包」加 USDT：

**方式一：命令行领水（推荐）**

1. 确保 `.env` 里已配置 `VITE_USDT_ADDRESS`（部署脚本输出的 MockUSDT 地址）。
2. 本地链：先启动 `npx hardhat node`，再在**另一个终端**执行：
   ```bash
   FAUCET_TO=0x你的MetaMask钱包地址 npx hardhat run scripts/faucet-usdt.ts --network localhost
   ```
3. Sepolia：部署好合约后执行：
   ```bash
   FAUCET_TO=0x你的钱包地址 npx hardhat run scripts/faucet-usdt.ts --network sepolia
   ```
每次执行会给 `FAUCET_TO` 地址 **100 USDT**，可多次执行。不设 `FAUCET_TO` 时，会发给部署账户（`PRIVATE_KEY` 对应地址）。

**方式二：用部署账户测试**

部署时用的账户（`.env` 里 `PRIVATE_KEY`）在部署完成后已经拥有 **100 万 Mock USDT**。若用同一账户在 MetaMask 里连接本地/Sepolia，无需领水即可直接测试 Mint/会员。

### 测试Mint功能

1. 连接MetaMask到Sepolia测试网（或本地 localhost:8545）
2. 获取测试ETH：本地用 Hardhat 默认账户；Sepolia 用 https://sepoliafaucet.com/
3. 按上面步骤给测试钱包领 USDT（仅 MockUSDT 需要）
4. 发布一篇内容（成为前2000名）
5. 查看是否显示Mint按钮
6. 点击Mint，批准USDT并执行

### 测试会员功能

1. 批准10 USDT给MembershipManager
2. 点击购买会员
3. 确认交易
4. 查看会员状态

### 测试每周排名

1. 等待周日23:59执行排名计算
2. 或手动调用：
```typescript
import { weeklyRankingCronJob } from './services/weeklyRankingService';
await weeklyRankingCronJob();
```
3. 查看排名榜单
4. 领取奖励

## 📋 核心功能清单

✅ 智能合约
- [x] SparkToken (ERC-20)
- [x] MintController
- [x] MembershipManager
- [x] RewardPool

✅ 数据库
- [x] 新增4张表
- [x] 更新users表字段
- [x] 创建触发器

✅ 后端服务
- [x] Mint资格追踪
- [x] 每周排名计算
- [x] 回购机制

✅ Web3集成
- [x] Wagmi配置
- [x] 合约Hooks
- [x] 钱包连接

## 🔧 定时任务设置

使用Vercel Cron Jobs（推荐）：

1. 创建`api/cron/weekly-ranking.ts`：
```typescript
import { weeklyRankingCronJob } from '../../services/weeklyRankingService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const result = await weeklyRankingCronJob();
  return res.status(200).json(result);
}
```

2. 在`vercel.json`中配置：
```json
{
  "crons": [{
    "path": "/api/cron/weekly-ranking",
    "schedule": "59 23 * * 0"
  }, {
    "path": "/api/cron/buyback-check",
    "schedule": "0 0 * * *"
  }]
}
```

## ⚠️ 注意事项

### 安全
- 🔐 永远不要提交`.env`文件
- 🔐 私钥必须保密
- 🔐 主网部署前进行审计

### Gas费用
- ⛽ 测试网：免费但需要测试ETH
- ⛽ 主网：需要真实ETH支付Gas

### 用户体验
- 📱 需要安装MetaMask
- ⏱️ 交易需要等待确认
- 💡 提供清晰的交互引导

## 🆘 常见问题

### Q: 编译失败
A: 检查Node.js版本，确保使用v16+

### Q: 部署失败
A: 
1. 检查钱包是否有足够ETH
2. 检查RPC连接是否正常
3. 检查PRIVATE_KEY格式（不要包含0x前缀）

### Q: MetaMask连接失败
A: 确保网络ID正确（Sepolia: 11155111, Mainnet: 1）

### Q: 交易失败
A: 检查Gas limit，可能需要增加

## 📚 相关文档

- 详细实施总结：`BLOCKCHAIN_IMPLEMENTATION_SUMMARY.md`
- 数据库迁移：`DATABASE_MIGRATION.sql`
- 部署脚本：`scripts/deploy.ts`

---

**准备好了吗？开始启动吧！🎉**
