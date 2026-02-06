# API 集成测试结果

## 测试时间
2026-02-06 19:23

## 测试环境
- 本地开发环境
- API 端口: 3100
- 前端端口: 3000/5173

---

## ✅ 后端 API 测试

### 1. 服务启动 ✅
```bash
npm run api
```

**结果：**
```
🚀 Mint 资格授予 API 服务已启动
📍 服务地址: http://localhost:3100
✅ 准备就绪，等待请求...
```

### 2. 健康检查 ✅
```bash
curl http://localhost:3100/health
```

**响应：**
```json
{
  "status": "ok",
  "timestamp": "2026-02-06T11:23:38.876Z",
  "service": "Mint Eligibility API"
}
```
✅ **状态：正常**

### 3. 统计信息 ✅
```bash
curl http://localhost:3100/api/stats
```

**响应：**
```json
{
  "success": true,
  "stats": {
    "totalEligible": 6,
    "remainingSlots": 1994,
    "maxSlots": 2000,
    "percentage": "0.30"
  }
}
```
✅ **数据正常：**
- 已授予 6 人 mint 资格
- 剩余 1994 个名额
- 已使用 0.30%

---

## 📋 下一步测试

### 步骤1：启动前端
在**新终端**运行：
```bash
npm run dev
```

或者重启，使用一键启动：
```bash
# 先停止当前 API 服务 (Ctrl+C)
# 然后运行
npm start
```

### 步骤2：测试完整流程

1. **打开浏览器**
   - 访问：`http://localhost:3000` 或 `http://localhost:5173`

2. **连接钱包**
   - 点击"连接钱包"按钮
   - 确保连接到 Base 主网

3. **发布第一篇帖子**
   - 输入帖子内容
   - 点击发布
   - ⚠️ 确保这是该钱包地址的**第一篇**帖子

4. **检查日志**
   
   **前端控制台应显示：**
   ```
   🎉 用户 0x... 发布第一篇帖子，准备授予mint资格
   ✅ 成功授予mint资格: 0x...
      交易哈希: 0x...
   ```
   
   **后端终端应显示：**
   ```
   📝 收到授予资格请求: 0x...
   🔄 正在授予资格: 0x...
   ✅ 交易已发送: 0x...
   🎉 授予资格成功: 0x...
   ⏱️ 请求处理时间: 3500ms
   ```

5. **验证资格**
   ```bash
   curl -X POST http://localhost:3100/api/check-eligibility \
     -H "Content-Type: application/json" \
     -d '{"addresses": ["你的钱包地址"]}'
   ```

### 步骤3：验证 Mint 功能

1. 在前端点击 "Mint Panel"
2. 应该显示"✅ 你有资格 Mint"
3. 点击 Mint 按钮
4. 支付 0.003 ETH
5. 确认交易
6. 成功后应获得 10000 SPARK 代币

---

## 🔍 预期行为

### ✅ 成功场景
- 第一次发帖的用户自动获得 mint 资格
- API 正常处理请求并返回交易哈希
- 前端显示成功消息

### ⚠️ 正常失败场景
1. **用户已有资格**
   ```json
   {
     "success": true,
     "message": "User already has eligibility",
     "alreadyEligible": true
   }
   ```

2. **名额已满**
   ```json
   {
     "success": false,
     "error": "No remaining slots (2000 limit reached)"
   }
   ```

3. **不是第一篇帖子**
   - 前端不会调用 API（逻辑正确）

---

## 🐛 故障排查

### API 无法启动
**问题：** 端口 3100 被占用
```bash
# 查找占用端口的进程
lsof -i :3100

# 杀死进程
kill -9 <PID>
```

### API 调用失败
**检查清单：**
- [ ] API 服务是否运行？
- [ ] 端口 3100 是否可访问？
- [ ] `.env.local` 是否配置了 `OWNER_PRIVATE_KEY`？
- [ ] 网络连接是否正常？

### 交易失败
**可能原因：**
1. Owner 钱包 ETH 余额不足（需要 gas）
2. 合约地址错误
3. RPC 节点不可用
4. 已达到 2000 人上限

**检查：**
```bash
# 查看 API 详细日志
# 查看后端终端输出

# 检查 Owner 余额
# 在区块浏览器查看 Owner 地址
```

---

## 📊 测试总结

### ✅ 已完成
- [x] 后端 API 服务启动
- [x] 健康检查通过
- [x] 统计信息正常
- [x] API 端点可访问

### 🔄 待测试
- [ ] 前端启动
- [ ] 前端调用 API
- [ ] 实际发帖授权流程
- [ ] Mint 功能验证

### 📈 当前状态
- **API 状态**: 🟢 运行中
- **已授予资格**: 6/2000
- **剩余名额**: 1994
- **使用率**: 0.30%

---

## 🎯 成功标准

如果以下都通过，说明集成成功：

1. ✅ API 服务稳定运行
2. ✅ 前端可以调用 API
3. ✅ 用户发第一篇帖子后自动获得资格
4. ✅ 区块链交易成功上链
5. ✅ 用户可以正常 Mint
6. ✅ 获得 10000 SPARK 代币

---

## 📝 注意事项

1. **测试账户准备**
   - 使用从未发过帖的新钱包地址
   - 确保有足够的 ETH 支付 gas 和 mint 费用

2. **环境配置**
   - 确保 `.env.local` 配置正确
   - API_URL 指向 localhost:3100
   - 合约地址正确

3. **网络要求**
   - 连接到 Base 主网
   - RPC 节点可用
   - Supabase 连接正常

---

**下一步：** 启动前端并测试完整的发帖授权流程
