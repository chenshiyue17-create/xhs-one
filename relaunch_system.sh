#!/usr/bin/env bash
# /Users/cc/XHS_ALL_IN_ONE/relaunch_system.sh
# 一键重新编译并拉起全套系统 (AI + Frontend + Backend)

set -e

PROJECT_ROOT="/Users/cc/XHS_ALL_IN_ONE"
RAG_DIR="/Users/cc/mcp-rag-expert"

echo "=== 🔄 启动全系统刷新流程 ==="

# 1. 刷新 RAG 知识库索引 (确保数据最新)
echo "1/4 正在刷新 RAG 知识库..."
cd "$RAG_DIR"
./venv/bin/python3 ingest.py
echo "✅ 知识库索引已更新"

# 2. 编译前端代码 (确保 UI 修改生效)
echo "2/4 正在编译前端代码 (npm run build)..."
cd "$PROJECT_ROOT/frontend"
npm run build
echo "✅ 前端编译完成"

# 3. 杀死旧的后端进程并重启
echo "3/4 正在重启后端服务..."
# 查找并杀掉占用 8000 端口的进程
OLD_PID=$(lsof -ti:8000 || true)
if [ -n "$OLD_PID" ]; then
    echo "停止旧进程: $OLD_PID"
    kill -9 $OLD_PID || true
fi

# 4. 拉起全新系统
echo "4/4 正在启动 XHS 工作台 App..."
open "/Users/cc/Desktop/XHS工作台.app"

echo ""
echo "========================================"
echo "🎉 全系统刷新成功！"
echo "请在 Chrome 中查看：http://127.0.0.1:8000"
echo "========================================"
