#!/bin/bash

# API 服务自动部署脚本
# 用途：将 Mint 资格授予 API 服务部署到 VPS

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 API 服务部署脚本"
echo "=========================================="
echo ""

# 检查是否提供了 VPS IP
if [ -z "$1" ]; then
    echo "用法: ./deploy-api.sh <VPS_IP> [SSH_USER]"
    echo "示例: ./deploy-api.sh 1.2.3.4 root"
    exit 1
fi

VPS_IP=$1
SSH_USER=${2:-root}
DEPLOY_DIR="/root/ai-spark-api"

echo "📋 部署配置:"
echo "  VPS IP: $VPS_IP"
echo "  SSH 用户: $SSH_USER"
echo "  部署目录: $DEPLOY_DIR"
echo ""

# 确认部署
read -p "确认部署到 $VPS_IP? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 部署已取消"
    exit 1
fi

echo ""
echo "📦 步骤 1/5: 准备文件..."
echo "----------------------------------------"

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo "创建临时目录: $TEMP_DIR"

# 复制必要文件
cp backend-api.js "$TEMP_DIR/"
cp .env.local "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/" 2>/dev/null || true

echo "✅ 文件准备完成"
echo ""

echo "📤 步骤 2/5: 上传文件到 VPS..."
echo "----------------------------------------"

# 创建远程目录
ssh $SSH_USER@$VPS_IP "mkdir -p $DEPLOY_DIR"

# 上传文件
scp -r "$TEMP_DIR"/* $SSH_USER@$VPS_IP:$DEPLOY_DIR/

echo "✅ 文件上传完成"
echo ""

echo "📥 步骤 3/5: 安装依赖..."
echo "----------------------------------------"

ssh $SSH_USER@$VPS_IP << 'EOF'
cd /root/ai-spark-api

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 安装依赖
echo "正在安装依赖..."
npm install --production

echo "✅ 依赖安装完成"
EOF

echo ""
echo "🚀 步骤 4/5: 启动服务..."
echo "----------------------------------------"

ssh $SSH_USER@$VPS_IP << 'EOF'
cd /root/ai-spark-api

# 安装 PM2（如果未安装）
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

# 停止旧服务（如果存在）
pm2 delete mint-api 2>/dev/null || true

# 启动新服务
pm2 start backend-api.js --name "mint-api"

# 保存 PM2 配置
pm2 save

# 设置开机自启（首次运行）
pm2 startup | grep -v "PM2" | bash || true

# 显示状态
pm2 status

echo "✅ 服务启动完成"
EOF

echo ""
echo "🧪 步骤 5/5: 测试服务..."
echo "----------------------------------------"

# 等待服务启动
sleep 3

# 测试健康检查
echo "测试健康检查..."
if ssh $SSH_USER@$VPS_IP "curl -s http://localhost:3100/health" | grep -q "ok"; then
    echo "✅ 健康检查通过"
else
    echo "❌ 健康检查失败"
    exit 1
fi

# 测试统计接口
echo ""
echo "获取统计信息..."
ssh $SSH_USER@$VPS_IP "curl -s http://localhost:3100/api/stats" | python3 -m json.tool 2>/dev/null || true

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""
echo "📊 服务信息:"
echo "  API 地址: http://$VPS_IP:3100"
echo "  健康检查: http://$VPS_IP:3100/health"
echo ""
echo "📝 管理命令:"
echo "  查看状态: ssh $SSH_USER@$VPS_IP 'pm2 status'"
echo "  查看日志: ssh $SSH_USER@$VPS_IP 'pm2 logs mint-api'"
echo "  重启服务: ssh $SSH_USER@$VPS_IP 'pm2 restart mint-api'"
echo "  停止服务: ssh $SSH_USER@$VPS_IP 'pm2 stop mint-api'"
echo ""
echo "⚠️  下一步:"
echo "  1. 配置防火墙允许 3100 端口（或使用 Nginx 反向代理）"
echo "  2. 更新前端 .env.local 中的 VITE_API_URL"
echo "  3. 重新构建前端: npm run build"
echo ""

# 清理临时文件
rm -rf "$TEMP_DIR"

echo "✨ 完成！"
