# Inside Pi

面向初学者的 Pi Agent 中文交互学习网站。以 [earendil-works/pi](https://github.com/earendil-works/pi) 为教学对象，通过讲解、可控制动画、概念实验和真实源码，理解 Agent 如何从语言走向行动。

## 在线部署

Vercel 已连接 GitHub 仓库。推送到 `main` 后自动构建并更新生产站点，推送到仓库的其他分支会创建 Preview。构建配置位于 `vercel.json`，使用 `npm ci` 安装依赖，执行 `npm run build`，并发布 `dist/` 中的静态文件。

[在线学习](https://pi-learning-nine.vercel.app/) · [GitHub 仓库](https://github.com/Baymax104/pi-learning) · [Vercel 部署记录](https://vercel.com/baymax104s-projects/pi-learning/deployments)

## 本地运行

建议使用 Node.js 24 LTS 和 npm。

```powershell
npm ci
npm run dev
```

打开命令输出的本地地址。默认进入「Agent 的工作循环」，也可以从学习路径第一课开始。

## 课程与功能

| 课程 | 交互方式 |
| --- | --- |
| 认识 Pi | 点击架构层，观察各个包的职责 |
| Agent 的工作循环 | 播放、暂停、单步、重置；成功、工具失败和 steering 场景 |
| 工具，让 Agent 能行动 | 改变文件参数，检查工具成功和错误结果 |
| 消息与上下文 | 检查 system、user、assistant 和 toolResult |
| 看见流式事件 | 选择运行阶段，对照事件和界面变化 |
| 会话与上下文压缩 | 切换会话分支，观察上下文摘要 |
| 引导、跟进与中止 | 比较 steering、follow-up 与 abort 的生效时机 |
| 用扩展塑造 Pi | 启用或关闭规则，模拟拦截工具调用 |

每课包含原理讲解、交互实验、源码导读和带解析的知识检查。课程完成标记与独立笔记存储在当前浏览器；支持课程搜索（Ctrl/Cmd + K）、术语筛选、hash 深链接、键盘操作和移动端目录。

所有实验使用浏览器预设数据，不调用模型、不读取本地文件、不执行真实工具。生产运行只需要静态文件托管，不需要后端、账号或 API key。

## 源码依据

课程固定于 `earendil-works/pi@90b42bca6ed161b8e7ee40ceda9755205c2882ec`（2026-11-03 核对）。源码导读采用连续真实节选，仅调整缩进，显示原文件行号；每个片段可以跳转到固定 commit 的官方页面。

当前版本的工具默认并发执行；steering 在当前批工具完成后、下一次模型请求前注入。课程区分低层 run 的 `agent_end` 与产品会话的 `agent_settled`，也区分磁盘会话历史和发送模型的上下文。

详见 [源码研究](docs/pi-source-research.md) 与 [需求及技术调研](docs/requirements.md)。

## 验证与构建

```powershell
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
npm run verify:content
```

`verify:content` 检查课程结构、答案、高亮范围，并从固定版本官方源码逐行核对片段。默认需要网络；如已有对应版本的本地源码，可传入：

```powershell
npm run verify:content -- --checkout .research/pi-mono
```

Playwright 会自动启动或复用 `127.0.0.1:4173` 开发服务。测试覆盖学习流程、实验分支、笔记/进度、存储异常、390px/768px 布局、键盘和 reduced motion；截图输出到 `test-results/screenshots/`。

```powershell
npm run preview
```

生产资源输出到 `dist/`。使用相对资源地址和 hash 课程路由，支持部署到静态站点子路径，无需服务端路由重写。

## 项目结构

```text
src/
  components/      # 实验、源码阅读器与弹窗
  data/            # 课程、概念、自测和源码元数据
  lib/             # 带校验和异常保护的本地存储
  App.tsx          # 课程工作台与 hash 导航
tests/             # Playwright 用户流程
scripts/           # 内容核验
docs/              # 需求、研究与验证记录
openspec/changes/  # 本次提案、设计、规范和任务
```

## 变更管理

项目使用 OpenSpec 的 `spec-driven` 工作流。中大型功能先更新提案、规范和任务，再实现与验证。

该网站是独立的非官方学习项目。Pi 上游源码采用 MIT License，相关署名与许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
