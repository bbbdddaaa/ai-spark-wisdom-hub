#!/bin/bash

# 快速更新脚本 - 用于已部署项目的日常更新
# 只更新代码，不重新配置服务器

set -e

echo "=========================================="
echo "⚡ 快速更新脚本"
echo "=========================================="
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo "用法: ./update.sh <VPS_IP> [更新内容]"
    echo ""
    echo "更新内容选项:"
    echo "  all       - 更新前端和后端（默认）"
    echo "  frontend  - 只更新前端"
    echo "  backend   - 只更新后端"
    echo ""
    echo "示例:"
    echo "  ./update.sh 1.2.3.4              # 更新所有"
    echo "  ./update.sh 1.2.3.4 frontend     # 只更新前端"
    echo "  ./update.sh 1.2.3.4 backend      # 只更新后端"
    echo ""
    exit 1
fi

VPS_IP=$1
UPDATE_TYPE=${2:-all}
SSH_USER=${3:-root}
FRONTEND_DIR="/var/www/ai-spark"
BACKEND_DIR="/root/ai-spark-api"

echo "📋 更新配置:"
echo "  VPS IP: $VPS_IP"
echo "  更新内容: $UPDATE_TYPE"
echo "  SSH 用户: $SSH_USER"
echo ""

# 快速确认
read -p "确认更新到 $VPS_IP? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 更新已取消"
    exit 1
fi

START_TIME=$(date +%s)

# ==================== 更新前端 ====================
if [ "$UPDATE_TYPE" = "all" ] || [ "$UPDATE_TYPE" = "frontend" ]; then
    echo ""
    echo "🎨 更新前端..."
    echo "----------------------------------------"
    
    # 构建
    echo "📦 构建中..."
    npm run build > /dev/null 2>&1
    echo "✅ 构建完成"
    
    # 上传
    echo "📤 上传中..."
    scp -r dist/* $SSH_USER@$VPS_IP:$FRONTEND_DIR/ > /dev/null 2>&1
    echo "✅ 前端更新完成"
fi

# ==================== 更新后端 ====================
if [ "$UPDATE_TYPE" = "all" ] || [ "$UPDATE_TYPE" = "backend" ]; then
    echo ""
    echo "⚙️  更新后端..."
    echo "----------------------------------------"
    
    # 上传后端文件
    echo "📤 上传文件..."
    scp backend-api.js $SSH_USER@$VPS_IP:$BACKEND_DIR/ > /dev/null 2>&1
    
    # 检查是否需要更新依赖
    if [ -f "package.json.changed" ]; then
        echo "📥 更新依赖..."
        scp package.json $SSH_USER@$VPS_IP:$BACKEND_DIR/ > /dev/null 2>&1
        ssh $SSH_USER@$VPS_IP "cd $BACKEND_DIR && npm install --production" > /dev/null 2>&1
    fi
    
    # 重启服务
    echo "🔄 重启服务..."
    ssh $SSH_USER@$VPS_IP "pm2 restart mint-api" > /dev/null 2>&1
    
    echo "✅ 后端更新完成"
fi

# ==================== 验证更新 ====================
echo ""
echo "🧪 验证更新..."
echo "----------------------------------------"

sleep 2

# 测试前端
if [ "$UPDATE_TYPE" = "all" ] || [ "$UPDATE_TYPE" = "frontend" ]; then
    if curl -s -o /dev/null -w "%{http_code}" http://$VPS_IP | grep -q "200"; then
        echo "✅ 前端: 正常"
    else
        echo "⚠️  前端: 无法访问"
    fi
fi

# 测试后端
if [ "$UPDATE_TYPE" = "all" ] || [ "$UPDATE_TYPE" = "backend" ]; then
    if ssh $SSH_USER@$VPS_IP "curl -s http://localhost:3100/health" | grep -q "ok"; then
        echo "✅ 后端: 正常"
    else
        echo "⚠️  后端: 无法访问"
    fi
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
echo "🎉 更新完成！"
echo "=========================================="
echo ""
echo "⏱️  用时: ${DURATION}秒"
echo ""
echo "📊 服务状态:"
echo "  查看后端状态: ssh $SSH_USER@$VPS_IP 'pm2 status'"
echo "  查看后端日志: ssh $SSH_USER@$VPS_IP 'pm2 logs mint-api --lines 50'"
echo ""
echo "✨ 完成！"
