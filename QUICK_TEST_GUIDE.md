# 🚀 快速测试指南

## ✅ 已完成的内容

1. ✅ 修复了经济模型逻辑
   - 移除发帖自动奖励
   - 移除初始代币奖励
   
2. ✅ 创建了3个新UI组件
   - MintPanel（Mint功能）
   - MembershipPanel（会员系统）
   - WeeklyRankingPanel（每周排名）

3. ✅ 集成到主应用
   - 添加了导航选项卡
   - 添加了快捷入口

---

## 🎯 现在可以做什么

### 方案A: 本地开发测试（推荐）

#### 1. 启动开发服务器
```bash
npm run dev
```

#### 2. 在浏览器中测试UI
- 访问 `http://localhost:5173`
- 连接钱包（会显示余额为0）
- 发布内容（不会获得代币）
- 查看Mint、会员、排名页面的UI

**注意：** 此时智能合约功能不可用，但可以测试UI和用户体验。

---

### 方案B: 部署到测试网并完整测试

#### 第1步：执行数据库迁移
在Supabase Dashboard中依次执行：

1. **DATABASE_MIGRATION.sql**
   ```sql
   -- 添加新表和字段
   -- 创建触发器（自动授予前2000名mint资格）
   ```

2. **DATABASE_RANKING_FUNCTION.sql**
   ```sql
   -- 创建排名查询函数
   ```

#### 第2步：部署智能合约
```bash
# 1. 确保钱包有Sepolia测试ETH
# 获取测试ETH: https://sepoliafaucet.com/

# 2. 编译合约
npx hardhat compile

# 3. 部署到Sepolia测试网
npx hardhat run scripts/deploy.ts --network sepolia

# 4. 记录下输出的合约地址
# 示例输出：
# USDT: 0x...
# SparkToken: 0x...
# RewardPool: 0x...
# MintController: 0x...
# MembershipManager: 0x...
```

#### 第3步：更新环境变量
在 `.env.local` 中填写合约地址：
```env
VITE_USDT_ADDRESS=0x...
VITE_SPARK_TOKEN_ADDRESS=0x...
VITE_REWARD_POOL_ADDRESS=0x...
VITE_MINT_CONTROLLER_ADDRESS=0x...
VITE_MEMBERSHIP_MANAGER_ADDRESS=0x...
```

#### 第4步：重启开发服务器
```bash
# Ctrl+C 停止当前服务器
npm run dev
```

#### 第5步：获取测试USDT
```bash
# 在Hardhat控制台中
npx hardhat console --network sepolia

# 执行命令
const MockUSDT = await ethers.getContractFactory("MockUSDT");
const usdt = await MockUSDT.attach("你的USDT合约地址");
await usdt.faucet("你的钱包地址");
```

或者使用Web界面调用faucet函数。

#### 第6步：完整测试流程

##### 测试1: Mint功能
1. 连接钱包（余额显示0）
2. 发布一篇内容
3. 检查数据库：`is_eligible_for_mint`应该为`true`
4. 点击"Mint"选项卡
5. 查看mint状态和剩余名额
6. 点击"授权USDT"并确认交易
7. 点击"Mint 10,000 SPARK"并确认交易
8. 等待交易确认
9. 检查余额：应该增加10,000 SPARK

##### 测试2: 发帖不再获得奖励
1. 发布多篇内容
2. 检查余额：不应该自动增加（除非mint）
3. 检查交易记录：不应该有发帖奖励记录

##### 测试3: 会员系统
1. 点击"会员"选项卡
2. 查看会员状态（未激活）
3. 点击"授权USDT"并确认交易
4. 点击"购买会员"并确认交易
5. 查看会员状态：应该显示"已激活"和剩余天数

##### 测试4: 每周排名
1. 点击"排名"选项卡
2. 查看本周排名（应该为空，因为是新数据）
3. 让其他测试账户也发布内容并互相点赞
4. 刷新页面，查看排名更新
5. （需要等到下周一）查看上周奖励并领取

---

## 📊 测试检查清单

### 核心功能
- [ ] 连接钱包显示余额为0
- [ ] 发布内容不自动获得代币
- [ ] 前2000名获得mint资格
- [ ] Mint操作正常（支付USDT获得SPARK）
- [ ] 会员购买正常
- [ ] 排名显示正常

### UI测试
- [ ] 桌面端导航显示正常
- [ ] 移动端导航显示正常
- [ ] Mint页面UI完整
- [ ] 会员页面UI完整
- [ ] 排名页面UI完整
- [ ] Toast提示显示正常
- [ ] Loading状态显示正常

### 数据库
- [ ] users表新字段存在
- [ ] 新表（mint_records、memberships等）存在
- [ ] 触发器正常工作
- [ ] 排名函数正常工作

---

## 🐛 常见问题

### 问题1: 合约交互失败
**原因：** 合约地址未配置或网络不匹配

**解决：**
1. 检查`.env.local`中的合约地址是否正确
2. 确保MetaMask切换到Sepolia测试网
3. 重启开发服务器

### 问题2: USDT余额不足
**原因：** 没有测试USDT

**解决：**
```bash
# 使用MockUSDT的faucet函数获取测试USDT
npx hardhat console --network sepolia
const usdt = await ethers.getContractAt("MockUSDT", "USDT合约地址");
await usdt.faucet("你的地址");
```

### 问题3: 授权失败
**原因：** Gas费用不足或交易被拒绝

**解决：**
1. 确保钱包有足够的Sepolia ETH
2. 检查MetaMask是否弹出授权窗口
3. 增加Gas limit

### 问题4: 数据库触发器不工作
**原因：** SQL脚本未正确执行

**解决：**
1. 在Supabase Dashboard中重新执行`DATABASE_MIGRATION.sql`
2. 检查触发器是否创建成功：
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%mint%';
```

---

## 📚 相关文档

- `NEW_ECONOMY_IMPLEMENTATION.md` - 详细的实现说明
- `QUICK_START_BLOCKCHAIN.md` - 区块链部署指南
- `DATABASE_MIGRATION.sql` - 数据库迁移脚本
- `DATABASE_RANKING_FUNCTION.sql` - 排名查询函数

---

## 🎉 成功标志

当你看到以下现象时，说明一切正常：

1. ✅ 连接钱包后余额为0（不是20）
2. ✅ 发布内容后不会自动增加代币
3. ✅ 发布内容后显示"获得mint资格"提示
4. ✅ Mint页面可以看到剩余名额
5. ✅ 可以成功mint并获得10,000 SPARK
6. ✅ 可以成功购买会员
7. ✅ 可以查看每周排名

---

## 🚀 下一步

完成测试后，你可以：

1. **部署到主网**
   - 审计智能合约
   - 准备真实的USDT
   - 部署到Ethereum Mainnet

2. **实现后端服务**
   - 每周排名计算cron job
   - 自动回购服务
   - 奖励分发服务

3. **优化用户体验**
   - 添加更多动画效果
   - 优化移动端体验
   - 添加更详细的教程

---

**祝测试顺利！** 🎊

如果遇到任何问题，请查看控制台错误信息，或者查阅相关文档。
