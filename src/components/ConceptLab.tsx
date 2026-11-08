import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  Braces,
  Check,
  ChevronRight,
  CircleCheck,
  Code2,
  FileText,
  GitBranch,
  Layers,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ShieldX,
  SkipBack,
  SkipForward,
  Terminal,
  User,
  Workflow,
} from "lucide-react";
import "./concept-lab.css";

type LabKind =
  | "architecture"
  | "loop"
  | "tools"
  | "messages"
  | "events"
  | "context"
  | "control"
  | "extensions";
type Scenario = "success" | "error" | "steering";
type LoopStep = {
  node: number;
  title: string;
  text: string;
  event: string;
  payload: string;
};

const nodes = [
  { title: "用户输入", english: "User", icon: User },
  { title: "模型决策", english: "LLM", icon: Braces },
  { title: "执行工具", english: "Tool", icon: Terminal },
  { title: "更新上下文", english: "Context", icon: Layers },
];

function makeSteps(scenario: Scenario): LoopStep[] {
  const failed = scenario === "error";
  const path = failed ? "missing.json" : "package.json";
  const steps: LoopStep[] = [
    {
      node: 0,
      title: "一条消息，开启一次运行",
      text: `用户想知道项目如何启动。Pi 把请求加入对话记录，随后开启一个 turn。`,
      event: "agent_start → turn_start",
      payload: "user: 请读取项目配置，告诉我如何启动。",
    },
    {
      node: 1,
      title: "模型提出工具调用",
      text: "模型此刻没有读取文件；它只生成一个 toolCall，描述希望调用什么工具、使用哪些参数。",
      event: "message_start → message_end",
      payload: `toolCall: read({ path: "${path}" })`,
    },
    {
      node: 2,
      title: "运行时执行 read",
      text: "Pi 校验参数，调用 read 工具。这里是本地教学模拟；真实 Pi 会由工具函数读取文件。",
      event: "tool_execution_start",
      payload: `execute("call_01", { path: "${path}" })`,
    },
    {
      node: 3,
      title: failed ? "错误也是一条工具结果" : "把工具结果放回上下文",
      text: failed
        ? "读取失败被包装为 isError: true 的 toolResult。错误会返回给模型，模型可以据此解释或调整方案。"
        : "工具输出以 toolResult 回到消息记录，并通过 toolCallId 与刚才的请求对应。一次 turn 到这里结束。",
      event: "tool_execution_end → turn_end",
      payload: failed
        ? 'toolResult: { toolCallId: "call_01", isError: true, content: "ENOENT: missing.json" }'
        : 'toolResult: { toolCallId: "call_01", isError: false, content: "scripts.dev = vite" }',
    },
  ];
  if (scenario === "steering")
    steps.push({
      node: 3,
      title: "在下轮请求前注入 steering",
      text: "当前工具批次已完成。Pi 开启下一个 turn，把“只告诉我启动命令”加入下一轮上下文；它不会跳过当前批次中的其他工具。",
      event: "turn_start → message_start → message_end",
      payload: "user (steering): 只告诉我启动命令。",
    });
  steps.push(
    {
      node: 1,
      title: "带着新信息，再问一次模型",
      text: failed
        ? "模型看到了工具错误，可以告诉用户文件不存在。工具失败不等于整个程序崩溃。"
        : "模型收到原问题、工具调用和工具结果，终于有依据给出答案。若还需要信息，它也可以再次请求工具。",
      event:
        scenario === "steering"
          ? "message_update → turn_end"
          : "turn_start → message_update → turn_end",
      payload: failed
        ? "assistant: 没有找到 missing.json，请确认文件路径。"
        : scenario === "steering"
          ? "assistant: npm run dev"
          : "assistant: 配置中的 dev 脚本为 vite，运行 npm run dev 即可启动。",
    },
    {
      node: -1,
      title: "没有待处理工作，运行结束",
      text: "这个例子中没有新的工具调用、steering 或 follow-up，Pi 发出 agent_end。一次 run 可以包含多个 turn。",
      event: "agent_end",
      payload: "状态：已完成。你可以重置，或换一个场景继续观察。",
    },
  );
  return steps;
}

function LabLabel({ children }: { children: ReactNode }) {
  return (
    <div className="clab-heading">
      <span className="clab-heading-icon">
        <Workflow size={15} />
      </span>
      <span>{children}</span>
      <span className="clab-simulation">教学模拟</span>
    </div>
  );
}

function AgentLoop({ compact, active }: { compact: boolean; active: boolean }) {
  const [scenario, setScenario] = useState<Scenario>("success");
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const steps = makeSteps(scenario);
  const current = stage > 0 ? steps[stage - 1] : undefined;
  const finished = stage === steps.length;
  const forwardEdge = stage >= 2 && stage <= nodes.length ? stage - 2 : -1;
  const returningToModel = current?.node === 1 && stage > nodes.length;

  if (!active && playing) setPlaying(false);

  useEffect(() => {
    if (!active || !playing) return;
    const timer = window.setTimeout(() => {
      setStage((value) => Math.min(value + 1, steps.length));
      if (stage + 1 >= steps.length) setPlaying(false);
    }, 1900 / speed);
    return () => window.clearTimeout(timer);
  }, [active, playing, stage, steps.length, speed]);

  function reset() {
    setStage(0);
    setPlaying(false);
  }

  function togglePlayback() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (stage === 0 || finished) setStage(1);
    setPlaying(true);
  }

  function stepBy(offset: number) {
    setPlaying(false);
    setStage((value) => Math.min(steps.length, Math.max(0, value + offset)));
  }

  return (
    <section
      className={`clab clab-loop ${compact ? "clab-compact" : ""}`}
      data-testid="concept-lab"
    >
      <div className="clab-topline">
        <LabLabel>一次 Agent 运行</LabLabel>
        <label className="clab-select-label">
          <span className="clab-sr-only">演示场景</span>
          <select
            aria-label="演示场景"
            value={scenario}
            onChange={(event) => {
              setScenario(event.target.value as Scenario);
              reset();
            }}
          >
            <option value="success">基础流程</option>
            <option value="error">工具失败</option>
            <option value="steering">Steering 插队</option>
          </select>
        </label>
      </div>
      <div
        className="clab-loop-canvas"
        aria-label="用户输入、模型决策、工具执行、上下文更新流程图"
      >
        <div className="clab-task">
          <MessageSquare size={13} />
          <span>“帮我看看，这个项目怎么启动？”</span>
        </div>
        <div className="clab-flow-geometry">
          <div className="clab-flow-nodes">
            {nodes.map((node, index) => (
              <div
                key={node.english}
                className={`clab-flow-node ${current?.node === index ? "is-active" : ""} ${finished ? "is-complete" : ""}`}
                aria-current={current?.node === index ? "step" : undefined}
              >
                <span className="clab-node-icon">
                  <node.icon size={23} strokeWidth={1.65} />
                </span>
                <strong>{node.title}</strong>
                <span className="clab-node-name">{node.english}</span>
                {index < nodes.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`clab-node-link ${forwardEdge === index ? "is-active" : ""}`}
                  >
                    <ArrowRight className="clab-node-arrow" size={16} />
                  </span>
                )}
              </div>
            ))}
          </div>
          <div
            className={`clab-return-path ${returningToModel ? "is-active" : ""}`}
          >
            <span>带着工具结果，进入下一轮决策</span>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
      <div className="clab-controls">
        <div
          className="clab-controls-main"
          role="group"
          aria-label="播放与步进"
        >
          <button
            type="button"
            className="clab-play"
            onClick={togglePlayback}
            aria-label={playing ? "暂停动画" : "播放动画"}
          >
            {playing ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
            {playing ? "暂停" : finished ? "重新播放" : "播放演示"}
          </button>
          <button
            type="button"
            className="clab-text-button"
            disabled={stage === 0}
            onClick={() => stepBy(-1)}
          >
            <SkipBack size={15} />
            上一步
          </button>
          <button
            type="button"
            className="clab-text-button"
            disabled={finished}
            onClick={() => stepBy(1)}
          >
            <SkipForward size={15} />
            下一步
          </button>
        </div>
        <div
          className="clab-controls-options"
          role="group"
          aria-label="播放选项"
        >
          <button
            type="button"
            className="clab-icon-button"
            onClick={reset}
            aria-label="重置演示"
            title="重置演示"
          >
            <RotateCcw size={15} />
          </button>
          <label className="clab-speed">
            <span className="clab-sr-only">播放速度</span>
            <select
              aria-label="播放速度"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            >
              <option value={1}>1× 速度</option>
              <option value={1.5}>1.5× 速度</option>
              <option value={2}>2× 速度</option>
            </select>
          </label>
          <span className="clab-step-count">
            <span className="clab-sr-only">当前步骤 </span>
            {stage} / {steps.length}
          </span>
        </div>
      </div>
      <div
        className="clab-current"
        data-testid="loop-stage"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="clab-stage-marker">
          {finished ? <Check size={16} /> : String(stage).padStart(2, "0")}
        </div>
        <div className="clab-step-copy">
          <strong>{current?.title ?? "准备好了？让消息流动起来"}</strong>
          <p>
            {current?.text ??
              "播放完整过程，或用上一步和下一步仔细观察每次交接。"}
          </p>
          {current && (
            <div className="clab-step-data">
              <span>示例数据</span>
              <code>{current.payload}</code>
            </div>
          )}
        </div>
      </div>
      {!compact && (
        <div className="clab-log" data-testid="loop-log">
          <div className="clab-log-heading">
            <Terminal size={14} />
            <span>演示事件</span>
            <span>按教学阶段分组</span>
          </div>
          {stage === 0 ? (
            <p className="clab-empty">推进流程后，在这里观察事件与消息。</p>
          ) : (
            <ol>
              {steps.slice(0, stage).map((step, index) => (
                <li key={index}>
                  <span className="clab-log-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{step.event}</strong>
                    <code>{step.payload}</code>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

const architecture = [
  {
    name: "pi-coding-agent",
    label: "把能力变成产品",
    icon: Code2,
    description:
      "编程工具、会话管理、上下文整理和扩展在这里组合。AgentSession 将运行时事件与产品行为连接起来。",
    detail: "入口：packages/coding-agent/src/core/agent-session.ts",
  },
  {
    name: "pi-agent-core",
    label: "让对话持续运转",
    icon: Workflow,
    description:
      "Agent 管理消息与运行状态，agent loop 连接模型响应、工具执行和下一轮请求。steering 与 follow-up 队列也在这一层。",
    detail: "入口：packages/agent/src/agent-loop.ts",
  },
  {
    name: "pi-ai",
    label: "与不同模型说同一种语言",
    icon: Braces,
    description:
      "统一模型、provider、消息类型和流式响应。它提供模型接口，并不负责运行编程工具或保存会话。",
    detail: "入口：packages/ai/src/types.ts",
  },
];

function ArchitectureLab() {
  const [selected, setSelected] = useState(1);
  const item = architecture[selected];
  return (
    <section className="clab" data-testid="concept-lab">
      <LabLabel>点击一层，理解它的职责</LabLabel>
      <div className="clab-architecture">
        <div className="clab-layer-list">
          {architecture.map((layer, index) => (
            <button
              type="button"
              key={layer.name}
              aria-pressed={selected === index}
              className={`clab-layer ${selected === index ? "is-selected" : ""}`}
              onClick={() => setSelected(index)}
            >
              <layer.icon size={19} />
              <span>
                <strong>{layer.name}</strong>
                <small>{layer.label}</small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
        <div className="clab-detail" aria-live="polite">
          <span className="clab-detail-kicker">
            @earendil-works/{item.name}
          </span>
          <h3>{item.label}</h3>
          <p>{item.description}</p>
          <code>{item.detail}</code>
        </div>
      </div>
      <p className="clab-footnote">
        这是核心阅读路径。Pi 仓库还包括 TUI、telemetry 等其他包。
      </p>
    </section>
  );
}

const messages = [
  {
    role: "system",
    content: "你是编程助手。使用已声明的工具帮助用户。",
    explanation:
      "定义模型的行为约定和工具声明。当前 Pi 消息类型包含 system，systemPrompt 由 transcript 中的 system 消息派生。",
    color: "gray",
  },
  {
    role: "user",
    content: "请读取 package.json，告诉我启动命令。",
    explanation: "用户提出任务。这条消息与先前上下文一起成为模型请求的一部分。",
    color: "purple",
  },
  {
    role: "assistant",
    content: 'toolCall: read({ path: "package.json" })',
    explanation:
      "assistant 消息不一定只有文本，也可以包含 toolCall。模型输出调用意图，工具由运行时执行。",
    color: "purple",
  },
  {
    role: "toolResult",
    content: "toolCallId: call_01\ncontent: scripts.dev = vite",
    explanation:
      "工具结果使用 toolCallId 关联调用。content 发给模型；details、structuredContent 主要供 UI 或程序使用，不作为模型可见工具输出。",
    color: "green",
  },
];

function MessagesLab() {
  const [selected, setSelected] = useState(0);
  return (
    <section className="clab" data-testid="concept-lab">
      <LabLabel>检查下一次请求中的消息</LabLabel>
      <div className="clab-message-layout">
        <div className="clab-message-list">
          {messages.map((message, index) => (
            <button
              type="button"
              className={`clab-message ${selected === index ? "is-selected" : ""}`}
              key={message.role}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <span className={`clab-role clab-role-${message.color}`}>
                {message.role}
              </span>
              <span>{message.content}</span>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
        <div className="clab-detail" aria-live="polite">
          <span className="clab-detail-kicker">消息 {selected + 1} / 4</span>
          <h3>{messages[selected].role}</h3>
          <p>{messages[selected].explanation}</p>
        </div>
      </div>
      <p className="clab-footnote">
        消息内容为教学示例。真实请求还会经过上下文转换与消息格式转换。
      </p>
    </section>
  );
}

function ToolsLab() {
  const [path, setPath] = useState("package.json");
  const [result, setResult] = useState<"success" | "error" | null>(null);
  return (
    <section className="clab" data-testid="concept-lab">
      <LabLabel>把工具调用与结果对应起来</LabLabel>
      <div className="clab-tool-grid">
        <div className="clab-tool-config">
          <div className="clab-detail-kicker">工具定义 · read</div>
          <h3>模型选择参数，Pi 执行函数</h3>
          <pre>
            {
              '{\n  name: "read",\n  parameters: { path: "string" },\n  execute: async (id, params) => ...\n}'
            }
          </pre>
          <label className="clab-field">
            选择文件路径
            <select
              aria-label="工具文件路径"
              value={path}
              onChange={(event) => {
                setPath(event.target.value);
                setResult(null);
              }}
            >
              <option value="package.json">package.json · 文件存在</option>
              <option value="missing.json">missing.json · 文件不存在</option>
            </select>
          </label>
          <button
            type="button"
            className="clab-play"
            onClick={() =>
              setResult(path === "package.json" ? "success" : "error")
            }
          >
            <Play size={14} />
            模拟执行 read
          </button>
        </div>
        <div
          className={`clab-tool-result ${result === "error" ? "is-error" : ""}`}
          aria-live="polite"
        >
          <div className="clab-detail-kicker">toolResult</div>
          {result ? (
            <>
              <h3>
                {result === "success" ? "读取成功" : "读取失败，回填错误结果"}
              </h3>
              <pre>
                {JSON.stringify(
                  {
                    role: "toolResult",
                    toolCallId: "call_01",
                    toolName: "read",
                    isError: result === "error",
                    content: [
                      {
                        type: "text",
                        text:
                          result === "success"
                            ? '{ "scripts": { "dev": "vite" } }'
                            : "ENOENT: missing.json",
                      },
                    ],
                  },
                  null,
                  2,
                )}
              </pre>
              <p>错误结果也会进入上下文，模型可以据此继续响应。</p>
            </>
          ) : (
            <div className="clab-result-placeholder">
              <Terminal size={28} />
              <p>选择路径，再执行一次模拟。</p>
              <span>不会访问你电脑上的文件</span>
            </div>
          )}
        </div>
      </div>
      <p className="clab-footnote">
        上方定义是教学伪代码。当前 Pi
        默认并发执行允许并发的工具；单工具示例不代表默认串行。
      </p>
    </section>
  );
}

const eventStages = [
  {
    title: "开始运行",
    event: "agent_start",
    description: "界面可以进入运行状态。一次 run 只有一个开始和最终结束。",
    preview: "正在处理你的请求…",
  },
  {
    title: "流式文本",
    event: "message_update",
    description:
      "模型响应逐步到达。UI 根据消息增量更新，而不是等待整段完成才绘制。",
    preview: "我来读取项目配置，确认启动方式。",
  },
  {
    title: "工具开始",
    event: "tool_execution_start",
    description:
      "工具开始执行。工具执行更新可以继续通过 tool_execution_update 发送到界面。",
    preview: "read  package.json\n读取中…",
  },
  {
    title: "工具完成",
    event: "tool_execution_end",
    description:
      "最终工具结果就绪。并发工具的完成事件按实际完成顺序出现；最终消息仍保持调用源顺序。",
    preview: "✓ read  package.json\n找到 scripts.dev = vite",
  },
  {
    title: "结束运行",
    event: "agent_end",
    description:
      "一次低层 Agent run 结束。coding-agent 可能还有重试或上下文压缩；产品层确认最终空闲，应观察 agent_settled。",
    preview: "本次 Agent run 已结束。",
  },
];

function EventsLab() {
  const [selected, setSelected] = useState(0);
  const item = eventStages[selected];
  return (
    <section className="clab" data-testid="concept-lab">
      <LabLabel>从事件看见界面的变化</LabLabel>
      <div className="clab-event-steps" aria-label="事件阶段">
        {eventStages.map((stage, index) => (
          <button
            type="button"
            key={stage.event}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
            className={selected === index ? "is-selected" : ""}
          >
            <span>{index + 1}</span>
            {stage.title}
          </button>
        ))}
      </div>
      <div className="clab-event-layout">
        <div className="clab-detail" aria-live="polite">
          <span className="clab-detail-kicker">当前事件</span>
          <h3>
            <code>{item.event}</code>
          </h3>
          <p>{item.description}</p>
        </div>
        <div className="clab-ui-preview">
          <div className="clab-preview-title">
            <span className="clab-preview-dot" />
            界面如何响应
          </div>
          <div className="clab-preview-message">
            <span className="clab-preview-avatar">π</span>
            <p>{item.preview}</p>
          </div>
        </div>
      </div>
      <p className="clab-footnote">
        按教学阶段展示代表事件，实际 trace 还包含
        turn_start/end、message_start/end 等事件。
      </p>
    </section>
  );
}

function ContextLab() {
  const [branch, setBranch] = useState<"a" | "b">("a");
  const [compacted, setCompacted] = useState(false);
  return (
    <section className="clab" data-testid="concept-lab">
      <LabLabel>选择一条会话分支</LabLabel>
      <div className="clab-context-layout">
        <div className="clab-tree">
          <div className="clab-tree-root">
            <MessageSquare size={17} />
            <span>用户：给我一个实现方案</span>
          </div>
          <ArrowDown size={17} />
          <div className="clab-tree-root">
            <FileText size={17} />
            <span>共享的对话历史</span>
          </div>
          <div className="clab-tree-split">
            <GitBranch size={22} />
          </div>
          <div className="clab-tree-branches">
            <button
              type="button"
              aria-pressed={branch === "a"}
              className={branch === "a" ? "is-selected" : ""}
              onClick={() => setBranch("a")}
            >
              分支 A<span>用 React 实现</span>
            </button>
            <button
              type="button"
              aria-pressed={branch === "b"}
              className={branch === "b" ? "is-selected" : ""}
              onClick={() => setBranch("b")}
            >
              分支 B<span>用原生 JS 实现</span>
            </button>
          </div>
        </div>
        <div className="clab-context-output">
          <span className="clab-detail-kicker">下一次模型请求的上下文</span>
          <div className="clab-context-chip">
            {compacted ? "较早历史的摘要" : "当前分支的共享历史"}
          </div>
          <div className="clab-context-chip">
            {branch === "a" ? "用 React 实现" : "用原生 JS 实现"}
          </div>
          <p>
            只沿 active leaf 的 parentId 路径构建上下文，另一个分支不一起发送。
          </p>
          <button
            type="button"
            className="clab-text-button"
            aria-pressed={compacted}
            onClick={() => setCompacted((value) => !value)}
          >
            <Layers size={15} />
            {compacted ? "恢复未压缩视图" : "模拟上下文压缩"}
          </button>
          {compacted && (
            <p className="clab-success-text" role="status">
              <Check size={14} />
              摘要进入后续上下文，原始 JSONL 历史仍保留。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

const controls = [
  {
    name: "steering",
    title: "调整当前方向",
    time: "当前工具批次结束后",
    text: "把补充消息排入 steering 队列，在下一次模型请求前注入。当前批次中剩余工具仍会完成。",
    sample: "只告诉我启动命令。",
    result: "当前工具批次完成 → 注入 steering → 下轮模型请求",
  },
  {
    name: "follow-up",
    title: "安排后续任务",
    time: "本次运行准备停止时",
    text: "没有待执行工具和 steering 后，Pi 再消费 follow-up。适合当前任务完成后继续做下一件事。",
    sample: "接下来解释 build 脚本。",
    result: "当前任务收尾 → 消费 follow-up → 开始后续 turn",
  },
  {
    name: "abort",
    title: "请求中止运行",
    time: "通过 AbortSignal 协作中止",
    text: "向 provider 和工具传递中止信号。它不是文件修改回滚；工具是否及时停止取决于对信号的响应。",
    sample: "停止当前运行。",
    result: "发出 AbortSignal → provider / 工具协作停止 → 运行结束",
  },
];

function ControlLab() {
  const [selected, setSelected] = useState(0);
  const [sent, setSent] = useState(false);
  const item = controls[selected];
  return (
    <section className="clab" data-testid="concept-lab">
      <LabLabel>同一句补充，什么时候生效？</LabLabel>
      <div className="clab-segmented" aria-label="运行控制方式">
        {controls.map((control, index) => (
          <button
            type="button"
            key={control.name}
            aria-pressed={index === selected}
            onClick={() => {
              setSelected(index);
              setSent(false);
            }}
            className={index === selected ? "is-selected" : ""}
          >
            {control.name}
          </button>
        ))}
      </div>
      <div className="clab-control-detail">
        <span className="clab-detail-kicker">{item.time}</span>
        <h3>{item.title}</h3>
        <p>{item.text}</p>
        <div className="clab-control-sample">
          <MessageSquare size={16} />
          <span>{item.sample}</span>
          <button
            type="button"
            className="clab-play"
            onClick={() => setSent(true)}
          >
            <ArrowRight size={14} />
            模拟{item.name === "abort" ? "中止" : "发送"}
          </button>
        </div>
        {sent && (
          <div className="clab-control-timeline" role="status">
            <CircleCheck size={17} />
            <span>{item.result}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ExtensionsLab() {
  const [protectedOn, setProtectedOn] = useState(true);
  const [ran, setRan] = useState(false);
  const blocked = ran && protectedOn;
  return (
    <section className="clab" data-testid="concept-lab">
      <LabLabel>给工具调用加一道扩展检查</LabLabel>
      <div className="clab-extension-setting">
        <div>
          <ShieldCheck size={19} />
          <span>
            <strong>阻止写入 .env 文件</strong>
            <small>教学示例：监听 tool_call 事件</small>
          </span>
        </div>
        <label className="clab-toggle">
          <input
            type="checkbox"
            checked={protectedOn}
            onChange={(event) => {
              setProtectedOn(event.target.checked);
              setRan(false);
            }}
            aria-label="启用扩展拦截"
          />
          <span />
          {protectedOn ? "已启用" : "已关闭"}
        </label>
      </div>
      <div className="clab-extension-pipeline">
        <span>
          <Code2 size={19} />
          write(".env")
        </span>
        <ArrowRight size={17} />
        <span className={protectedOn ? "is-active" : ""}>
          <Settings2 size={19} />
          tool_call 检查
        </span>
        <ArrowRight size={17} className={blocked ? "is-blocked" : ""} />
        <span className={blocked ? "is-blocked" : ran ? "is-allowed" : ""}>
          {blocked ? <ShieldX size={19} /> : <Terminal size={19} />}
          {blocked ? "已拦截" : "execute"}
        </span>
      </div>
      <button type="button" className="clab-play" onClick={() => setRan(true)}>
        <Play size={14} />
        测试工具调用
      </button>
      {ran && (
        <div
          className={`clab-extension-feedback ${protectedOn ? "is-blocked" : "is-allowed"}`}
          role="status"
        >
          <strong>
            {protectedOn
              ? "扩展拦截：工具没有执行"
              : "扩展放行：进入工具执行阶段"}
          </strong>
          <p>
            {protectedOn
              ? "扩展返回 block: true 和原因。运行时把拦截转为工具错误结果，再交给模型处理。"
              : "关闭这条扩展规则后，示例请求进入 execute。这里只改变浏览器状态，不会写入文件。"}
          </p>
        </div>
      )}
      <p className="clab-footnote">
        扩展还可以注册工具、命令和事件处理器。扩展与工具具有 Pi
        进程权限，扩展机制本身不是 sandbox。
      </p>
    </section>
  );
}

export function ConceptLab({
  kind,
  compact = false,
  active = true,
}: {
  kind: LabKind;
  compact?: boolean;
  active?: boolean;
}) {
  switch (kind) {
    case "architecture":
      return <ArchitectureLab />;
    case "loop":
      return <AgentLoop compact={compact} active={active} />;
    case "tools":
      return <ToolsLab />;
    case "messages":
      return <MessagesLab />;
    case "events":
      return <EventsLab />;
    case "context":
      return <ContextLab />;
    case "control":
      return <ControlLab />;
    case "extensions":
      return <ExtensionsLab />;
  }
}
