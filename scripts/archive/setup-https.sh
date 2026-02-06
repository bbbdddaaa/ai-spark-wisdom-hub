#!/bin/bash

# 配置 HTTPS 证书

VPS_IP="72.62.249.168"
DOMAIN="aispark.space"
SSH_USER="root"

echo "=========================================="
echo "🔒 配置 HTTPS 证书"
echo "=========================================="
echo ""

read -p "请输入你的邮箱地址（用于 Let's Encrypt 通知）: " EMAIL

if [ -z "$EMAIL" ]; then
    echo "❌ 邮箱不能为空"
    exit 1
fi

echo ""
echo "正在配置 HTTPS 证书..."
echo ""

ssh $SSH_USER@$VPS_IP << EOF
# 安装 certbot（如果没有）
if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# 申请证书
certbot --nginx \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

# 重启 Nginx
systemctl reload nginx

echo ""
echo "✅ HTTPS 配置完成！"
EOF

echo ""
echo "=========================================="
echo "🎉 配置完成！"
echo "=========================================="
echo ""
echo "现在可以访问："
echo "  https://$DOMAIN"
echo "  http://$DOMAIN (自动跳转到 HTTPS)"
echo ""
