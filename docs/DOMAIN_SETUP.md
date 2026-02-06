# 🌐 域名配置指南

## 快速配置（推荐）

### 使用自动化脚本

```bash
# 配置你的域名（替换为实际域名）
./setup-domain.sh aispark.space
```

这个脚本会自动：
1. ✅ 检查 DNS 解析
2. ✅ 更新 Nginx 配置
3. ✅ 配置 HTTPS（可选）
4. ✅ 更新环境变量

---

## 手动配置步骤

### 第一步：DNS 配置

在你的域名提供商（如阿里云、GoDaddy、Cloudflare）添加以下记录：

| 类型 | 名称 | 值 | TTL |
|------|------|---------|-----|
| A | @ | 72.62.249.168 | 600 |
| A | www | 72.62.249.168 | 600 |

**等待 DNS 生效**（通常 5-30 分钟）

验证 DNS 是否生效：
```bash
dig +short aispark.space
# 应该显示: 72.62.249.168
```

---

### 第二步：更新 Nginx 配置

SSH 到服务器：
```bash
ssh root@72.62.249.168
```

编辑 Nginx 配置：
```bash
nano /etc/nginx/sites-available/ai-spark
```

修改 `server_name` 行：
```nginx
server_name aispark.space www.aispark.space;
```

测试并重启：
```bash
nginx -t
systemctl restart nginx
```

---

### 第三步：配置 HTTPS（推荐）

安装 Certbot：
```bash
apt install -y certbot python3-certbot-nginx
```

获取 SSL 证书：
```bash
certbot --nginx -d aispark.space -d www.aispark.space
```

证书会自动续期！

---

### 第四步：更新环境变量

更新 `.env.local` 中的 Agent 元数据 URI：

```bash
# 从
VITE_AGENT_METADATA_URI=http://72.62.249.168/agent-metadata.json

# 改为
VITE_AGENT_METADATA_URI=https://aispark.space/agent-metadata.json
```

---

## 常见域名提供商配置

### 阿里云
1. 登录阿里云控制台
2. 进入「云解析 DNS」
3. 点击域名进入「解析设置」
4. 添加 A 记录

### 腾讯云 (DNSPod)
1. 登录腾讯云控制台
2. 进入「DNSPod」
3. 点击域名进入「记录管理」
4. 添加 A 记录

### Cloudflare
1. 登录 Cloudflare
2. 选择域名
3. 进入「DNS」→「Records」
4. 添加 A 记录
5. 确保「Proxy status」为橙色云朵（启用 CDN）

### GoDaddy
1. 登录 GoDaddy
2. 进入「My Products」→「DNS」
3. 添加 A 记录

---

## 验证配置

### 1. 检查 DNS
```bash
dig +short aispark.space
nslookup aispark.space
```

### 2. 测试网站访问
```bash
curl -I http://aispark.space
curl -I https://aispark.space  # 如果配置了 HTTPS
```

### 3. 检查 SSL 证书
```bash
echo | openssl s_client -connect aispark.space:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 多域名配置

如果你有多个域名（如 `aispark.space` 和 `aispark.io`），在 Nginx 配置中添加：

```nginx
server_name aispark.space www.aispark.space aispark.io www.aispark.io;
```

然后为每个域名都添加 DNS A 记录。

---

## 域名 + CDN（可选）

### 使用 Cloudflare CDN

1. **添加网站到 Cloudflare**
   - 注册 Cloudflare 账号
   - 添加你的域名

2. **修改域名 DNS 服务器**
   - 在域名提供商将 NS 记录改为 Cloudflare 的

3. **配置 Cloudflare**
   - SSL/TLS: Full
   - Caching: Standard
   - Auto Minify: 开启

**好处：**
- ✅ 全球加速
- ✅ 免费 SSL
- ✅ DDoS 防护
- ✅ 流量分析

---

## 子域名配置

如果要配置子域名（如 `api.aispark.space`）：

1. **添加 DNS 记录**
   ```
   类型: A
   名称: api
   值: 72.62.249.168
   ```

2. **添加 Nginx 配置**
   ```nginx
   server {
       listen 80;
       server_name api.aispark.space;
       # ... 其他配置
   }
   ```

---

## 故障排查

### 问题 1: 域名无法访问
**原因：** DNS 未生效
**解决：** 等待 5-30 分钟，清除本地 DNS 缓存
```bash
# macOS
sudo dscacheutil -flushcache

# Windows
ipconfig /flushdns

# Linux
sudo systemd-resolve --flush-caches
```

### 问题 2: HTTPS 证书获取失败
**原因：** DNS 未解析或端口未开放
**解决：**
1. 确认 DNS 已生效
2. 检查防火墙是否开放 80 和 443 端口
   ```bash
   ufw allow 80
   ufw allow 443
   ```

### 问题 3: 显示「不安全」警告
**原因：** 使用了混合内容（HTTP + HTTPS）
**解决：** 确保所有资源都使用 HTTPS

---

## 性能优化

### 1. 启用 HTTP/2
```nginx
listen 443 ssl http2;
```

### 2. 启用 Brotli 压缩
```bash
apt install -y nginx-module-brotli
```

### 3. 配置缓存
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 重新部署 Agent 合约

域名配置完成后，需要重新部署 Agent 合约：

```bash
# 1. 更新 .env.local 中的 URI
VITE_AGENT_METADATA_URI=https://aispark.space/agent-metadata.json

# 2. 重新部署 Agent
npm run agent:deploy:base
```

---

## 技术支持

如果遇到问题：
1. 检查 Nginx 日志: `tail -f /var/log/nginx/error.log`
2. 检查 DNS: `dig +short your-domain.com`
3. 测试端口: `telnet your-domain.com 80`
