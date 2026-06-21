# Notes Automation System — Design Spec

## Overview

为 Annieif 静态站点添加本地笔记管理面板、定时发布系统和订阅管理功能。

## Architecture

```
admin.html (本地)            GitHub Actions (云端)
     │                              │
     ├─ 读写 notes/data.js ─────────┤
     ├─ 读写 notes/queue.json ──────┤
     │                              │
     │                    publish-notes.yml (定时)
     │                    queue.json → data.js
     │
     │                    subscription.yml (webhook)
     │                    表单提交 → Issue 创建
```

## Components

### 1. 本地管理面板 `admin.html`

- 本地 HTML 文件，不部署到线上
- 使用 File System Access API (`showDirectoryPicker`) 读写本地仓库文件
- 功能：
  - **新建笔记**：标题、日期、描述、正文（Markdown 实时预览）
  - **定时笔记**：同上 + `publishDate` 字段，存入 `notes/queue.json`
  - **编辑/删除**：管理 data.js 中的已有笔记和 queue.json 中的定时笔记
  - **双视图**：Live 标签页（data.js）和 Queue 标签页（queue.json）
- 预览复用 `parseNoteContent()` 函数

### 2. 定时发布队列 `notes/queue.json`

```json
[
  {
    "publishDate": "2026-07-01",
    "date": "2026-07-01",
    "title": "笔记标题",
    "desc": "一句话描述",
    "content": "Markdown 正文..."
  }
]
```

- 纯 JSON 格式，便于 Node.js 脚本读写
- 与 data.js 分离，自动化不触碰 data.js

### 3. 自动发布文件 `notes/auto-published.json`

- GitHub Action 将到期笔记从 queue.json 移入此文件
- `index.html` 同时加载 `data.js` + `auto-published.json`，合并显示
- 格式与 NOTED_DATA 数组项一致

### 4. GitHub Actions

#### publish-notes.yml
- 触发：`schedule: 0 */6 * * *`（每 6 小时）+ `workflow_dispatch`（手动触发）
- 流程：
  1. Checkout 仓库
  2. 运行 `scripts/publish.js`（Node.js 脚本）
  3. 读取 queue.json，找出 `publishDate <= 今天` 的笔记
  4. 追加到 auto-published.json
  5. 从 queue.json 移除
  6. 如有变更，commit + push

#### subscription.yml
- 触发：`workflow_dispatch`（通过表单 POST 触发）
- 输入：`name`、`email`
- 流程：创建带 `subscription` 标签的 GitHub Issue

### 5. 订阅表单

- 在 index.html 的 Contact 区添加订阅表单
- 字段：姓名（可选）、邮箱（必填）
- 提交方式：POST 到 GitHub Actions workflow_dispatch 端点
- Issue 模板：`[Subscription] {name} — {email}`

### 6. 前端合并逻辑

- `index.html` 加载 `notes/data.js`（NOTES_DATA）
- 额外 fetch `notes/auto-published.json`
- 合并两个数组，按日期排序
- 渲染时自动处理

## File Changes

| 文件 | 操作 | 说明 |
|:---|:---|:---|
| `admin.html` | 新建 | 本地管理面板 |
| `notes/queue.json` | 新建 | 定时发布队列 |
| `notes/auto-published.json` | 新建 | 自动发布的笔记 |
| `.github/workflows/publish-notes.yml` | 新建 | 定时发布 Action |
| `.github/workflows/subscription.yml` | 新建 | 订阅 Issue Action |
| `scripts/publish.js` | 新建 | 队列处理脚本 |
| `index.html` | 修改 | 订阅表单 + 加载 auto-published.json |

## What Stays Manual

- `works/` 目录 — 完全手动管理
- `notes/data.js` — 只通过 admin.html 手动编辑，不被自动化修改
- 站点样式、多语言、星空等 — 不受影响

## Error Handling

- admin.html 保存失败时提示用户检查文件权限
- GitHub Action 失败时 workflow 报错，不影响已有数据
- queue.json 格式错误时 publish.js 跳过并记录日志
- 订阅表单提交失败时显示友好提示