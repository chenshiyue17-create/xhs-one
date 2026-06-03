# tengda.wang

`tengda.wang` 的高级感个人博主网站，基于 `Vite + React + TypeScript + React Router + Markdown` 构建。当前版本定位为可长期更新的个人品牌博客，围绕技术、产品、AI 与个人观察持续写作。

## 项目范围

- 首页：强视觉 hero、精选文章、栏目入口、关于预览
- 文章列表页：按时间排序、支持按栏目筛选
- 文章详情页：Markdown 渲染、上一篇/下一篇
- 关于页：个人介绍、关注主题、联系方式
- 本地 Markdown 内容系统：无需 CMS，可直接维护文章
- 静态构建部署：适合直接部署到你的服务器与域名

## 目录结构

```text
.
├── content/posts/       # Markdown 文章
├── public/assets/       # 主视觉与文章封面图
├── src/components/      # 页面组件
├── src/pages/           # 路由页面
├── src/lib/             # 文章读取与数据处理
├── src/config/          # 站点配置
├── tests/               # smoke tests
├── tasks/               # 后续补充内容清单
├── output/              # 测试输出目录
├── logs/                # 日志目录预留
└── site.config.json     # 博客站点配置
```

## 已实现功能

- 多页面博客路由：`/`、`/posts`、`/posts/:slug`、`/about`
- Markdown 文章加载与 frontmatter 解析
- 精选文章自动聚合
- 按 `技术 / 产品 / AI` 栏目筛选文章
- 高级感暖色编辑风视觉风格
- 示例文章与封面图
- 基础 smoke test 覆盖配置、文章系统、路由与异常场景

## 环境要求

- Node.js 24+
- npm 11+

## 安装依赖

```bash
npm install
```

## 本地启动

```bash
npm run dev
```

默认地址：`http://localhost:4173`

后台持久启动（推荐用于本地服务器/阿里云服务器）：

```bash
npm run dev:start
npm run dev:status
```

停止服务：

```bash
npm run dev:stop
```

## 构建命令

```bash
npm run build
```

构建产物输出到 `dist/`。

## 测试命令

```bash
npm run test
```

完整 smoke 流程：

```bash
npm run smoke
```

## 内容维护方式

### 1. 修改站点基础信息

编辑 [site.config.json](/Users/cc/Documents/AI建站/site.config.json)：

- 站点标题、描述、域名
- 个人介绍、联系方式、社媒链接
- 首页文案
- 栏目名称

### 2. 新增文章

在 `content/posts/` 新建 Markdown 文件，例如：

```md
---
title: "文章标题"
excerpt: "摘要"
date: "2026-05-26"
category: "tech"
tags:
  - "技术"
cover: "/assets/posts/your-cover.svg"
featured: false
---

正文内容...
```

`category` 仅支持：`tech`、`product`、`ai`

### 3. 替换视觉素材

- 首页主视觉：`public/assets/hero-portrait.svg`
- 默认分享图：`public/assets/og-default.svg`
- 文章封面：`public/assets/posts/`

## 部署到你的服务器

### 方式一：Git 拉取后启动开发/预览服务

```bash
git clone https://github.com/chenshiyue17-create/xhs-one.git
cd xhs-one
npm install
npm run smoke
npm run dev:start
```

访问地址：`http://服务器IP:4173`

后续更新时，在服务器项目目录执行：

```bash
npm run deploy:pull
```

### 方式二：静态构建后交给 Nginx/Caddy

1. 服务器执行 `npm install && npm run build`
2. 将 `dist/` 指向服务器目录，例如 `/var/www/tengda.wang/`
3. 将域名 `tengda.wang` 的 DNS `A` 记录指向服务器 IP
4. 使用 Nginx 或 Caddy 指向该目录并启用 HTTPS

### Nginx 示例

```nginx
server {
    listen 80;
    server_name tengda.wang www.tengda.wang;

    root /var/www/tengda.wang;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 失败排查

- `npm install` 失败：检查 Node 与 npm 版本
- 文章不显示：检查 Markdown frontmatter 是否完整，尤其是 `date`、`category`、`cover`
- 详情页刷新 404：确认服务器 `try_files` 已指向 `/index.html`
- 页面图片不显示：确认 `public/assets/` 资源路径与 frontmatter 中 `cover` 一致

## 后续建议

1. 换成你的真实头像/摄影图和真实文章。
2. 增加 SEO meta、站点 favicon、备案信息。
3. 后续可扩展 RSS、站内搜索、评论或 newsletter。
