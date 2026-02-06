#!/bin/bash

# 修复 API 服务 - 安装依赖并重启

set -e

VPS_IP="72.62.249.168"
SSH_USER="root"

echo "=========================================="
echo "🔧 修复 API 服务"
echo "=========================================="
echo ""

echo "1️⃣ 安装 API 依赖..."
echo "----------------------------------------"

ssh $SSH_USER@$VPS_IP << 'EOF'
cd /root/ai-spark-api

echo "当前目录内容："
ls -lh

echo ""
echo "检查 package.json..."
if [ -f "package.json" ]; then
    echo "✅ package.json 存在"
    cat package.json | head -20
else
    echo "❌ package.json 不存在"
    exit 1
fi

echo ""
echo "安装依赖..."
npm install --production

echo ""
echo "✅ 依赖安装完成"
echo ""
echo "已安装的模块："
ls node_modules/ | head -10
EOF

echo ""
echo "2️⃣ 重启 API 服务..."
echo "----------------------------------------"

ssh $SSH_USER@$VPS_IP << 'EOF'
cd /root/ai-spark-api

# 停止旧进程
pm2 delete mint-api 2>/dev/null || echo "没有运行的 mint-api 进程"

# 启动新进程
pm2 start backend-api.js --name mint-api

# 保存 pm2 配置
pm2 save

# 显示状态
pm2 list

echo ""
echo "等待 5 秒让服务启动..."
sleep 5

echo ""
echo "API 日志："
pm2 logs mint-api --lines 30 --nostream
EOF

echo ""
echo "3️⃣ 测试 API..."
echo "----------------------------------------"

echo "测试健康检查端点："
sleep 2
curl -s http://$VPS_IP:3100/health 2>&1 || echo "⚠️  端口 3100 无响应"

echo ""
echo "测试根路径："
curl -s http://$VPS_IP:3100/ 2>&1 | head -5 || echo "⚠️  根路径无响应"

echo ""
echo "=========================================="
echo "✅ 修复完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 访问 http://aispark.space 测试前端"
echo "2. 配置 API 子域名 DNS (api.aispark.space -> $VPS_IP)"
echo "3. 配置 HTTPS 证书"
echo ""
