# 手动修复域名配置

## 快速修复步骤

### 步骤 1: SSH 到服务器
```bash
ssh root@72.62.249.168
```

### 步骤 2: 编辑 Nginx 配置
```bash
nano /etc/nginx/sites-available/ai-spark
```

### 步骤 3: 修改 server_name
找到这一行：
```nginx
server_name 72.62.249.168;
```

改为：
```nginx
server_name aispark.space www.aispark.space;
```

保存并退出（Ctrl+X，然后按 Y，再按 Enter）

### 步骤 4: 测试并重启 Nginx
```bash
nginx -t
systemctl restart nginx
```

### 步骤 5: 测试访问
```bash
curl -I http://aispark.space
```

应该能看到 HTTP 200 响应

---

## 完整配置（包含 HTTPS）

如果你想要 HTTPS，继续执行：

### 安装 Certbot
```bash
apt update
apt install -y certbot python3-certbot-nginx
```

### 获取 SSL 证书
```bash
certbot --nginx -d aispark.space -d www.aispark.space
```

按提示输入邮箱，同意条款即可。Certbot 会自动：
- 获取 SSL 证书
- 修改 Nginx 配置
- 设置自动续期

### 验证 HTTPS
```bash
curl -I https://aispark.space
```

---

## 更新本地配置

回到本地项目，更新 `.env.local`：

```bash
# 从
VITE_AGENT_METADATA_URI=http://72.62.249.168/agent-metadata.json

# 改为
VITE_AGENT_METADATA_URI=https://aispark.space/agent-metadata.json
```

然后重新部署 Agent 合约：
```bash
npm run agent:deploy:base
```

---

## 验证配置

访问以下地址确认一切正常：
- https://aispark.space （主页）
- https://aispark.space/agent-metadata.json （Agent 元数据）
