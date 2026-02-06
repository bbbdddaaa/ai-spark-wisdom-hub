#!/bin/bash

# 域名配置脚本
# 使用方法: ./setup-domain.sh your-domain.com

set -e

if [ -z "$1" ]; then
    echo "❌ 错误：请提供域名"
    echo "使用方法: ./setup-domain.sh your-domain.com"
    exit 1
fi

DOMAIN=$1
VPS_HOST="72.62.249.168"
VPS_USER="root"

echo "🌐 开始配置域名: $DOMAIN"
echo "================================"

# 1. 检查 DNS 解析
echo ""
echo "📋 步骤 1/4: 检查 DNS 解析..."
echo "正在查询 $DOMAIN 的 A 记录..."

DNS_IP=$(dig +short $DOMAIN @8.8.8.8 | tail -n1)

if [ -z "$DNS_IP" ]; then
    echo "⚠️  警告：域名 $DOMAIN 尚未解析"
    echo ""
    echo "请在域名提供商添加以下 DNS 记录："
    echo "  类型: A"
    echo "  名称: @"
    echo "  值: $VPS_HOST"
    echo "  TTL: 600"
    echo ""
    read -p "配置完成后按 Enter 继续..."
else
    if [ "$DNS_IP" = "$VPS_HOST" ]; then
        echo "✅ DNS 解析正确: $DOMAIN → $VPS_HOST"
    else
        echo "⚠️  DNS 解析到: $DNS_IP (期望: $VPS_HOST)"
        echo "请检查 DNS 配置是否正确"
        read -p "继续？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# 2. 更新 Nginx 配置
echo ""
echo "⚙️  步骤 2/4: 更新 Nginx 配置..."

ssh $VPS_USER@$VPS_HOST << ENDSSH
# 备份旧配置
if [ -f /etc/nginx/sites-available/ai-spark ]; then
    cp /etc/nginx/sites-available/ai-spark /etc/nginx/sites-available/ai-spark.backup
    echo "✅ 已备份旧配置"
fi

# 创建新配置
cat > /etc/nginx/sites-available/ai-spark << 'EOF'
server {
    listen 80;
    listen [::]:80;
    
    server_name $DOMAIN www.$DOMAIN;

    root /var/www/ai-spark/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
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

# 3. 配置 HTTPS
echo ""
echo "🔒 步骤 3/4: 配置 HTTPS..."
read -p "是否配置 HTTPS SSL 证书？(y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "安装 SSL 证书..."
    
    ssh $VPS_USER@$VPS_HOST << ENDSSH
# 安装 Certbot
apt update
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# 设置自动续期
systemctl enable certbot.timer
systemctl start certbot.timer

echo "✅ SSL 证书安装完成"

ENDSSH
    
    echo "✅ HTTPS 配置完成"
    PROTOCOL="https"
else
    echo "⏭️  跳过 HTTPS 配置"
    PROTOCOL="http"
fi

# 4. 更新环境变量
echo ""
echo "📝 步骤 4/4: 更新配置文件..."

# 更新 .env.local
if [ -f ".env.local" ]; then
    # 更新 Agent 元数据 URI
    sed -i.bak "s|VITE_AGENT_METADATA_URI=.*|VITE_AGENT_METADATA_URI=$PROTOCOL://$DOMAIN/agent-metadata.json|" .env.local
    echo "✅ 已更新 .env.local"
fi

echo ""
echo "================================"
echo "🎉 域名配置完成！"
echo "================================"
echo ""
echo "📋 访问信息:"
echo "  网站地址: $PROTOCOL://$DOMAIN"
echo "  备用地址: $PROTOCOL://www.$DOMAIN"
echo "  Agent 元数据: $PROTOCOL://$DOMAIN/agent-metadata.json"
echo ""
echo "📝 下一步:"
echo "  1. 更新 .env.local 中的域名配置"
echo "  2. 重新部署 Agent 合约（使用新的元数据 URI）:"
echo "     npm run agent:deploy:base"
echo "  3. 重新部署前端（如果需要）:"
echo "     ./deploy.sh"
echo ""
