# 验证记录

## 版本与范围

- 日期：2026-11-03。
- 教学源码：`earendil-works/pi@90b42bca6ed161b8e7ee40ceda9755205c2882ec`。
- 实现：8 课中文内容、8 类实验、源码分段阅读、知识检查、搜索/术语、学习路径、进度和笔记。
- OpenSpec：`build-pi-learning`，13 项任务完成。

## 最终检查

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| `npm run lint` | 通过，0 警告 | 应用、脚本、测试、配置 |
| `npm run build` | 通过 | TypeScript strict + Vite 生产构建 |
| `npm run test:e2e` | 22/22 通过，59.5 秒 | Chromium 用户流程与实验 |
| `npm run verify:content` | 通过 | 从 GitHub 固定 commit 核对 8 课、24 高亮、8 自测、4 个源码文件 |
| `npm run verify:content -- --checkout .research/pi-mono` | 通过 | 核对本地 HEAD 与完整 SHA，并逐行核对同一组节选 |
| `openspec validate build-pi-learning --strict` | 通过 | 提案、设计、3 组能力规范、任务 |
| 生产产物浏览器冒烟 | 通过 | `vite preview` 下打开课程，操作工具失败分支直至 agent_end，无 console 错误或警告 |

## Playwright 覆盖

- 8 课导航、刷新直达、浏览器后退、相邻课程、损坏/未知 hash。
- Ctrl/Cmd + K 搜索、自动焦点、空结果、Enter 导航和 Escape 关闭。
- 标签键盘切换、源码固定链接、讲解段和代码高亮联动。
- 每课知识检查的正确/错误反馈。
- 课程完成标记与撤销、刷新保留、独立笔记、损坏/禁用存储时降级。
- 学习路径、术语搜索和回到课程。
- Loop 成功、工具失败和 steering 顺序，播放、暂停、重置和速度。
- 架构、消息、工具、事件、会话、运行控制与扩展实验。
- 实验不发送外部 API 请求。
- 跳转内容焦点、reduced motion、390px 和 768px 下全部八类实验无整页横向溢出。
- 所有测试捕获并断言无 `pageerror`。

## 截图与人工检查

最终截图位于忽略的 `test-results/screenshots/`：

- `desktop-lesson.png`：1440px 桌面完整课程。
- `desktop-source.png`：源码阅读、分段高亮和阅读提示。
- `mobile-lesson.png`：390px 移动端完整课程。

已逐张目视检查文本可读性、间距、连线、按钮、代码滚动和移动端裁切。流程回环通过实际 DOM 坐标确认连接 LLM 与 Context 中心。

## 已修复的问题

1. 搜索弹窗最初把焦点放在关闭按钮：`showModal()` 后显式聚焦输入或笔记文本框。
2. 跳转内容链接改变课程 hash：改为聚焦 main，保留当前课程。
3. 开关装饰层遮挡原生 checkbox：装饰层不接收指针事件。
4. Loop 回环端点与节点中心偏移：使用同一等宽几何容器定位。
5. steering 事件演示顺序：先下一轮 `turn_start`，再注入消息，后续模型步骤避免重复开始事件。
6. 区分低层 `agent_end` 与产品层 `agent_settled`，补充源码节选阅读边界。

## 验证边界

浏览器测试覆盖 Chromium，未执行 Firefox/WebKit。实验是固定数据的教学模拟，未执行真实 Pi 或验证真实模型响应。纯前端学习状态保存在当前浏览器；源码结论绑定上述固定版本。

## UI/UX 精修（2026-11-09）

- OpenSpec 变更 `polish-learning-workspace` 的 5 项任务全部完成，严格校验通过。
- Chromium 回归通过 25 项测试，覆盖目录和嵌套搜索的焦点恢复、换课回到起点、实验前后步进和隐藏暂停、源码高亮定位。
- 逐张检查了 1440px 桌面、768px 平板与 390px 手机的课程及源码。播放按钮在 1440×960 和 390×844 的首屏完整可见。320px、390px 和 768px 均通过整页横向溢出检查。
- ESLint、生产构建和本地固定版本源码核验通过。Impeccable 对课程工作台、实验和源码阅读器的手动检查无静态发现。
