## ADDED Requirements

### Requirement: 版本固定的源码导读
系统 SHALL 按课程展示源码路径、符号、注释说明、代码与固定 commit 官方链接，简化片段明确标注为教学节选。

#### Scenario: 查看真实源码
- **WHEN** 用户打开源码导读
- **THEN** 展示与该课匹配的代码及解释，官方链接指向 earendil-works/pi 的固定 SHA

### Requirement: 源码解释可操作
系统 SHALL 允许选择代码讲解段并查看对应解释。

#### Scenario: 切换讲解段
- **WHEN** 用户选择另一讲解段
- **THEN** 代码高亮和中文解释一起变化
