#!/bin/bash

# 一键部署脚本 - 自动构建+部署

set -e

VPS_IP="72.62.249.168"
DOMAIN="aispark.space"
SSH_USER="root"

echo "=========================================="
echo "🚀 AI Spark 一键部署"
echo "=========================================="
echo ""

# 检查是否配置了免密登录
echo "🔍 检查 SSH 连接..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $SSH_USER@$VPS_IP "exit" 2>/dev/null; then
    echo "❌ 未配置 SSH 免密登录"
    echo ""
    echo "请先运行: ./setup-ssh.sh"
    exit 1
fi
echo "✅ SSH 连接正常"
echo ""

# 执行完整部署流程
echo "📦 开始构建和部署..."
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

$SCRIPT_DIR/deploy-full.sh $VPS_IP $DOMAIN $SSH_USER

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "🌐 访问地址："
echo "  前端: https://$DOMAIN"
echo "  API: https://api.$DOMAIN"
echo ""
