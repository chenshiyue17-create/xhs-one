# XHS_ALL_IN_ONE Project Map

本项目的本地唯一工作根目录是：

```text
/Users/cc/XHS_ALL_IN_ONE
```

## Daily Entry

- 本地工作台：`http://127.0.0.1:8000/platforms/xhs/fast-download`
- API 文档：`http://127.0.0.1:8000/docs`
- 健康检查：`http://127.0.0.1:8000/api/health`
- 桌面入口：`/Users/cc/Desktop/XHS工作台.app`
- GitHub 目标仓库：`https://github.com/chenshiyue17-create/xhs-one.git`

## Canonical Commands

```bash
./scripts/start-dev.sh
./scripts/dev-status.sh
./scripts/stop-dev.sh
./scripts/project-index.py check
```

旧入口仍保留兼容，例如 `start.sh`、`launch-server-workbench.sh`、`start-unified-workbench.sh`、`打开小红书工作台.command`。日常开发和交付优先使用 `scripts/`。

## Project Index Guard

机器可读总索引在 `PROJECT_INDEX.json`。从项目任意子目录进入时，先运行：

```bash
/Users/cc/XHS_ALL_IN_ONE/scripts/project-index.py check
```

它会校验：

- 当前目录是否属于唯一项目根目录。
- `origin` 是否指向 `https://github.com/chenshiyue17-create/xhs-one.git`。
- 核心源码、脚本、测试、当前功能锚点是否存在。
- `logs/`、`.env`、Chrome profile 等本地文件是否被误暂存。
- `frontend/src/lib/version.ts`、`memory.md`、`docs/PROJECT_MEMORY.md` 这类版本/上下文文件是否还处于未跟踪状态。

需要快速定位文案提取相关文件时运行：

```bash
./scripts/project-index.py files
```

## Source Layout

- `backend/app/api/`：FastAPI 路由层。
- `backend/app/services/`：业务服务与调度。
- `backend/app/adapters/xhs/`：XHS SDK 适配层。
- `backend/downloader_engine/`：无水印下载与解析引擎。
- `apis/`、`xhs_utils/`、`static/`：底层 XHS API、签名和 JS 运行资产。
- `frontend/src/pages/platforms/xhs/`：小红书工作台页面。
- `frontend/src/lib/api.ts`：前端 API 客户端。
- `frontend/src/types/`：前端类型定义。
- `tests/backend/`：后端 smoke 与核心逻辑测试。
- `docs/`：项目地图、项目记忆和维护说明。
- `scripts/`：统一启停、状态检查和可复用运维脚本。

## Generated Or Local-Only Paths

这些目录或文件不应该作为核心源码散落提交：

- `logs/`
- `output/`
- `downloads/`
- `.venv/`
- `node_modules/`
- `frontend/node_modules/`
- `.chrome-helper-profile/`
- `.chrome-fast-download-profile/`
- `frontend/dist/`

## Current Feature Anchor

链接文案提取功能集中在以下文件：

- 后端接口：`backend/app/api/downloader.py`
- 前端 API：`frontend/src/lib/api.ts`
- 前端类型：`frontend/src/types/index.ts`
- 工作台页面：`frontend/src/pages/platforms/xhs/fast-download-page.tsx`
- 后端测试：`tests/backend/test_downloader_copy_extract.py`

接口：

```http
POST /api/fast-downloader/copy/extract
```

能力：对小红书链接提取标题、正文文案和视频文案，并保留作者、互动数、标签、来源与失败原因。
