#!/bin/bash

# 诊断脚本 - 检查服务器状态
# 使用方法: chmod +x diagnose.sh && ./diagnose.sh

VPS_HOST="72.62.249.168"
VPS_USER="root"

echo "🔍 开始诊断服务器问题..."
echo "================================"

echo ""
echo "1️⃣ 测试服务器连接..."
if ping -c 2 $VPS_HOST > /dev/null 2>&1; then
    echo "✅ 服务器可以 ping 通"
else
    echo "❌ 服务器无法 ping 通"
fi

echo ""
echo "2️⃣ 测试 SSH 连接..."
if ssh -o ConnectTimeout=5 $VPS_USER@$VPS_HOST "echo 'SSH 连接成功'" 2>/dev/null; then
    echo "✅ SSH 连接正常"
else
    echo "❌ SSH 连接失败"
    exit 1
fi

echo ""
echo "3️⃣ 检查服务器状态..."
ssh $VPS_USER@$VPS_HOST << 'ENDSSH'

echo ""
echo "📦 检查 Nginx 状态..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx 正在运行"
    nginx -v
else
    echo "❌ Nginx 未运行"
    echo "尝试启动 Nginx..."
    systemctl start nginx
fi

echo ""
echo "🔥 检查防火墙状态..."
if command -v ufw &> /dev/null; then
    ufw status
    echo ""
    echo "检查 80 和 443 端口..."
    ufw status | grep -E "80|443" || echo "⚠️  端口 80/443 可能未开放"
else
    echo "✅ UFW 防火墙未安装（默认开放所有端口）"
fi

echo ""
echo "📂 检查网站文件..."
if [ -d "/var/www/ai-spark/dist" ]; then
    echo "✅ dist 目录存在"
    ls -lh /var/www/ai-spark/dist | head -5
else
    echo "❌ dist 目录不存在"
fi

echo ""
echo "📄 检查 Nginx 配置..."
if [ -f "/etc/nginx/sites-available/ai-spark" ]; then
    echo "✅ Nginx 配置文件存在"
    echo ""
    echo "配置内容:"
    cat /etc/nginx/sites-available/ai-spark
else
    echo "❌ Nginx 配置文件不存在"
fi

echo ""
echo "🔗 检查符号链接..."
if [ -L "/etc/nginx/sites-enabled/ai-spark" ]; then
    echo "✅ 符号链接存在"
else
    echo "❌ 符号链接不存在，正在创建..."
    ln -sf /etc/nginx/sites-available/ai-spark /etc/nginx/sites-enabled/
fi

echo ""
echo "🧪 测试 Nginx 配置..."
nginx -t

echo ""
echo "📊 检查端口监听..."
netstat -tlnp | grep -E ":80|:443" || echo "⚠️  没有进程监听 80/443 端口"

echo ""
echo "📝 查看 Nginx 错误日志（最后 10 行）..."
tail -10 /var/log/nginx/error.log 2>/dev/null || echo "暂无错误日志"

echo ""
echo "🔄 检查 PM2 状态..."
pm2 status

ENDSSH

echo ""
echo "================================"
echo "✅ 诊断完成"
echo "================================"
