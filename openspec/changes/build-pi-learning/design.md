## Context

空工作区；用户明确要求 TypeScript + React + ESLint、纯前端、OpenSpec 管理和 Playwright 测试。源码研究位于 `docs/pi-source-research.md`，需求分解位于 `docs/requirements.md`。

## Goals / Non-Goals

**Goals:** 提供完整中文学习路径、受控动画、概念实验、源代码导读、本地学习状态；桌面和移动端可用。

**Non-Goals:** 执行真实 Pi、调用 LLM API、服务器账户、在线代码运行与云同步。

## Decisions

1. Vite + React + TypeScript strict，使用 ESLint flat config；相较完整全栈框架，更适合无后端静态站点。
2. 课程使用强类型静态数据，组件负责渲染；源代码链接固定 commit，教学片段注明简化。八课涵盖项目、loop、消息、工具、事件、会话、扩展与实践。
3. CSS/SVG 与 React 状态负责交互图；采用确定性演示事件，工具失败和 steering 分支独立；播放用可清理的 timer。相较视频，学习者可以单步检查状态。
4. hash 路由无需托管 rewrite；本地进度/笔记用带校验、异常保护的 storage 封装。无需账号即可开始学习。
5. 界面为导航、阅读区和辅助目录；浅灰纸面、克制紫色交互色，连接线承担流程意义。系统字体避免字体网络依赖。
6. Playwright 验证课程闭环、实验控制和错误分支、持久化、深链、搜索、移动端、键盘与 reduced motion；build/lint 检查代码一致性。

## Risks / Trade-offs

- [源码演进] → 固定 SHA，在界面与研究文档显示版本。
- [教学简化] → 明示浏览器模拟与节选，不宣称浏览器执行源码。
- [存储异常] → 严格校验并捕获读写错误，降级到当前内存状态。
- [移动屏幕容纳复杂图] → 采用自适应排列与横向代码滚动，整页不溢出。
- [动画对部分用户造成不适] → 不自动播放，尊重 reduced motion，保留单步控制。
