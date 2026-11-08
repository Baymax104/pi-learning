# Pi 源码研究与课程依据

## 研究范围与版本

- 教学对象：[earendil-works/pi](https://github.com/earendil-works/pi)，Pi Coding Agent 及支持库。
- 核对日期：2026-11-03。
- 固定源码：`90b42bca6ed161b8e7ee40ceda9755205c2882ec`。通过本地浅克隆读取源码，并用 `git ls-remote https://github.com/earendil-works/pi.git HEAD` 核对 SHA。
- 早期地址 `badlogic/pi-mono` 指向现仓库；网站使用现仓库和 `@earendil-works/*` 包名。外部源码仅存于被忽略的 `.research/pi-mono/`，不作为应用依赖。
- 网站的交互是确定性的浏览器教学模拟，不调用模型、不执行真实 shell、不请求 API key。简化示例必须明确标注，不能冒充源码原文。

## 包的职责

| 层 | 当前包 | 负责什么 | 阅读入口 |
| --- | --- | --- | --- |
| 模型接口 | `@earendil-works/pi-ai` | 统一 provider、model、消息和流式事件；提供工具调用的表示和参数校验 | [ai README](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/ai/README.md)、[createModels](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/ai/src/models.ts#L1028) |
| Agent 运行时 | `@earendil-works/pi-agent-core` | 对话状态、循环、工具执行、事件、steering/follow-up 队列 | [Agent](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent.ts#L194)、[agent-loop.ts](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L172) |
| 编程产品 | `@earendil-works/pi-coding-agent` | 内置工具、会话持久化、上下文整理、扩展以及不同运行界面 | [AgentSession](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/src/core/agent-session.ts#L392) |
| 终端界面 | `@earendil-works/pi-tui` | 终端 UI 与差异渲染 | [仓库包清单](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/README.md#packages) |

Pi 当前还有 chord、telemetry、durable 等包。以上是入门课程的核心阅读路径，不代表完整仓库只有这四层。

## 需求一：看懂一次 Agent 运行

### 功能点与准确模型

1. 用“读取 package.json 并说明启动命令”的任务串联 User、LLM、Tool、Context。
2. 单步展示：输入进入上下文 → 模型生成 assistant/toolCall → 运行时执行工具 → toolResult 回填 → 模型再次响应 → 无待处理工作时结束。
3. 展示工具读取失败分支：错误也会成为 `isError: true` 的工具结果；模型可以根据它继续处理。工具失败不等同于 provider 失败。
4. 展示文本直答分支：assistant 不请求工具时无需工具执行阶段。
5. 配合事件流理解 UI：`agent_start`、`turn_start`、`message_start/update/end`、`tool_execution_start/update/end`、`turn_end`、`agent_end`。

### 源码依据

- [agentLoop / runAgentLoop](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L47)：启动运行、发出初始消息事件。
- [runLoop](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L172)：内层处理工具与 steering，外层处理 follow-up。
- [streamAssistantResponse](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L390)：transformContext → convertToLlm → provider 流 → AgentEvent。
- [executePreparedToolCall](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L831)：工具异常变为错误结果。
- [createToolResultMessage](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L940)：用 toolCallId 关联请求和结果。

### 易错点

- 模型只生成调用意图；运行时调用工具函数。不要把模型描绘成直接读取电脑文件。
- 一个 turn 包含一次 assistant 响应及其工具结果；一次 run 可以包含多个 turn。
- 普通路径中有工具结果会引出下一次请求，但并非所有工具调用后都必须再请求：所有 finalized tool result 都设置 `terminate: true` 可结束，`finishTurn` 也可明确结束。
- provider 响应为 `error` 或 `aborted` 时是硬退出；不应演示为无条件再循环。
- `agent_end` 结束低层 run，不表示 coding-agent 会话最终空闲；重试、压缩恢复或排队消息还可能发起新 run。会话级最终空闲事件是 `agent_settled`，见 [扩展生命周期说明](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/docs/extensions.md#L336)。
- steering 的消息事件属于下一 turn：先 `turn_start`，再 steering 的 `message_start/end`，随后请求模型，见 [runLoop 的注入顺序](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L216)。

## 需求二：理解工具与消息

### 功能点与准确模型

1. 工具由名称、说明、JSON Schema 参数和 execute 组成。
2. 操作工具卡片，对照 `toolCall` 与 `toolResult` 的 ID、名称、参数、内容和错误标记。
3. 参数准备 → schema 校验 → beforeToolCall → execute → afterToolCall → finalized 事件与结果。
4. 说明内置 read、bash、edit、write；只读工具集合另有 grep、find、ls。
5. 区分模型可见 `content` 与面向 UI/程序的 `details`、`structuredContent`。

### 源码依据

- [AgentTool / AgentToolResult](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/types.ts#L424)。
- [prepareToolCall](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L718)：未知工具、校验失败、拦截均可直接产生错误结果。
- [createCodingToolDefinitions](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/src/core/tools/index.ts#L164)。
- [createReadToolDefinition](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/src/core/tools/read.ts#L85)。
- [SystemMessage / UserMessage / AssistantMessage](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/ai/src/types.ts#L561)。当前通用消息也包含 system；不可照搬旧版“只有三种 role”的表述。

### 并发语义

当前 `toolExecution` 默认 `parallel`，也支持 `sequential`。parallel 模式先按顺序 preflight，再并发执行允许的调用。`tool_execution_end` 按完成顺序发出，最终 toolResult 消息按 assistant 中调用的原顺序排列。批次中任一工具声明 `executionMode: "sequential"` 会使整个批次串行。

依据：[配置契约](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/types.ts#L303)、[executeToolCalls](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L518)、[executeToolCallsParallel](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L596)。单工具动画不应引申为所有工具默认串行。

## 需求三：理解上下文与会话

1. 以消息积木解释下一次请求携带哪些信息：system、user、assistant、toolResult；自定义 UI 消息可能被转换或过滤。
2. `AgentState.messages` 是对话记录，system prompt 从 system 消息重放得出；当前 `systemPrompt` 是只读派生值。tools 的变更也通过 system 消息声明。
3. Session 是 JSONL 树，entry 有 id/parentId；当前 leaf 对应的 active branch 进入上下文，其他分支不会一起发送。
4. Compaction 将旧消息摘要与最近消息组成后续上下文；原始 entries 保留。不要描述成删除磁盘历史。

依据：[AgentState](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/types.ts#L382)、[declareToolChanges](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent-loop.ts#L342)、[buildSessionContext](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/src/core/session-manager.ts#L577)、[SessionManager](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/src/core/session-manager.ts#L988)、[session-format.md](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/docs/session-format.md)、[compaction.md](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/docs/compaction.md)。

## 需求四：控制与扩展

1. steering 在当前 assistant turn 及工具调用结束之后，下一次请求前注入。**不会跳过当前 assistant 中剩余工具调用**。
2. follow-up 在没有剩余工具调用与 steering、Agent 本来准备停止时消费。
3. abort 发出 AbortSignal，由 provider/工具协作终止；不代表回滚已发生的文件修改。
4. 扩展工厂接收 ExtensionAPI，注册工具、命令和事件。`tool_call` 可拦截/改输入，`tool_result` 可改结果。
5. 扩展与工具使用 Pi 进程权限；扩展机制本身不是 sandbox。

依据：[steer / followUp / abort](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/agent.ts#L307)、[队列契约](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/agent/src/types.ts#L274)、[ExtensionAPI](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/src/core/extensions/types.ts#L1616)、[ExtensionFactory](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/src/core/extensions/types.ts#L2069)、[extensions.md](https://github.com/earendil-works/pi/blob/90b42bca6ed161b8e7ee40ceda9755205c2882ec/packages/coding-agent/docs/extensions.md)。

## 课程组织建议

依次讲解“认识 Pi → Agent loop → 工具调用 → 消息与上下文 → 流式事件 → 会话与压缩 → steering/follow-up → 扩展”。每课包括一个具体问题、简短类比、交互演示、真实源码入口、一道理解检查。避免把刚接触 Agent 的读者带入完整 provider 或 AgentSession 的大文件；先建立可观察的行为，再定位最小符号。

课程站中的示例 trace 是教学编排，事件名称与阶段顺序以固定 commit 为依据；不宣称是实际模型执行日志。

## 2026-11-03 教学准确性复核

- 审查范围：`App.tsx`、`SourceReader.tsx`、`ConceptLab.tsx` 与全部 8 课数据；依据仍为上方固定 commit。
- 8 个源码节选均逐行对照官方文件，仅忽略左缩进差异。`startLine + index` 显示原文件行号正确；24 个讲解高亮范围全部落在片段内。
- 8 课均具备目标、问题讲解、关键概念、对应实验、真实实现入口与理解检查。会话课程的源码片段展示分支路径构建，compaction 通过正文与实验解释，片段说明明确 getBranch 本身不负责摘要重建。
- 复核后将事件课程的泛指“消息”收紧为 assistant 消息，并在正文加入 `agent_end` 与 `agent_settled` 的层级区别；将“原始 provider 事件”改为“模型接口的流式事件”，避免混淆已经统一的事件类型与底层网络协议。
- 会话正文补充首行是会话元信息、其余 entries 通过 parentId 成树，避免把 header 误认为普通树节点。
- 向界面实现方指出两处需同步的实验表达：steering 消息必须在下一 turn_start 后显示；事件实验不应将低层 agent_end 当成会话最终空闲。另建议阅读器呈现 source.notes，以保留片段边界、接口层次与源码范围说明。
- 本轮验证通过 TypeScript strict 独立检查及源码文本比对。此记录为内容与行号专项审查，不代替浏览器交互或全项目测试。
