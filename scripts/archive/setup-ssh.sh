#!/bin/bash

# SSH 免密登录配置脚本

VPS_IP="72.62.249.168"
SSH_USER="root"

echo "=========================================="
echo "🔐 配置 SSH 免密登录"
echo "=========================================="
echo ""
echo "VPS: $SSH_USER@$VPS_IP"
echo ""
echo "📝 请输入一次服务器密码..."
echo ""

# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/id_ed25519.pub $SSH_USER@$VPS_IP

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ SSH 免密登录配置成功！"
    echo "=========================================="
    echo ""
    echo "🧪 测试免密登录..."
    ssh $SSH_USER@$VPS_IP "echo '✅ 免密登录成功！'; uname -a"
    
    echo ""
    echo "🎉 现在可以免密部署了！"
    echo ""
    echo "运行部署命令："
    echo "  ./deploy-full.sh $VPS_IP aispark.space $SSH_USER"
else
    echo ""
    echo "❌ 配置失败，请检查："
    echo "  1. 服务器 IP 是否正确"
    echo "  2. 密码是否正确"
    echo "  3. 网络是否正常"
fi
