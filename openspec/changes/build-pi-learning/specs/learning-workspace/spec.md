## ADDED Requirements

### Requirement: 渐进课程与导航
系统 SHALL 提供至少八个含目标、解释、示例与自测的中文课程，支持 hash 直达、前后切换和浏览器后退。

#### Scenario: 打开课程
- **WHEN** 用户从课程目录选择一课或访问有效课程 hash
- **THEN** 标题、正文、实验、源码和自测与所选课一致

### Requirement: 搜索与本地学习状态
系统 SHALL 提供课程搜索、可逆的完成标记和每课笔记，并在安全可用的 localStorage 中保存状态。

#### Scenario: 刷新保留进度
- **WHEN** 用户标记课程完成、保存笔记并刷新
- **THEN** 已完成状态与该课笔记恢复，损坏存储不会使页面崩溃

#### Scenario: 搜索课程
- **WHEN** 用户输入术语
- **THEN** 显示匹配课程及可点击入口，无匹配时显示清晰空状态

### Requirement: 自测与响应式访问
系统 SHALL 为每课提供带正确答案解析的选择题，并在移动端、键盘和 reduced motion 环境可访问。

#### Scenario: 检查答案
- **WHEN** 用户选择错误或正确答案
- **THEN** 显示对应反馈和概念解释，可以重新选择

#### Scenario: 移动端学习
- **WHEN** 在 390px 宽度打开页面
- **THEN** 可以展开目录、切换章节和操作实验，整页不横向溢出
