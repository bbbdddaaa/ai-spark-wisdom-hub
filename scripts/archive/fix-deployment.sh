#!/bin/bash

# 修复部署问题脚本

set -e

VPS_IP="72.62.249.168"
DOMAIN="aispark.space"
SSH_USER="root"

echo "=========================================="
echo "🔧 修复部署问题"
echo "=========================================="
echo ""

echo "1️⃣ 修复 Nginx 配置..."
echo "----------------------------------------"

ssh $SSH_USER@$VPS_IP << 'EOF'
# 修复前端 Nginx 配置
cat > /etc/nginx/sites-available/ai-spark << 'NGINX_CONFIG'
server {
    listen 80;
    server_name aispark.space www.aispark.space;

    root /var/www/ai-spark;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
}
NGINX_CONFIG

# 修复 API Nginx 配置
cat > /etc/nginx/sites-available/mint-api << 'NGINX_CONFIG'
server {
    listen 80;
    server_name api.aispark.space;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_CONFIG

# 启用配置
ln -sf /etc/nginx/sites-available/ai-spark /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/mint-api /etc/nginx/sites-enabled/

# 测试并重载
nginx -t && systemctl reload nginx

echo "✅ Nginx 配置已修复"
EOF

echo ""
echo "2️⃣ 检查 API 服务状态..."
echo "----------------------------------------"

ssh $SSH_USER@$VPS_IP << 'EOF'
cd /root/ai-spark-api

# 检查 pm2 状态
if command -v pm2 &> /dev/null; then
    echo "PM2 进程列表："
    pm2 list
    
    # 尝试重启 API
    if pm2 describe mint-api &> /dev/null; then
        echo ""
        echo "重启 API 服务..."
        pm2 restart mint-api
    else
        echo ""
        echo "启动 API 服务..."
        pm2 start backend-api.js --name mint-api
    fi
    
    echo ""
    echo "API 日志（最近 20 行）："
    pm2 logs mint-api --lines 20 --nostream
else
    echo "PM2 未安装"
fi
EOF

echo ""
echo "3️⃣ 测试服务..."
echo "----------------------------------------"

echo "测试前端 HTTP："
curl -I http://$DOMAIN 2>&1 | head -5

echo ""
echo "测试 API（需先配置 DNS）："
echo "curl -I http://$VPS_IP:3100/health"
curl -I http://$VPS_IP:3100/health 2>&1 | head -5 || echo "⚠️  API 端口 3100 无响应"

echo ""
echo "=========================================="
echo "📋 下一步："
echo "=========================================="
echo ""
echo "1. 配置 DNS 记录（在域名商后台）："
echo "   类型: A"
echo "   主机: api"
echo "   值: $VPS_IP"
echo "   TTL: 600"
echo ""
echo "2. 等待 DNS 生效后，配置 HTTPS："
echo "   ssh $SSH_USER@$VPS_IP"
echo "   certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN"
echo ""
echo "3. 检查 API 是否正常启动："
echo "   ssh $SSH_USER@$VPS_IP 'pm2 logs mint-api'"
echo ""
