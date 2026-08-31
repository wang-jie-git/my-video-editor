# FFmpeg 工具多语言支持实施计划

**创建时间**: 2026-08-31
**状态**: 📋 实施计划
**目标**: 为 FFmpeg AI 工具提供 12 语言支持

---

## 概述

为 FFmpeg AI 工具提供完整的 12 语言支持，包括系统提示词和工具使用指南的多语言翻译。

### 支持的语言

1. 🇺🇸 English (en)
2. 🇨🇳 中文 (zh)
3. 🇯🇵 日本語 (ja)
4. 🇰🇷 한국어 (ko)
5. 🇪🇸 Español (es)
6. 🇫🇷 Français (fr)
7. 🇩🇪 Deutsch (de)
8. 🇮🇹 Italiano (it)
9. 🇷🇺 Русский (ru)
10. 🇵🇹 Português (pt)
11. 🇻🇳 Tiếng Việt (vi)
12. 🇮🇩 Bahasa Indonesia (id)

---

## 实施策略

### 方案 A: 系统提示词翻译（推荐）

**目标**: 让 AI 在不同语言环境下提供 FFmpeg 工具指导

**实施方式**:
1. 提取关键 FFmpeg 指令到 i18n 系统
2. 使用 `i18next.t()` 动态生成系统提示词
3. AI 根据用户语言环境提供对应语言的工具说明

**优点**:
- ✅ AI 能理解用户语言中的视频处理需求
- ✅ 系统提示词与用户语言一致
- ✅ 维护简单（一个源文件）

**缺点**:
- ⚠️ 系统提示词长度受限
- ⚠️ 详细指南仍需英文文档

### 方案 B: 文档翻译（补充）

**目标**: 翻译完整的 FFmpeg 工具使用指南

**实施方式**:
1. 创建 `docs/ai/ffmpeg-tools-guide.{locale}.md`
2. 使用自动化翻译工具
3. 人工审核关键术语

**优点**:
- ✅ 完整的多语言文档
- ✅ 用户可自行查阅

**缺点**:
- ⚠️ 维护成本高（12 个文件）
- ⚠️ 更新时需同步所有语言版本

### 方案 C: 混合方案（最终选择）

**结合 A + B**:
- **系统提示词**使用方案 A（关键指令翻译）
- **详细文档**保留英文 + 添加自动翻译说明
- **工具描述**保留英文（OpenAI Function Calling 标准）

---

## 实施步骤

### Step 1: 提取系统提示词中的 FFmpeg 相关文本

**文件**: `src/lib/ai/agent/system-prompt.ts`

**需要翻译的章节**:
```
1. FFmpeg Video Processing Tools（标题）
2. When to Use FFmpeg Tools（何时使用）
3. Core Concepts（核心概念）
4. Quick Reference Table（快速参考表）
5. Standard Workflow（标准工作流）
6. Important Notes（重要注意事项）
7. Category descriptions（分类描述）
```

### Step 2: 创建翻译键

**格式**:
```typescript
{
  "ai.ffmpeg.title": "FFmpeg Video Processing Tools",
  "ai.ffmpeg.whenToUse": "Use FFmpeg tools when the user requests...",
  "ai.ffmpeg.concept.paths": "Absolute Paths Required",
  "ai.ffmpeg.concept.pathsDesc": "All file paths MUST start with...",
  // ...
}
```

### Step 3: 更新系统提示词

**使用 i18next.t()**:
```typescript
i18next.t("ai.ffmpeg.title")
i18next.t("ai.ffmpeg.whenToUse")
```

### Step 4: 批量翻译到 12 种语言

使用自动化翻译工具 + 人工审核

### Step 5: 测试多语言环境

验证系统提示词在不同语言下的表现

---

## 翻译范围

### 系统提示词（必须翻译）

| 类别 | 条目数 | 优先级 |
|------|--------|--------|
| 标题和章节 | 7 | 🔴 高 |
| 核心概念 | 4 | 🔴 高 |
| 工具分类描述 | 7 | 🔴 高 |
| 使用场景说明 | 10 | 🟡 中 |
| 错误处理说明 | 5 | 🟡 中 |

**总计**: ~33 条

### 详细文档（可选翻译）

| 类别 | 条目数 | 优先级 |
|------|--------|--------|
| 工具参数说明 | 29 | 🟡 中 |
| 使用场景 | 5 | 🟡 中 |
| 代码示例 | 52 | 🟢 低 |
| 错误处理 | 5 | 🟡 中 |

**总计**: ~91 条

---

## 翻译优先级

### P0: 系统提示词（必须完成）

- [ ] 提取 FFmpeg 相关文本到 i18n
- [ ] 更新 system-prompt.ts 使用 i18next.t()
- [ ] 翻译到 12 种语言

### P1: 关键文档翻译（推荐）

- [ ] 创建 `ffmpeg-tools-guide.zh.md`
- [ ] 创建 `ffmpeg-tools-guide.ja.md`
- [ ] 创建 `ffmpeg-tools-guide.ko.md`
- [ ] 创建 `ffmpeg-tools-guide.es.md`

### P2: 完整文档翻译（可选）

- [ ] 翻译所有 12 种语言版本
- [ ] 维护翻译同步机制

---

## 技术实现

### 1. 修改 system-prompt.ts

```typescript
import { i18next } from "@/lib/i18n";

// 在 buildSystemPrompt 函数中
const ffmpegSection = `
## ${i18next.t("ai.ffmpeg.title")}

### ${i18next.t("ai.ffmpeg.whenToUse.title")}
${i18next.t("ai.ffmpeg.whenToUse.content")}

### ${i18next.t("ai.ffmpeg.concepts.title")}
${i18next.t("ai.ffmpeg.concepts.content")}

...
`;
```

### 2. 添加到翻译文件

**en/translation.json**:
```json
{
  "ai.ffmpeg.title": "FFmpeg Video Processing Tools",
  "ai.ffmpeg.whenToUse.title": "When to Use FFmpeg Tools",
  "ai.ffmpeg.whenToUse.content": "Use FFmpeg tools when the user requests video processing...",
  // ...
}
```

**zh/translation.json**:
```json
{
  "ai.ffmpeg.title": "FFmpeg 视频处理工具",
  "ai.ffmpeg.whenToUse.title": "何时使用 FFmpeg 工具",
  "ai.ffmpeg.whenToUse.content": "当用户请求视频处理时使用 FFmpeg 工具...",
  // ...
}
```

### 3. 提取和翻译脚本

```bash
# 提取现有翻译键
cd apps/web
bun run translation:extract

# 扫描缺失翻译
bun run translation:scan

# 自动翻译到其他语言
bun run translation:translate
```

---

## 质量保证

### 翻译检查清单

- [ ] 专业术语一致性（如 "codec"、"CRF"、"bitrate"）
- [ ] 技术准确性（视频处理术语）
- [ ] 语言自然度（符合目标语言习惯）
- [ ] 上下文正确性（避免歧义）

### 测试计划

- [ ] 中文环境测试
- [ ] 日文环境测试
- [ ] 韩文环境测试
- [ ] 西班牙语环境测试
- [ ] 法语环境测试
- [ ] 德语环境测试

---

## 注意事项

### 技术术语保留

以下术语应保留英文或使用通用译法：
- **FFmpeg** - 保留
- **MP4/WebM/AVI** - 保留格式名
- **H.264/VP9** - 保留编码名
- **CRF** - 保留或加注释
- **Canvas** - 保留
- **FPS** - 保留或译为"帧率"
- **API** - 保留或译为"接口"

### 工具名称

OpenAI Function Calling 的工具名称（如 `execute_ffmpeg_command`）**不应翻译**，保持英文。

---

## 预计工作量

| 任务 | 工作量 | 状态 |
|------|--------|------|
| 提取系统提示词文本 | 0.5 天 | ⏳ 待开始 |
| 翻译到 12 种语言 | 1 天 | ⏳ 待开始 |
| 更新 system-prompt.ts | 0.25 天 | ⏳ 待开始 |
| 测试验证 | 0.25 天 | ⏳ 待开始 |
| **总计** | **2 天** | ⏳ 待开始 |

---

## 下一步行动

1. ✅ **创建实施计划** - 本文档
2. ⏳ **提取文本** - 从 system-prompt.ts 提取 FFmpeg 相关文本
3. ⏳ **创建翻译键** - 添加到 i18n 系统
4. ⏳ **批量翻译** - 使用自动化工具翻译到 12 种语言
5. ⏳ **人工审核** - 审核关键术语和技术词汇
6. ⏳ **更新代码** - 修改 system-prompt.ts 使用 i18next.t()
7. ⏳ **测试验证** - 在多种语言环境下测试
8. ⏳ **文档同步** - 更新文档和任务清单

---

**预计完成时间**: 2026-09-02（2 天工作量）
