#!/bin/bash

echo "🔄 正在重启 API 服务..."
echo ""

# 查找并杀死占用 3100 端口的进程
PID=$(lsof -ti :3100)

if [ -n "$PID" ]; then
  echo "📍 发现旧进程 (PID: $PID)"
  echo "🔪 正在杀死进程..."
  kill -9 $PID 2>/dev/null || sudo kill -9 $PID
  sleep 1
  echo "✅ 旧进程已终止"
else
  echo "✅ 没有旧进程运行"
fi

echo ""
echo "🚀 启动新的 API 服务..."
echo ""

# 启动新服务
npm run api
