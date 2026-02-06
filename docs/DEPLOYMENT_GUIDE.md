# 🚀 AI Spark VPS 部署指南

## 快速开始

### 1. 准备工作

确保你已经：
- ✅ 有 VPS 服务器访问权限
- ✅ 配置好 `.env.local` 文件
- ✅ 项目能在本地正常运行

### 2. 一键部署

```bash
# 给部署脚本添加执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

### 3. 验证部署

部署完成后，访问：
- **前端网站**: http://72.62.249.168
- **Agent 元数据**: http://72.62.249.168/agent-metadata.json

---

## 手动部署步骤

如果自动部署失败，可以手动执行以下步骤：

### 步骤 1: 构建项目

```bash
npm run build
```

### 步骤 2: 上传到服务器

```bash
# 创建服务器目录
ssh root@72.62.249.168 "mkdir -p /var/www/ai-spark"

# 上传文件
scp -r dist root@72.62.249.168:/var/www/ai-spark/
scp -r public root@72.62.249.168:/var/www/ai-spark/
scp .env.local root@72.62.249.168:/var/www/ai-spark/
scp package.json root@72.62.249.168:/var/www/ai-spark/
```

### 步骤 3: 在服务器上配置

```bash
# SSH 到服务器
ssh root@72.62.249.168

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 Nginx
apt install -y nginx

# 配置 Nginx
cat > /etc/nginx/sites-available/ai-spark << 'EOF'
server {
    listen 80;
    server_name 72.62.249.168;

    root /var/www/ai-spark/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /agent-metadata.json {
        alias /var/www/ai-spark/public/agent-metadata.json;
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }
}
EOF

# 启用站点
ln -s /etc/nginx/sites-available/ai-spark /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 更新 Agent 元数据 URI

部署完成后，更新 `.env.local` 中的 Agent URI：

```bash
VITE_AGENT_METADATA_URI=http://72.62.249.168/agent-metadata.json
```

然后部署 Agent 合约：

```bash
npm run agent:deploy:base
```

---

## 常见问题

### Q: 如何查看服务日志？
```bash
ssh root@72.62.249.168
pm2 logs ai-spark-backend
```

### Q: 如何重启服务？
```bash
ssh root@72.62.249.168
pm2 restart ai-spark-backend
```

### Q: 如何更新部署？
```bash
# 在本地运行
./deploy.sh
```

### Q: 如何绑定域名？

1. 在域名 DNS 设置中添加 A 记录指向 `72.62.249.168`
2. 修改 Nginx 配置中的 `server_name`：
   ```bash
   ssh root@72.62.249.168
   nano /etc/nginx/sites-available/ai-spark
   # 修改 server_name 为你的域名
   systemctl restart nginx
   ```

### Q: 如何启用 HTTPS？
```bash
ssh root@72.62.249.168
apt install -y certbot python3-certbot-nginx
certbot --nginx -d 你的域名.com
```

---

## 后端服务

后端服务会自动：
- 监控 Supabase 数据库变化
- 授予新用户 mint 资格
- 发放周排名奖励

查看服务状态：
```bash
ssh root@72.62.249.168
pm2 status
```

---

## 安全建议

1. ✅ 修改 SSH 端口
2. ✅ 配置防火墙只开放必要端口
3. ✅ 定期更新系统
4. ✅ 使用强密码或 SSH 密钥
5. ✅ 启用 HTTPS（如果有域名）

---

## 技术支持

如果遇到问题：
1. 查看 Nginx 日志: `tail -f /var/log/nginx/error.log`
2. 查看 PM2 日志: `pm2 logs`
3. 检查防火墙: `ufw status`
