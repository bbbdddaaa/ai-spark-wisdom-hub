# 项目启动指南

## 快速启动

本项目需要同时运行**前端**和**后端 API 服务**。

### 1. 环境配置

确保 `.env.local` 文件包含以下配置：

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 合约地址
VITE_MINT_CONTROLLER_ADDRESS=0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839

# Owner私钥（⚠️ 仅后端使用，不要泄露！）
OWNER_PRIVATE_KEY=0x...
PRIVATE_KEY=0x...

# API配置
API_PORT=3100
VITE_API_URL=http://localhost:3100

# 区块链RPC
BASE_RPC_URL=https://mainnet.base.org
```

### 2. 启动服务

#### 方式一：手动启动（推荐用于开发）

**终端 1 - 启动后端 API：**
```bash
npm run api
```

看到以下输出表示后端启动成功：
```
🚀 Mint 资格授予 API 服务已启动
📍 服务地址: http://localhost:3100
✅ 准备就绪，等待请求...
```

**终端 2 - 启动前端：**
```bash
npm run dev
```

前端会在 `http://localhost:5173` 启动。

#### 方式二：使用 PM2（推荐用于生产）

```bash
# 安装 PM2
npm install -g pm2

# 启动后端API（后台运行）
pm2 start backend-api.js --name "api-server"

# 启动前端
npm run dev

# 查看日志
pm2 logs api-server

# 停止服务
pm2 stop api-server
```

### 3. 验证服务

#### 检查后端健康状态：
```bash
curl http://localhost:3100/health
```

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "Mint Eligibility API"
}
```

#### 检查前端：
访问 `http://localhost:5173`，应该能看到应用界面。

## 工作流程

### 用户发布第一篇帖子时：

1. **前端** (`supabaseService.ts`)：
   - 检测到用户发布第一篇帖子
   - 调用后端API：`POST http://localhost:3100/api/grant-eligibility`

2. **后端** (`backend-api.js`)：
   - 验证用户地址
   - 检查链上资格（避免重复）
   - 验证发帖记录
   - 检查2000人限额
   - 调用智能合约授予资格
   - 返回结果给前端

3. **智能合约**：
   - Owner 签名授予用户 mint 资格
   - 交易上链确认

## API 端点

### POST /api/grant-eligibility
授予 mint 资格

**请求：**
```json
{
  "address": "0x..."
}
```

**响应：**
```json
{
  "success": true,
  "message": "Eligibility granted successfully",
  "txHash": "0x...",
  "duration": 3500,
  "slotsInfo": {
    "hasSlots": true,
    "count": 150,
    "remaining": 1850
  }
}
```

### POST /api/check-eligibility
批量检查资格

**请求：**
```json
{
  "addresses": ["0x...", "0x..."]
}
```

### GET /api/stats
获取统计信息

**响应：**
```json
{
  "success": true,
  "stats": {
    "totalEligible": 150,
    "remainingSlots": 1850,
    "maxSlots": 2000,
    "percentage": "7.50"
  }
}
```

## 常见问题

### Q: 为什么需要后端 API？
A: 因为授予 mint 资格需要使用 Owner 私钥签署区块链交易。私钥不能暴露在浏览器中，必须在服务端安全执行。

### Q: 可以只运行前端吗？
A: 可以，但用户发布帖子后不会自动获得 mint 资格。必须运行后端 API 才能授予资格。

### Q: 后端崩溃怎么办？
A: 使用 PM2 可以自动重启。前端会捕获 API 调用失败并记录日志，不会影响发帖功能。

### Q: 如何部署到生产环境？
A: 
1. 将 `backend-api.js` 部署到服务器（如 VPS、Railway、Render 等）
2. 设置环境变量，特别是 `OWNER_PRIVATE_KEY`
3. 更新前端的 `VITE_API_URL` 指向生产 API 地址
4. 使用 PM2 或 Docker 保持后端服务运行

## 安全提示

⚠️ **非常重要：**
- `OWNER_PRIVATE_KEY` 只能在服务端使用
- 不要将私钥提交到 Git
- 不要在前端代码中使用私钥
- 生产环境使用环境变量管理敏感信息
