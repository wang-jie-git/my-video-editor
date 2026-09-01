# Skills 框架

> AI 助手的技能（Skill）支持框架：注册 / 加载 / 调用 任何技能。
> 实现于 `src/lib/ai/agent/skills/`

## 什么是 Skill

Skill 是一个**可复用的工作流指令**（markdown 文档），带 frontmatter 元信息。AI 助手可以：

1. **`skill_list`** — 查看可用技能
2. **`skill_load`** — 加载技能内容，按其指令执行任务

## 目录结构

```
src/lib/ai/agent/skills/
├── types.ts          # SkillDefinition 类型
├── registry.ts       # SkillRegistry 注册表（注册/获取/列出）
├── loader.ts         # 加载器（bundled + 用户/项目目录）
├── skill-tools.ts    # AI 调用入口（skill_list / skill_load）
├── index.ts          # 统一导出
├── bundled/          # 内置技能（md 文件）
│   ├── ffmpeg-migration.md
│   └── video-export-troubleshoot.md
└── __tests__/
    ├── skills.test.ts        # 单元测试
    └── loader-e2e.test.ts    # 真实文件加载测试
```

## Skill 文件格式

```markdown
---
name: skill-name
description: 技能描述（给 AI 判断何时使用）
tags: [tag1, tag2]
---
# 技能正文

按此流程执行：
1. ...
2. ...
```

## 加载来源

| 来源 | 位置 | 优先级 |
|------|------|--------|
| bundled（内置） | `src/lib/ai/agent/skills/bundled/*.md` | 高 |
| project（项目级） | `<repo>/.openharness/skills/` 或 `<repo>/skills/` | 中 |
| user（用户级） | `~/.openharness/skills/` 等（预留） | 低 |

## 与 AI 助手的集成

在 `tools/index.ts`：
- `initSkillTools()` — 初始化注册表 + 构建技能工具
- `isSkillsReady()` — 检查技能是否就绪
- `getAllTools()` / `getAllToolSchemas()` — 技能工具与其他工具并列

在 `service.ts` 的 `runAgentLoop` 中，Skills 与 MCP 一起初始化，失败静默降级。

## 使用示例

```
用户: 帮我看看 FFmpeg 迁移进度
AI: [调用 skill_list] 发现 ffmpeg-migration 技能
    [调用 skill_load "ffmpeg-migration"] 按技能指令检查迁移状态
```

## 新建技能

1. 在 `bundled/` 添加 `xxx.md`（内置）或在项目 `skills/` 目录添加（项目级）
2. 文件头写 frontmatter（name / description / tags）
3. 正文写可执行的工作流指令

## 与 MCP 的关系

```
AI 助手工具集 = 本地工具 + MCP 工具（任意 MCP Server）+ Skill 工具（任意 Skills）
```

- MCP 工具：**外部服务能力**（实时数据、文件系统等）
- Skill 工具：**内部工作流指令**（如何做一件事的可复用方式）