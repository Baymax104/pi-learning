export const SOURCE_COMMIT = "90b42bca6ed161b8e7ee40ceda9755205c2882ec";

export function sourceUrl(path: string, line?: number): string {
  return `https://github.com/earendil-works/pi/blob/${SOURCE_COMMIT}/${path}${line ? `#L${line}` : ""}`;
}

export type Lesson = {
  id: string;
  number: string;
  section: "开始之前" | "核心原理" | "深入实现";
  title: string;
  subtitle: string;
  duration: string;
  objective: string;
  lab:
    | "architecture"
    | "loop"
    | "tools"
    | "messages"
    | "events"
    | "context"
    | "control"
    | "extensions";
  paragraphs: string[];
  concepts: { term: string; description: string }[];
  source: {
    path: string;
    symbol: string;
    startLine: number;
    code: string;
    simplified: boolean;
    notes?: string[];
    steps: { title: string; explanation: string; lines: [number, number] }[];
  };
  quiz: {
    question: string;
    options: [string, string, string];
    answer: number;
    explanation: string;
  };
};

export const lessons: Lesson[] = [
  {
    id: "meet-pi",
    number: "01",
    section: "开始之前",
    title: "认识 Pi",
    subtitle: "一个小而可扩展的 Agent，如何把语言变成行动？",
    duration: "6 分钟",
    objective: "分清模型、Agent 运行时和编程工具各自的工作。",
    lab: "architecture",
    paragraphs: [
      "你让 Pi“看看这个项目怎么启动”。模型可以理解这句话，但模型本身看不到你的文件。Pi 把模型的工具调用交给程序执行，再把读取结果带回模型，让它依据实际内容回答。",
      "可以把 Pi 想成一张工作台：pi-ai 连接不同模型，pi-agent-core 组织对话和工具循环，pi-coding-agent 提供文件工具、会话与扩展，pi-tui 负责终端界面。这里先学习这条核心路径。",
      "本站基于 earendil-works/pi 的固定源码版本。所有可交互演示都在浏览器里运行，使用预设数据；你可以放心拆开每一步，观察它们如何衔接。",
    ],
    concepts: [
      {
        term: "Model",
        description: "根据输入生成回复，或者提出结构化的工具调用。",
      },
      {
        term: "Agent runtime",
        description: "维护状态，调用模型，执行工具，把结果加入对话。",
      },
      {
        term: "Harness",
        description: "围绕模型的运行框架，让模型能够在实际任务中持续工作。",
      },
    ],
    source: {
      path: "packages/agent/src/agent.ts",
      symbol: "Agent",
      startLine: 194,
      simplified: false,
      code: `export class Agent {
  private _state: MutableAgentState;
  private readonly listeners = new Set<(event: AgentEvent, signal: AbortSignal) => Promise<void> | void>();
  private readonly steeringQueue: PendingMessageQueue;
  private readonly followUpQueue: PendingMessageQueue;

  public convertToLlm: (messages: AgentMessage[]) => Message[] | Promise<Message[]>;
  public transformContext?: (messages: AgentMessage[], signal?: AbortSignal) => Promise<AgentMessage[]>;
  public streamFunction: StreamFn;`,
      notes: [
        "官方连续源码节选，缩进调整为便于网页阅读的空格。",
        "这些字段展示 Agent 的协作对象；完整类还包含启动、订阅和终止等方法。",
      ],
      steps: [
        {
          title: "保留工作状态",
          explanation:
            "_state 保存对话、模型与运行状态，Agent 因而能够持续处理一个任务。",
          lines: [1, 2],
        },
        {
          title: "向外发事件",
          explanation:
            "listeners 让界面订阅运行过程，而不是等全部结束后才显示结果。",
          lines: [3, 3],
        },
        {
          title: "连接模型",
          explanation:
            "先整理和转换消息，再通过 streamFunction 接收模型的流式回答。",
          lines: [7, 9],
        },
      ],
    },
    quiz: {
      question: "当 Pi 读取一个本地文件时，谁真正执行读取操作？",
      options: [
        "模型直接打开你的文件系统",
        "Pi 运行时调用已注册的工具",
        "浏览器自动把所有文件发送给模型",
      ],
      answer: 1,
      explanation:
        "模型生成 toolCall，运行时找到对应工具并执行。工具结果随后加入上下文，模型才能基于文件内容回答。",
    },
  },
  {
    id: "agent-loop",
    number: "02",
    section: "核心原理",
    title: "Agent 的工作循环",
    subtitle: "从一句指令开始，看一次思考与行动如何发生。",
    duration: "8 分钟",
    objective: "跟随一条真实的执行路径，理解 Agent 为什么能够连续行动。",
    lab: "loop",
    paragraphs: [
      "普通聊天通常是“你问，模型答”。Agent 多了一条返回路径：模型提出工具调用，程序执行工具，把结果作为新消息交回模型。模型获得新信息后，就能继续下一步。",
      "试着让 Pi“读取 package.json，告诉我启动命令”。先观察输入如何进入上下文，再观察 read 的调用和结果，最后看模型如何根据 scripts 字段给出回答。",
      "一次 turn 包含一次模型响应以及它发起的工具调用和结果；一次 run 可以包含多个 turn。正常情况下，没有后续工具和排队消息时循环结束；错误、取消和显式终止也会影响结束时机。",
    ],
    concepts: [
      {
        term: "toolCall",
        description:
          "assistant 消息中的结构化调用意图，包含工具名、参数和调用 ID。",
      },
      {
        term: "toolResult",
        description: "工具执行的反馈，通过 toolCallId 与原调用对应。",
      },
      {
        term: "Turn / Run",
        description:
          "Turn 是一轮模型响应及其工具执行；Run 是由多轮组成的一次完整运行。",
      },
    ],
    source: {
      path: "packages/agent/src/agent-loop.ts",
      symbol: "runLoop",
      startLine: 267,
      simplified: false,
      code: `// Check for tool calls
const toolCalls = message.content.filter((c) => c.type === "toolCall");

const toolResults: ToolResultMessage[] = [];
hasMoreToolCalls = false;
if (toolCalls.length > 0) {
  // A "length" stop means the output was cut off by the token limit, so
  // every tool call in the message may carry truncated arguments. Fail
  // them all instead of executing potentially borked calls.
  const executedToolBatch =
    message.stopReason === "length"
      ? await failToolCallsFromTruncatedMessage(toolCalls, emit)
      : await executeToolCalls(currentContext, message, config, signal, emit);
  toolResults.push(...executedToolBatch.messages);
  hasMoreToolCalls = !executedToolBatch.terminate;

  for (const result of toolResults) {
    currentContext.messages.push(result);
    newMessages.push(result);
  }
}`,
      notes: [
        "官方连续源码节选，移除了公共左缩进。",
        "这里只展示工具分支。完整 runLoop 还处理 provider 错误、finishTurn、steering 和 follow-up。",
      ],
      steps: [
        {
          title: "找到行动意图",
          explanation:
            "从模型响应的 content 中找出 toolCall。文本回复与工具调用可以出现在同一条 assistant 消息里。",
          lines: [1, 6],
        },
        {
          title: "执行工具",
          explanation:
            "完整参数交给 executeToolCalls；输出被 token 限制截断时，先返回错误，避免执行不完整的调用。",
          lines: [10, 15],
        },
        {
          title: "带着结果继续",
          explanation:
            "工具结果写入当前上下文。下一次模型请求便能看到刚才读出的信息。",
          lines: [17, 21],
        },
      ],
    },
    quiz: {
      question: "read 执行完成后，Pi 通常为什么还要请求一次模型？",
      options: [
        "把工具结果加入上下文，让模型据此回答",
        "工具执行会自动删除原来的问题",
        "每次请求模型都必须固定调用两次",
      ],
      answer: 0,
      explanation:
        "工具返回的是原始信息；模型还需要结合问题理解结果并组织回答。直接回答、不需要工具的任务可以只有一轮。",
    },
  },
  {
    id: "tool-calling",
    number: "03",
    section: "核心原理",
    title: "工具，让 Agent 能行动",
    subtitle: "把一段结构化请求，变成一次可观察的执行。",
    duration: "8 分钟",
    objective: "理解工具定义、参数校验，以及成功和失败的返回路径。",
    lab: "tools",
    paragraphs: [
      "一个工具有名称、说明、参数 schema 和 execute 函数。名称和说明帮助模型选择工具，schema 描述参数形状，execute 才是实际完成工作的代码。",
      "例如 read 接收 path；edit 定位并替换已有文本；write 写入内容；bash 执行命令。运行时先查找工具并校验参数，再经过可选的 beforeToolCall 和 afterToolCall hooks，最后生成工具结果。",
      "工具失败也能成为有用反馈。读取不存在的文件会产生错误结果，模型可以解释问题或修正路径。当前版本默认并发执行一批工具；如果配置或某个工具要求 sequential，则整批按顺序执行。",
    ],
    concepts: [
      {
        term: "parameters",
        description:
          "JSON Schema 定义的输入契约，例如 read 的 path 必须是字符串。",
      },
      {
        term: "isError",
        description:
          "标记工具结果是否失败。工具失败和模型请求失败有不同处理路径。",
      },
      {
        term: "parallel",
        description:
          "先顺序检查调用，再并发执行。结果消息仍保持模型发起调用的原顺序。",
      },
    ],
    source: {
      path: "packages/agent/src/agent-loop.ts",
      symbol: "prepareToolCall",
      startLine: 726,
      simplified: false,
      code: `const tool = tools.find((t) => t.name === toolCall.name);
if (!tool) {
  return {
    kind: "immediate",
    result: createErrorToolResult(\`Tool \${toolCall.name} not found\`),
    isError: true,
  };
}

try {
  const preparedToolCall = prepareToolCallArguments(tool, toolCall);
  const validatedArgs = validateToolArguments(tool, preparedToolCall);`,
      notes: [
        "官方连续源码节选，片段在参数校验处结束；完整函数继续处理 beforeToolCall。",
        "parallel 模式的完成事件可以乱序，但最终 toolResult 消息按 assistant 中调用的顺序排列。",
      ],
      steps: [
        {
          title: "根据名称找工具",
          explanation:
            "模型提供工具名称；运行时只能从当前可执行工具集合里查找。",
          lines: [1, 2],
        },
        {
          title: "不存在也要反馈",
          explanation:
            "未知工具不会被执行，而是生成 isError 为 true 的错误结果。",
          lines: [3, 8],
        },
        {
          title: "执行前校验参数",
          explanation:
            "先做兼容性参数准备，再按 schema 校验。通过之后才可能执行工具。",
          lines: [10, 12],
        },
      ],
    },
    quiz: {
      question: "模型调用了一个没有注册的工具，Pi 会怎样？",
      options: [
        "自动安装这个工具",
        "把工具名当成 shell 命令执行",
        "返回带有 isError 标记的工具结果",
      ],
      answer: 2,
      explanation:
        "prepareToolCall 从当前工具集合查找名称。找不到时直接构造错误结果，使模型能看到失败原因。",
    },
  },
  {
    id: "messages-context",
    number: "04",
    section: "核心原理",
    title: "消息与上下文",
    subtitle: "下一次思考之前，模型究竟看到了什么？",
    duration: "7 分钟",
    objective: "区分应用中的消息、模型可见消息和工具执行详情。",
    lab: "messages",
    paragraphs: [
      "模型不会天然记住上一次请求。Pi 在下一次请求前重新组织上下文：system 提供指令与工具声明，user 提供问题，assistant 保留回复和调用，toolResult 带回执行反馈。",
      "应用还可能有只用于界面的自定义消息。transformContext 可以先整理 AgentMessage，convertToLlm 再把它们转换为模型可接受的 Message。最终 provider 会将统一消息映射到自己的接口格式。",
      "工具结果里的 content 面向模型，details 和 structuredContent 供界面或程序使用。理解这层区分，就能避免误以为界面中所有展示内容都会进入模型上下文。",
    ],
    concepts: [
      {
        term: "AgentMessage",
        description: "应用使用的消息联合类型，可以通过类型扩展加入自定义消息。",
      },
      {
        term: "convertToLlm",
        description: "在每次模型请求前转换或过滤消息，形成标准 Message 列表。",
      },
      {
        term: "System message",
        description:
          "当前版本中，指令、命名 prompt sections 和工具变更都可记录在 system 消息中。",
      },
    ],
    source: {
      path: "packages/agent/src/agent-loop.ts",
      symbol: "streamAssistantResponse",
      startLine: 398,
      simplified: false,
      code: `let messages = context.messages;
if (config.transformContext) {
  messages = await config.transformContext(messages, signal);
}

// Convert to LLM-compatible messages (AgentMessage[] → Message[])
const llmMessages = await config.convertToLlm(messages);

const llmContext = normalizeContext({ messages: llmMessages });`,
      notes: [
        "官方连续源码节选，统一左缩进。",
        "当前 Message 联合包含 system、user、assistant、toolResult。",
      ],
      steps: [
        {
          title: "从应用对话出发",
          explanation:
            "context.messages 保留当前对话记录，里面可以包含应用自定义消息。",
          lines: [1, 1],
        },
        {
          title: "整理上下文",
          explanation:
            "可选的 transformContext 在 AgentMessage 层处理历史、注入信息或裁剪内容。",
          lines: [2, 4],
        },
        {
          title: "转换为模型消息",
          explanation:
            "convertToLlm 形成标准消息，再经过 normalizeContext 传给模型接口。",
          lines: [6, 9],
        },
      ],
    },
    quiz: {
      question: "一个仅供 UI 显示的自定义消息，必须原样发送给模型吗？",
      options: [
        "必须，界面显示什么模型就看到什么",
        "不必，可以在 convertToLlm 中转换或过滤",
        "不必，因为模型只接收最新一条 user 消息",
      ],
      answer: 1,
      explanation:
        "应用消息与模型消息之间有明确的转换边界。模型需要的历史会被组织进请求，UI 通知等内容可以被过滤。",
    },
  },
  {
    id: "streaming-events",
    number: "05",
    section: "核心原理",
    title: "看见流式事件",
    subtitle: "从一个文字片段，到实时更新的界面。",
    duration: "6 分钟",
    objective: "理解模型流式输出与 AgentEvent 之间的关系。",
    lab: "events",
    paragraphs: [
      "你看到的逐字输出来自一串事件。模型接口会持续发送文字、thinking 或 toolCall 的增量，Agent 更新 partialMessage，并发出 message_update 通知订阅者刷新界面。",
      "assistant 消息通常经历 message_start、若干 message_update、message_end。工具另有 tool_execution_start、可选的 update 和 end。turn_start/end 包住一轮工作，agent_start/end 描述低层循环生命周期；coding-agent 会话还可能继续重试或压缩，应以 agent_settled 判断最终空闲。",
      "增量事件适合让用户观察过程，最终消息适合记录完整结果。工具参数也可能分片到达；Pi 等待完整响应和参数校验后执行，截断的调用会返回错误。",
    ],
    concepts: [
      {
        term: "Delta",
        description: "这次新增的一小段内容，例如一个 text_delta 文字片段。",
      },
      {
        term: "Partial message",
        description: "截至当前已经积累出的响应，仍可能继续变化。",
      },
      {
        term: "Subscribe",
        description: "订阅事件，用同一条运行过程驱动终端、网页或其他界面。",
      },
    ],
    source: {
      path: "packages/agent/src/agent-loop.ts",
      symbol: "streamAssistantResponse",
      startLine: 442,
      simplified: false,
      code: `if (partialMessage) {
  partialMessage = event.partial;
  context.messages[context.messages.length - 1] = partialMessage;
  await emit({
    type: "message_update",
    assistantMessageEvent: event,
    message: { ...partialMessage },
  });
}`,
      notes: [
        "官方连续源码节选；其外层 switch 接收 text、thinking、toolcall 的流式事件。",
        "coding-agent 的会话级 agent_settled 与低层 agent_end 不同；本课展示低层 AgentEvent。",
      ],
      steps: [
        {
          title: "更新当前响应",
          explanation:
            "拿到 provider 提供的最新 partial，用它替换上下文中最后一条临时消息。",
          lines: [1, 3],
        },
        {
          title: "发出统一事件",
          explanation:
            "模型接口的流式事件被包装在 message_update 中，交给界面订阅者。",
          lines: [4, 6],
        },
        {
          title: "把当前内容交给 UI",
          explanation:
            "message 包含当前消息的浅拷贝；UI 可以据此显示完整的已生成部分。",
          lines: [7, 9],
        },
      ],
    },
    quiz: {
      question: "message_update 通常告诉界面什么？",
      options: [
        "响应正在变化，可以更新当前显示内容",
        "所有工具都已经执行完毕",
        "会话已经保存并且永久结束",
      ],
      answer: 0,
      explanation:
        "message_update 是生成过程中的更新事件。完整消息由 message_end 标记，一轮或一次运行还有各自的结束事件。",
    },
  },
  {
    id: "sessions-compaction",
    number: "06",
    section: "深入实现",
    title: "会话与上下文压缩",
    subtitle: "历史可以有分支，模型的工作记忆可以被整理。",
    duration: "9 分钟",
    objective: "理解 active branch、JSONL 持久化与 compaction 的关系。",
    lab: "context",
    paragraphs: [
      "Pi 将会话记录为 JSONL：每行一个 JSON 对象。除首行的会话元信息外，entries 用 id 与 parentId 连接成树。回到早先的位置继续工作，会得到另一条分支，原来的路径仍然保留。",
      "下一次请求只使用 active branch 对应的上下文。SessionManager 从当前 leaf 沿 parentId 回到根，再反转顺序，得到从开始到现在的一条路径。",
      "当历史接近模型窗口上限时，compaction 为较早的历史生成摘要，并保留最近消息。新的请求读取“摘要 + 保留的消息”；原始 session entries 不会因此删除。摘要是整理记忆，也可能遗漏细节。",
    ],
    concepts: [
      {
        term: "JSONL",
        description: "每行一个 JSON 对象的存储格式，便于逐条记录会话事件。",
      },
      {
        term: "Active branch",
        description: "从根到当前 leaf 的路径，决定本次请求使用哪段历史。",
      },
      {
        term: "Compaction",
        description:
          "用摘要替代后续请求中的较旧历史，同时保留最近内容与原始会话记录。",
      },
    ],
    source: {
      path: "packages/coding-agent/src/core/session-manager.ts",
      symbol: "SessionManager.getBranch",
      startLine: 1480,
      simplified: false,
      code: `getBranch(fromId?: string): SessionEntry[] {
  const path: SessionEntry[] = [];
  const startId = fromId ?? this.leafId;
  let current = startId ? this.byId.get(startId) : undefined;
  while (current) {
    path.push(current);
    current = current.parentId ? this.byId.get(current.parentId) : undefined;
  }
  path.reverse();
  return path;
}`,
      notes: [
        "官方连续源码节选。getBranch 返回路径 entries；buildSessionContext 还会处理摘要等内容，构建模型上下文。",
        "压缩演示中的 token 数是教学示例，不是实际模型计量。",
      ],
      steps: [
        {
          title: "从当前位置开始",
          explanation:
            "未指定 fromId 时，选用当前 leaf，定位正在使用的分支末端。",
          lines: [1, 4],
        },
        {
          title: "沿父节点回溯",
          explanation:
            "每次找到 parentId 对应的 entry，直到根节点；另一条分支不会被加入。",
          lines: [5, 8],
        },
        {
          title: "恢复时间顺序",
          explanation: "刚才是从末尾向前收集，reverse 后才是从根到当前的位置。",
          lines: [9, 11],
        },
      ],
    },
    quiz: {
      question: "Compaction 后，被摘要替代的原始历史会怎样？",
      options: [
        "从会话文件中永久删除",
        "仍保留在会话记录中，后续请求使用摘要与最近消息",
        "自动加入会话的所有其他分支",
      ],
      answer: 1,
      explanation:
        "Compaction 改变后续请求的上下文组织方式，原始 entries 仍保留在 session tree 中。",
    },
  },
  {
    id: "runtime-control",
    number: "07",
    section: "深入实现",
    title: "引导、跟进与中止",
    subtitle: "Agent 正在工作时，新消息应该何时进入？",
    duration: "7 分钟",
    objective: "区分 steering、follow-up 和 abort 三种运行控制。",
    lab: "control",
    paragraphs: [
      "Agent 忙碌时，你可能想补充“先别修改，只看代码”。steer 把消息排入 steering 队列，当前 assistant turn 及其工具调用完成后，在下一次模型请求前加入上下文。它不会跳过当前批次剩余的工具。",
      "followUp 更适合“做完后，再写一份摘要”。它等待 Agent 没有剩余工具调用与 steering、本来准备结束时，再发起下一轮。两种队列能表达不同的工作优先级。",
      "abort 通过 AbortController 发出取消信号，让模型请求和支持信号的工具停止。它不负责回滚已经完成的文件改动；工具也需要正确响应 AbortSignal。",
    ],
    concepts: [
      {
        term: "Steering",
        description:
          "当前 turn 的工具执行完之后，在下一次请求前注入，及时调整后续方向。",
      },
      {
        term: "Follow-up",
        description: "等待当前工作自然结束，再处理排队的后续任务。",
      },
      {
        term: "AbortSignal",
        description: "协作式取消信号，向模型与工具传达停止请求。",
      },
    ],
    source: {
      path: "packages/agent/src/agent.ts",
      symbol: "Agent.steer / Agent.followUp",
      startLine: 307,
      simplified: false,
      code: `/** Queue a message to be injected after the current assistant turn finishes. */
steer(message: AgentMessage): void {
  this.steeringQueue.enqueue(message);
}

/** Queue a message to run only after the agent would otherwise stop. */
followUp(message: AgentMessage): void {
  this.followUpQueue.enqueue(message);
}`,
      notes: [
        "官方连续源码节选。消息在此入队，具体消费时机在 agent-loop.ts 的 runLoop。",
        "finishTurn 显式结束或 provider 的 error/aborted 硬退出会先终止低层 run。",
      ],
      steps: [
        {
          title: "把引导消息排队",
          explanation:
            "steer 并不立即打断函数执行；它将消息加入 steeringQueue。",
          lines: [1, 4],
        },
        {
          title: "把后续任务排队",
          explanation:
            "followUp 使用独立队列，因此运行时能在不同的时机消费它。",
          lines: [6, 9],
        },
        {
          title: "让循环决定时机",
          explanation:
            "runLoop 先检查 steering，等当前工作准备结束时再检查 follow-up。",
          lines: [2, 9],
        },
      ],
    },
    quiz: {
      question:
        "当前 assistant 一次提出了三个工具调用。此时 steer 一条消息会怎样？",
      options: [
        "直接撤销已经完成的工具",
        "跳过当前批次中所有剩余工具",
        "当前 turn 的工具完成后，在下一次模型请求前注入",
      ],
      answer: 2,
      explanation:
        "当前版本在 turn 的工具调用完成后轮询 steering。要发出取消请求，应使用 abort；取消也不等于撤销已有副作用。",
    },
  },
  {
    id: "extensions",
    number: "08",
    section: "深入实现",
    title: "用扩展塑造 Pi",
    subtitle: "沿着工具和事件接口，接入自己的工作方式。",
    duration: "7 分钟",
    objective: "理解扩展工厂、工具注册和事件 hooks 的作用。",
    lab: "extensions",
    paragraphs: [
      "Pi 的扩展是运行在 Pi 进程中的 TypeScript 模块。默认导出的工厂函数接收 ExtensionAPI，用它注册工具、命令、事件处理器与界面行为。",
      "例如，一个团队扩展可以注册查询内部文档的工具，也可以在 tool_call 事件中检查调用，在 tool_result 中整理执行反馈。工具给模型增加行动能力，事件 hooks 改变既有流程中的行为。",
      "Skills、prompt templates 和 extensions 作用不同：skill 提供按需读取的任务说明；template 复用输入文本；extension 执行代码并接入运行时。扩展与 Pi 共享进程权限，扩展系统本身不提供 sandbox。",
    ],
    concepts: [
      {
        term: "Extension factory",
        description: "默认导出的函数，接收 ExtensionAPI 并注册扩展行为。",
      },
      {
        term: "registerTool",
        description: "将工具定义交给 Pi，使运行时能够执行模型发起的调用。",
      },
      {
        term: "Event hook",
        description:
          "在明确的生命周期位置观察、转换或拦截，例如 tool_call 与 tool_result。",
      },
    ],
    source: {
      path: "packages/coding-agent/src/core/extensions/types.ts",
      symbol: "ExtensionAPI.registerTool",
      startLine: 1694,
      simplified: false,
      code: `/** Register a tool that the LLM can call. */
registerTool<TParams extends TSchema = TSchema, TDetails = unknown, TState = any>(
  tool: ToolDefinition<TParams, TDetails, TState>,
): void;`,
      notes: [
        "官方接口源码节选，完整 ExtensionAPI 还包含事件、命令、provider 等接口。",
        "ToolDefinition 指定参数 schema、execute 与可选的自定义渲染行为。",
      ],
      steps: [
        {
          title: "面向模型的能力",
          explanation:
            "registerTool 的用途是注册模型可以调用的工具，而不是直接执行某次调用。",
          lines: [1, 2],
        },
        {
          title: "提供工具定义",
          explanation:
            "传入的 ToolDefinition 把参数类型、返回详情和 UI 状态组织在一个契约中。",
          lines: [2, 3],
        },
        {
          title: "接入运行时",
          explanation:
            "注册完成后，由 Agent 工具执行流程在模型发起调用时负责校验和执行。",
          lines: [3, 4],
        },
      ],
    },
    quiz: {
      question: "给 Pi 增加一个可执行的“查询内部文档”工具，应该使用什么？",
      options: [
        "在 extension 中调用 registerTool 注册工具",
        "只修改终端主题颜色",
        "只增加一条不含实现的 prompt template",
      ],
      answer: 0,
      explanation:
        "Extension 可以注册具有 execute 实现的工具。Skill 和 prompt template 能提供说明与文本，但本身不会新增工具实现。",
    },
  },
];
