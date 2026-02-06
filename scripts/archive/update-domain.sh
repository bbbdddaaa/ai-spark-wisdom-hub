#!/bin/bash

# 更新域名配置为 aispark.space
set -e

VPS_HOST="72.62.249.168"
VPS_USER="root"
DOMAIN="aispark.space"

echo "🌐 配置域名: $DOMAIN"
echo "================================"

# 1. 更新 Nginx 配置
echo ""
echo "⚙️  步骤 1/3: 更新 Nginx 配置..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
# 备份旧配置
if [ -f /etc/nginx/sites-available/ai-spark ]; then
    cp /etc/nginx/sites-available/ai-spark /etc/nginx/sites-available/ai-spark.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ 已备份旧配置"
fi

# 创建新配置
cat > /etc/nginx/sites-available/ai-spark << 'EOF'
server {
    listen 80;
    listen [::]:80;
    
    server_name aispark.space www.aispark.space;

    root /var/www/ai-spark/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /agent-metadata.json {
        alias /var/www/ai-spark/public/agent-metadata.json;
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx

echo "✅ Nginx 配置已更新"

ENDSSH

echo "✅ Nginx 配置完成"

# 2. 配置 HTTPS
echo ""
echo "🔒 步骤 2/3: 配置 HTTPS..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
# 安装 Certbot（如果未安装）
if ! command -v certbot &> /dev/null; then
    echo "安装 Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# 获取 SSL 证书
echo "获取 SSL 证书..."
certbot --nginx -d aispark.space -d www.aispark.space --non-interactive --agree-tos --email admin@aispark.space --redirect

# 设置自动续期
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✅ HTTPS 配置完成"

ENDSSH

echo "✅ HTTPS 配置完成"

# 3. 更新环境变量
echo ""
echo "📝 步骤 3/3: 更新本地配置..."

if [ -f ".env.local" ]; then
    # 备份
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    
    # 更新 Agent 元数据 URI
    if grep -q "VITE_AGENT_METADATA_URI" .env.local; then
        sed -i.bak "s|VITE_AGENT_METADATA_URI=.*|VITE_AGENT_METADATA_URI=https://aispark.space/agent-metadata.json|" .env.local
        rm -f .env.local.bak
        echo "✅ 已更新 .env.local"
    fi
fi

echo ""
echo "================================"
echo "🎉 配置完成！"
echo "================================"
echo ""
echo "📋 访问信息:"
echo "  网站地址: https://aispark.space"
echo "  备用地址: https://www.aispark.space"
echo "  Agent 元数据: https://aispark.space/agent-metadata.json"
echo ""
echo "📝 验证配置:"
echo "  curl -I https://aispark.space"
echo "  curl https://aispark.space/agent-metadata.json"
echo ""
echo "📊 查看证书信息:"
echo "  ssh $VPS_USER@$VPS_HOST"
echo "  certbot certificates"
echo ""
