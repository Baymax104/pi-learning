## ADDED Requirements

### Requirement: 可控制的流程模拟
系统 SHALL 提供默认暂停的 Agent loop 教学模拟，具有播放、暂停、单步和重置控制，显示当前阶段与事件。

#### Scenario: 单步并重置
- **WHEN** 用户推进一个步骤后选择重置
- **THEN** 阶段、日志和播放状态恢复初始值

### Requirement: 行为分支和概念实验
系统 SHALL 提供工具成功、工具失败、steering 场景，并提供与消息、工具、事件、会话、扩展或架构相关的可操作解释。

#### Scenario: 工具失败
- **WHEN** 运行工具失败场景到结束
- **THEN** 日志显示错误工具结果作为上下文返回模型，避免描述为程序直接崩溃

#### Scenario: steering 注入
- **WHEN** 运行 steering 场景
- **THEN** 当前工具批次完成后、下一次模型调用前展示 steering 注入

### Requirement: 纯本地教学执行
系统 MUST 将所有实验标记为教学模拟，实验 SHALL 不调用模型 API 或执行真实工具。

#### Scenario: 离线交互
- **WHEN** 页面资源已加载并进行实验
- **THEN** 交互仅更新浏览器状态，无服务端或外部 API 请求
