# API 服务部署指南

本指南介绍如何将 Mint 资格授予 API 服务部署到 VPS 服务器。

## 📋 前提条件

- VPS 服务器（Ubuntu 20.04+ 推荐）
- Node.js 18+ 已安装
- PM2 进程管理器（推荐）
- Nginx（可选，用于反向代理）

## 🚀 快速部署

### 方法 1：自动部署（推荐）

```bash
# 在本地运行，自动部署到 VPS
./deploy-api.sh
```

### 方法 2：手动部署

#### 1. 上传文件到 VPS

```bash
# 压缩项目文件
tar -czf api-service.tar.gz backend-api.js .env.local package.json node_modules

# 上传到 VPS
scp api-service.tar.gz root@YOUR_VPS_IP:/root/

# 登录 VPS
ssh root@YOUR_VPS_IP

# 解压
cd /root
tar -xzf api-service.tar.gz
cd ai-spark-api
```

#### 2. 安装依赖（如果没有打包 node_modules）

```bash
npm install
```

#### 3. 配置环境变量

确保 `.env.local` 文件包含所有必要的环境变量：

```bash
cat .env.local
```

#### 4. 启动服务

**方法 A：使用 PM2（推荐）**

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start backend-api.js --name "mint-api"

# 查看状态
pm2 status

# 查看日志
pm2 logs mint-api

# 设置开机自启
pm2 startup
pm2 save
```

**方法 B：使用 systemd**

创建服务文件：

```bash
sudo nano /etc/systemd/system/mint-api.service
```

添加以下内容：

```ini
[Unit]
Description=Mint Eligibility API Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/ai-spark-api
ExecStart=/usr/bin/node backend-api.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl start mint-api
sudo systemctl enable mint-api
sudo systemctl status mint-api
```

#### 5. 配置 Nginx 反向代理（可选）

```bash
sudo nano /etc/nginx/sites-available/mint-api
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/mint-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. 配置 HTTPS（使用 Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## 🔧 更新前端配置

更新 `.env.local` 中的 API 地址：

```env
# 本地开发
VITE_API_URL=http://localhost:3100

# 生产环境
VITE_API_URL=https://api.yourdomain.com
```

重新构建前端：

```bash
npm run build
```

## 📊 监控和维护

### 查看日志

**使用 PM2：**
```bash
pm2 logs mint-api
pm2 logs mint-api --lines 100
```

**使用 systemd：**
```bash
sudo journalctl -u mint-api -f
sudo journalctl -u mint-api --since today
```

### 重启服务

**使用 PM2：**
```bash
pm2 restart mint-api
```

**使用 systemd：**
```bash
sudo systemctl restart mint-api
```

### 停止服务

**使用 PM2：**
```bash
pm2 stop mint-api
pm2 delete mint-api  # 完全删除
```

**使用 systemd：**
```bash
sudo systemctl stop mint-api
sudo systemctl disable mint-api  # 取消开机自启
```

## 🧪 测试 API

```bash
# 健康检查
curl http://localhost:3100/health

# 测试授予资格（替换为实际地址）
curl -X POST http://localhost:3100/api/grant-eligibility \
  -H "Content-Type: application/json" \
  -d '{"address":"0xYourAddress"}'

# 查看统计信息
curl http://localhost:3100/api/stats
```

## 🔒 安全建议

1. **防火墙配置**
   ```bash
   # 只允许必要的端口
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

2. **环境变量保护**
   - 确保 `.env.local` 权限为 600
   ```bash
   chmod 600 .env.local
   ```

3. **定期备份**
   ```bash
   # 备份环境变量
   cp .env.local .env.local.backup.$(date +%Y%m%d)
   ```

4. **监控资源使用**
   ```bash
   # 使用 PM2 监控
   pm2 monit
   ```

## 🐛 故障排查

### 问题 1：服务无法启动

```bash
# 检查日志
pm2 logs mint-api --err

# 检查环境变量
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.PRIVATE_KEY ? 'OK' : 'Missing')"
```

### 问题 2：API 调用失败

```bash
# 检查防火墙
sudo ufw status

# 检查端口占用
netstat -tlnp | grep 3100

# 测试本地连接
curl http://localhost:3100/health
```

### 问题 3：交易失败

```bash
# 检查钱包余额
# 检查 RPC 连接
# 查看详细错误日志
```

## 📞 技术支持

如有问题，请查看：
- API 日志：`pm2 logs mint-api`
- 前端控制台
- BaseScan 交易记录

## 🔄 更新服务

```bash
# 备份当前版本
cp backend-api.js backend-api.js.backup

# 上传新版本
scp backend-api.js root@YOUR_VPS_IP:/root/ai-spark-api/

# 重启服务
pm2 restart mint-api

# 或
sudo systemctl restart mint-api
```

## ✅ 部署检查清单

- [ ] VPS 已配置 Node.js 18+
- [ ] 已上传所有必要文件
- [ ] `.env.local` 已正确配置
- [ ] API 服务已启动并运行
- [ ] 健康检查通过
- [ ] 防火墙已配置
- [ ] Nginx 反向代理已配置（可选）
- [ ] HTTPS 证书已配置（可选）
- [ ] 前端 `VITE_API_URL` 已更新
- [ ] 测试发帖 → 自动授予资格流程

---

**恭喜！** 你的 API 服务已成功部署！ 🎉
