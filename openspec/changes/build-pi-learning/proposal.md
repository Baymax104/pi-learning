## Why

Pi 的消息流、工具调用和会话管理跨越多个包，初学者难以直接从源码建立整体认识。建立一个可逐步阅读、操作验证、再跳转真实源码的中文学习网站，让抽象流程变得可观察。

## What Changes

- 初始化 React + TypeScript + Vite + ESLint、Git 和 OpenSpec。
- 构建课程工作台，提供学习路径、课程搜索、章节切换和本地进度。
- 提供 Agent loop、消息、工具、事件、会话和扩展的中文课程与小测。
- 实现可播放、暂停、单步、重置的交互实验，支持工具失败和 steering 场景。
- 提供固定 commit 的真实源码阅读与逐段中文解释。
- 验证桌面、移动端、键盘与 reduced motion 行为。

## Capabilities

### New Capabilities

- `learning-workspace`: 课程导航、搜索、学习路径、进度、本地笔记和知识检查。
- `agent-visualizer`: 有状态的 Agent loop 教学动画与交互实验。
- `source-reader`: 固定版本源码、符号解释与官方链接。

### Modified Capabilities

无，当前为空项目。

## Impact

新增前端应用、课程数据、研究文档、OpenSpec 变更和 Playwright 测试。运行时仅依赖 React、React DOM 和 lucide-react；不接入后端或收费服务。
