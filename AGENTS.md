# 项目协作规范

## 目标与技术栈

- 构建面向初学者的 Pi Agent 中文学习网站，教学对象为 `earendil-works/pi`。
- 使用 TypeScript、React、Vite 与 ESLint；使用 npm 管理依赖。
- 纯前端运行。教学模拟在浏览器内执行，不调用模型 API、不执行真实工具、不要求密钥。

## 工作流程

1. 先研究官方源码并在 `docs/pi-source-research.md` 固定 commit 和引用。
2. 中大型功能先更新 `openspec/changes/` 中的 proposal、specs、design、tasks。
3. 小步实现，及时勾选已完成且验证过的任务。
4. 提交结果前执行 `npm run lint`、`npm run build`、`npm run test:e2e`。

## 实现约定

- 课程与源代码引用集中存放在 `src/data/`，组件放在 `src/components/`。
- 使用语义化 HTML，所有交互有键盘入口和可见焦点，动画支持 reduced motion。
- 持久化仅使用 localStorage，并处理损坏数据和禁用存储的情况。
- 明确区分教学伪代码、演示事件与真实源码，引用使用固定 commit permalink。
- 不加入没有必要的依赖或后端，不执行真实 shell/模型请求。
- 中文优先，保留真实 API、事件和包名的英文拼写。

## 安全与 Git

- Windows PowerShell 环境；检索优先 `rg`，禁止保留设备文件名。
- 保留无关工作区改动，不执行破坏性 Git 操作。
- 本次授权初始化 Git；未经用户明确要求，不 commit、push、merge 或重写历史。
- 若以后要求提交，使用 Conventional Commits，提交信息使用简体中文。
