#!/bin/bash

# 完整部署脚本 - 同时部署前端和后端
# 用途：一键部署整个项目到 VPS

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 AI Spark 完整部署脚本"
echo "=========================================="
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo "用法: ./deploy-full.sh <VPS_IP> [DOMAIN] [SSH_USER]"
    echo ""
    echo "示例:"
    echo "  ./deploy-full.sh 1.2.3.4                    # 只部署，不配置域名"
    echo "  ./deploy-full.sh 1.2.3.4 aispark.space      # 部署并配置域名"
    echo "  ./deploy-full.sh 1.2.3.4 aispark.space root # 指定 SSH 用户"
    echo ""
    exit 1
fi

VPS_IP=$1
DOMAIN=${2:-""}
SSH_USER=${3:-root}
FRONTEND_DIR="/var/www/ai-spark"
BACKEND_DIR="/root/ai-spark-api"

# 获取脚本所在目录和项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "📋 部署配置:"
echo "  VPS IP: $VPS_IP"
echo "  域名: ${DOMAIN:-未配置}"
echo "  SSH 用户: $SSH_USER"
echo "  前端目录: $FRONTEND_DIR"
echo "  后端目录: $BACKEND_DIR"
echo ""

# 确认部署
read -p "确认部署到 $VPS_IP? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 部署已取消"
    exit 1
fi

echo ""
echo "=========================================="
echo "第一部分：前端部署"
echo "=========================================="
echo ""

echo "📦 步骤 1: 构建前端..."
echo "----------------------------------------"

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 更新 API URL（如果配置了域名）
if [ -n "$DOMAIN" ]; then
    echo "更新 API URL 为: https://api.$DOMAIN"
    sed -i.backup "s|VITE_API_URL=.*|VITE_API_URL=https://api.$DOMAIN|g" "$PROJECT_ROOT/.env.local"
fi

npm run build
echo "✅ 前端构建完成"
echo ""

echo "📤 步骤 2: 上传前端文件..."
echo "----------------------------------------"

# 创建远程目录
ssh $SSH_USER@$VPS_IP "mkdir -p $FRONTEND_DIR"

# 上传构建文件
scp -r "$PROJECT_ROOT/dist"/* $SSH_USER@$VPS_IP:$FRONTEND_DIR/

echo "✅ 前端文件上传完成"
echo ""

echo "🔧 步骤 3: 配置 Nginx (前端)..."
echo "----------------------------------------"

# 通过环境变量传参，使用带引号的 heredoc 避免解析/换行符问题
ssh $SSH_USER@$VPS_IP DOMAIN="$DOMAIN" VPS_IP="$VPS_IP" FRONTEND_DIR="$FRONTEND_DIR" bash -s << 'END_SSH_NGINX'
# 创建 Nginx 配置
cat > /etc/nginx/sites-available/ai-spark << 'NGINX_CONFIG'
server {
    listen 80;
    server_name ${DOMAIN:-$VPS_IP} www.${DOMAIN:-$VPS_IP};

    root $FRONTEND_DIR;
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
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
NGINX_CONFIG

# 启用配置
ln -sf /etc/nginx/sites-available/ai-spark /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "✅ Nginx 前端配置完成"
END_SSH_NGINX

echo ""
echo "=========================================="
echo "第二部分：后端 API 部署"
echo "=========================================="
echo ""

echo "📦 步骤 4: 准备后端文件..."
echo "----------------------------------------"

TEMP_DIR=$(mktemp -d)
cp "$SCRIPT_DIR/backend-api.js" "$TEMP_DIR/"
cp "$PROJECT_ROOT/.env.local" "$TEMP_DIR/"
cp "$PROJECT_ROOT/package.json" "$TEMP_DIR/"
cp "$PROJECT_ROOT/package-lock.json" "$TEMP_DIR/" 2>/dev/null || true

echo "✅ 后端文件准备完成"
echo ""

echo "📤 步骤 5: 上传后端文件..."
echo "----------------------------------------"

ssh $SSH_USER@$VPS_IP "mkdir -p $BACKEND_DIR"
scp -r "$TEMP_DIR"/* $SSH_USER@$VPS_IP:$BACKEND_DIR/

echo "✅ 后端文件上传完成"
echo ""

echo "📥 步骤 6: 安装后端依赖..."
echo "----------------------------------------"

ssh $SSH_USER@$VPS_IP << EOF
cd $BACKEND_DIR

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

echo "Node.js: \$(node -v)"
echo "npm: \$(npm -v)"

# 安装依赖
npm install --production

echo "✅ 后端依赖安装完成"
EOF

echo ""
echo "🚀 步骤 7: 启动后端服务..."
echo "----------------------------------------"

ssh $SSH_USER@$VPS_IP << EOF
cd $BACKEND_DIR

# 安装 PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 停止旧服务
pm2 delete mint-api 2>/dev/null || true

# 启动新服务
pm2 start backend-api.js --name "mint-api"
pm2 save
pm2 startup | grep -v "PM2" | bash || true

echo "✅ 后端服务启动完成"
EOF

echo ""
echo "🔧 步骤 8: 配置 Nginx (API 反向代理)..."
echo "----------------------------------------"

if [ -n "$DOMAIN" ]; then
ssh $SSH_USER@$VPS_IP << EOF
# 创建 API 反向代理配置
cat > /etc/nginx/sites-available/mint-api << 'NGINX_CONFIG'
server {
    listen 80;
    server_name api.$DOMAIN;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGINX_CONFIG

# 启用配置
ln -sf /etc/nginx/sites-available/mint-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "✅ API 反向代理配置完成"
EOF
else
    echo "⚠️  未配置域名，跳过 API 反向代理"
fi

echo ""
echo "🔒 步骤 9: 配置 HTTPS (可选)..."
echo "----------------------------------------"

if [ -n "$DOMAIN" ]; then
    read -p "是否配置 HTTPS (Let's Encrypt)? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ssh $SSH_USER@$VPS_IP << EOF
# 安装 certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo "✅ HTTPS 配置完成"
EOF
    else
        echo "⚠️  跳过 HTTPS 配置"
    fi
else
    echo "⚠️  未配置域名，跳过 HTTPS"
fi

echo ""
echo "🧪 步骤 10: 测试服务..."
echo "----------------------------------------"

sleep 3

# 测试前端
echo "测试前端..."
if [ -n "$DOMAIN" ]; then
    curl -I http://$DOMAIN 2>/dev/null | head -n 1
else
    curl -I http://$VPS_IP 2>/dev/null | head -n 1
fi

# 测试 API
echo "测试 API..."
ssh $SSH_USER@$VPS_IP "curl -s http://localhost:3100/health" | python3 -m json.tool 2>/dev/null || true

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""
echo "📊 访问信息:"
if [ -n "$DOMAIN" ]; then
    echo "  前端: https://$DOMAIN"
    echo "  API: https://api.$DOMAIN"
else
    echo "  前端: http://$VPS_IP"
    echo "  API: http://$VPS_IP:3100"
fi
echo ""
echo "📝 管理命令:"
echo "  查看 API 状态: ssh $SSH_USER@$VPS_IP 'pm2 status'"
echo "  查看 API 日志: ssh $SSH_USER@$VPS_IP 'pm2 logs mint-api'"
echo "  重启 API: ssh $SSH_USER@$VPS_IP 'pm2 restart mint-api'"
echo "  查看 Nginx 日志: ssh $SSH_USER@$VPS_IP 'tail -f /var/log/nginx/access.log'"
echo ""
echo "🔍 验证部署:"
echo "  1. 访问前端网站"
echo "  2. 连接钱包"
echo "  3. 发布一篇帖子"
echo "  4. 检查是否自动获得 mint 资格"
echo ""

# 恢复 .env.local
if [ -f "$PROJECT_ROOT/.env.local.backup" ]; then
    mv "$PROJECT_ROOT/.env.local.backup" "$PROJECT_ROOT/.env.local"
    echo "✅ 已恢复本地 .env.local"
fi

# 清理临时文件
rm -rf "$TEMP_DIR"

echo "✨ 完成！"
