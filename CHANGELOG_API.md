# API 服务改动说明

## 改动时间
2026-02-06

## 改动内容

### 1. 架构优化
**问题**：之前的授权 mint 资格逻辑直接在前端调用，但由于需要私钥签名区块链交易，在浏览器中无法正常工作。

**解决方案**：改为前端调用后端 API 的架构。

### 2. 文件改动

#### ✅ 新增文件
- `backend-api.js`（从 archive 移出）- Express API 服务
- `START_GUIDE.md` - 完整的启动指南

#### ✅ 修改文件
- `services/supabaseService.ts`
  - 删除直接调用 `grantMintEligibility` 的代码
  - 改为调用后端 API：`POST /api/grant-eligibility`
  - 使用 `VITE_API_URL` 环境变量配置 API 地址

- `package.json`
  - 添加 `start` 脚本：同时启动前后端
  - 安装 `concurrently` 依赖

### 3. 新的启动方式

#### 方式 1：一键启动（推荐）
```bash
npm start
```
同时启动前端和后端 API 服务。

#### 方式 2：分别启动
```bash
# 终端1：启动后端
npm run api

# 终端2：启动前端
npm run dev
```

### 4. 环境变量
确保 `.env.local` 包含：
```bash
# API配置
API_PORT=3100
VITE_API_URL=http://localhost:3100

# Owner私钥（仅后端使用）
OWNER_PRIVATE_KEY=0x...
PRIVATE_KEY=0x...
```

### 5. 工作流程

```
用户发布第一篇帖子
    ↓
前端检测 (supabaseService.ts)
    ↓
调用 POST /api/grant-eligibility
    ↓
后端 API (backend-api.js)
    ├─ 验证地址
    ├─ 检查链上资格
    ├─ 验证发帖记录
    ├─ 检查2000人限额
    └─ 调用智能合约授予资格
    ↓
返回结果给前端
```

### 6. API 端点

- `GET /health` - 健康检查
- `POST /api/grant-eligibility` - 授予 mint 资格
- `POST /api/check-eligibility` - 批量检查资格
- `GET /api/stats` - 获取统计信息

### 7. 优势

✅ **安全性**：私钥只在服务端使用，不会暴露给浏览器  
✅ **可靠性**：后端可以重试失败的交易  
✅ **可维护性**：前后端逻辑分离，易于调试  
✅ **可扩展性**：可以添加更多 API 功能（告警、监控等）

### 8. 注意事项

⚠️ **必须运行后端 API**：否则用户发帖后不会自动获得 mint 资格  
⚠️ **私钥安全**：`OWNER_PRIVATE_KEY` 只能在服务端使用，不要提交到代码仓库  
⚠️ **环境变量**：生产环境需要更新 `VITE_API_URL` 为实际的 API 地址

## 测试步骤

1. **启动服务**
   ```bash
   npm start
   ```

2. **验证后端**
   ```bash
   curl http://localhost:3100/health
   ```

3. **测试发帖授权**
   - 连接钱包
   - 发布第一篇帖子
   - 查看控制台日志，应该看到授权成功的消息

4. **查看统计**
   ```bash
   curl http://localhost:3100/api/stats
   ```

## 常见问题

**Q: 为什么不用监听服务 (sync:service)？**  
A: 监听服务需要持续运行，而 API 服务更灵活，只在需要时处理请求。

**Q: API 服务崩溃怎么办？**  
A: 使用 PM2 自动重启，或使用容器化部署（Docker）。

**Q: 生产环境怎么部署？**  
A: 参考 `START_GUIDE.md` 的生产部署章节。
