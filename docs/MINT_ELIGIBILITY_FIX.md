# Mint 资格授予问题修复报告

## 问题描述

用户反馈：成功发布文章后，没有自动获得 mint 权限。

## 问题诊断结果

### 1. 根本原因

发现了以下几个关键问题导致自动授权失败：

#### ❌ 问题 1: 环境变量配置缺失

**位置**: `.env.local` 文件

- 缺少 `OWNER_PRIVATE_KEY` 环境变量（授权服务需要用这个私钥来调用合约）
- 缺少 `VITE_MINT_CONTROLLER_ADDRESS` 环境变量（授权服务需要知道合约地址）

**影响**: 导致授权服务无法初始化，无法调用智能合约授予资格。

#### ❌ 问题 2: 链配置错误

**位置**: `services/mintEligibilitySimpleSync.ts`

```typescript
// 错误配置
import { baseSepolia } from 'viem/chains';  // 使用测试链
chain: baseSepolia,  // 配置为测试链
```

但实际合约部署在 Base 主网 (`0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839`)。

**影响**: 授权服务连接到错误的区块链网络，无法找到合约。

## 修复方案

### 1. 修复环境变量配置

**文件**: `.env.local`

添加了以下配置：

```bash
# Owner 私钥（用于授予 mint 资格）
OWNER_PRIVATE_KEY=29f5ea337f04270b684cf520281763e754ab6e4874cb499c

# Mint Controller 合约地址
VITE_MINT_CONTROLLER_ADDRESS=0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839
```

### 2. 修复链配置

**文件**: `services/mintEligibilitySimpleSync.ts`

```typescript
// 修复前
import { baseSepolia } from 'viem/chains';
chain: baseSepolia,

// 修复后
import { base } from 'viem/chains';
chain: base,
```

同时更新了配置读取逻辑：

```typescript
// 支持多种环境变量命名
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
const MINT_CONTROLLER_ADDRESS = (process.env.VITE_MINT_CONTROLLER_ADDRESS || '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839') as `0x${string}`;
const RPC_URL = process.env.BASE_RPC_URL || process.env.VITE_RPC_URL || 'https://mainnet.base.org';
```

## 验证结果

### 测试地址
`0x38783e1fa0e5d082a221ad81d35e129fd55d19f0`

### 修复后查询结果

```
✓ 是否有 Mint 资格 (isEligible): ✅ 是
✓ 是否已经 Mint 过 (hasMinted): ❌ 否
✓ Mint 次数 (mintCount): 0
✓ 当前可以 Mint (canMint): ✅ 是

🎉 该钱包地址有 Mint 权限，可以进行 Mint 操作！
Mint 成本: 0.003 ETH
Mint 奖励: 10,000 SPARK
```

### 合约状态验证

- ✅ 当前使用账户 (`0xA0aaC49FcF8066D370544C14F3d99959e0541503`) 是合约 Owner
- ✅ 已 Mint 用户数: 1 / 2000（还有大量名额）
- ✅ 授权功能正常工作

## 自动授权逻辑说明

### 触发条件

当用户发布文章后，系统会自动检查并授予 mint 资格：

1. **触发位置**: `services/supabaseService.ts` 的 `createPost` 函数
2. **检查条件**: 
   - 用户的 `post_count == 1`（第一篇帖子）
   - 前 2000 名用户
3. **授权方式**: 调用 `services/mintEligibilitySimpleSync.ts` 中的 `checkAndGrantEligibilityAfterPost` 函数

### 工作流程

```
用户发布文章
  ↓
posts 表插入新记录
  ↓
触发器自动更新 users.post_count
  ↓
如果 post_count == 1
  ↓
调用 checkAndGrantEligibilityAfterPost
  ↓
调用智能合约 grantEligibility
  ↓
用户获得 mint 资格
```

### 数据库触发器

确保已执行 `DATABASE_MIGRATION.sql` 中的触发器：

```sql
-- 自动更新 post_count
CREATE TRIGGER trigger_update_user_post_count_insert
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_post_count();
```

## 诊断工具

项目中已添加了诊断和测试工具：

### 1. 查询 Mint 权限
```bash
npx ts-node scripts/check-mint-eligibility.ts <钱包地址>
```

### 2. 诊断授权问题
```bash
npx ts-node scripts/diagnose-mint-eligibility.ts
```

### 3. 手动授予资格
```bash
# 修改 scripts/grant-eligibility.ts 中的地址，然后运行
npx hardhat run scripts/grant-eligibility.ts --network base
```

### 4. 检查合约配置
```bash
npx hardhat run scripts/check-contract-owner.ts --network base
```

## 注意事项

1. **私钥安全**: `OWNER_PRIVATE_KEY` 非常敏感，切勿泄露或提交到 Git
2. **环境配置**: 部署到生产环境时，确保在 Vercel 等平台配置相同的环境变量
3. **Gas 费用**: Owner 账户需要有足够的 ETH 余额来支付授权交易的 Gas 费
4. **名额限制**: 系统最多支持 2000 个用户获得 mint 资格

## 后续建议

1. **监控日志**: 建议添加日志监控，及时发现授权失败的情况
2. **重试机制**: 如果授权交易失败，可以添加重试逻辑
3. **告警通知**: 可以配置 Discord/Telegram 告警，当授权失败时通知管理员
4. **批量补偿**: 如果有用户在修复前发布了文章但没有获得资格，可以使用 `scripts/batch-grant-eligibility.ts` 批量授予

## 修复时间

- 问题发现: 2026-02-06
- 修复完成: 2026-02-06
- 验证通过: 2026-02-06

---

**状态**: ✅ 已修复并验证
**影响范围**: 发布文章后的自动授权功能
**解决方案**: 环境变量配置 + 链配置修复
