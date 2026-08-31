# FFmpeg AI 工具使用指南

> 本文档为 AI 助手提供 FFmpeg 视频处理工具的完整使用指南
> **适用对象**: AI 助手（Claude, GPT, 等）
> **文档版本**: v1.0 (2026-08-31)

---

## 📖 目录

1. [快速开始](#快速开始)
2. [核心概念](#核心概念)
3. [工具清单](#工具清单)
4. [使用场景与最佳实践](#使用场景与最佳实践)
5. [常见错误处理](#常见错误处理)
6. [参数格式规范](#参数格式规范)
7. [性能优化建议](#性能优化建议)

---

## 快速开始

### 什么是 FFmpeg AI 工具？

FFmpeg AI 工具是 29 个预定义的视频处理工具，覆盖了视频编辑的完整工作流：

- **Phase 1**: FFmpeg 基础（3 个工具）
- **Phase 2**: 视频导出（4 个工具）
- **Phase 3**: 格式转换（2 个工具）
- **Phase 4**: 视频滤镜（7 个工具）
- **Phase 5**: 字幕处理（4 个工具）
- **Phase 6**: 音频处理（5 个工具）
- **Phase 7**: 合并/分割（4 个工具）

### 何时使用 FFmpeg 工具？

当用户请求涉及以下操作时，使用 FFmpeg 工具：

✅ **适合使用 FFmpeg 工具**:
- "把视频转成 MP4 格式"
- "合并这两个视频文件"
- "给视频加上字幕"
- "调整音频音量"
- "裁剪视频的前 10 秒"
- "给视频添加模糊效果"

❌ **不适合使用 FFmpeg 工具**:
- "在时间线上添加一个视频片段" → 使用 `add_element_to_timeline`
- "修改字幕样式" → 使用 `update_element_properties`
- "生成一张图片" → 使用 `generate_image`
- "删除一个轨道" → 使用 `delete_timeline_track`

### 基本工作流

```
1. 理解用户需求
   ↓
2. 选择合适的工具
   ↓
3. 验证必需参数
   ↓
4. 调用工具
   ↓
5. 处理结果
   ↓
6. 向用户反馈
```

---

## 核心概念

### 1. 文件路径规则

**所有文件路径必须是绝对路径**，以 `/` 开头：

```typescript
// ✅ 正确
const videoPath = "/my-video.mp4";
const outputPath = "/output.mp4";

// ❌ 错误
const videoPath = "my-video.mp4";
const videoPath = "./my-video.mp4";
```

**为什么？**
- 视频编辑器运行在浏览器环境中
- 所有文件存储在虚拟文件系统中
- 使用相对路径会导致文件找不到

### 2. 服务可用性检查

FFmpeg 工具依赖以下服务：

| 服务 | 必需性 | 检查方式 |
|------|--------|---------|
| **EditorCore** | 必需 | `EditorCore.getInstance()` |
| **Renderer** | 必需 | `editor.renderer` |
| **FFmpegService** | 视频/音频处理 | `renderer.ffmpegService` |
| **FFmpegExporter** | 视频导出 | `renderer.ffmpegExporter` |
| **VideoComposer** | 合并/分割 | `renderer.getVideoComposer()` |

**处理不可用情况**:
```typescript
const editor = EditorCore.getInstance();
const renderer = editor.renderer;

if (!renderer) {
    return {
        success: false,
        message: "FFmpeg export is not enabled. Please enable FFmpeg export first.",
    };
}

const ffmpegService = (renderer as any).ffmpegService;
if (!ffmpegService) {
    return {
        success: false,
        message: "FFmpegService is not initialized.",
    };
}
```

### 3. 统一响应格式

所有 FFmpeg 工具都返回统一的响应格式：

```typescript
{
    success: boolean;       // 操作是否成功
    message: string;        // 人类可读的消息
    data?: {                // 可选的数据字段
        [key: string]: any;
    };
}
```

**成功响应示例**:
```typescript
{
    success: true,
    message: "Video merged successfully",
    data: {
        outputFile: "/merged.mp4",
        duration: 120.5,
        size: 52428800,
    }
}
```

**失败响应示例**:
```typescript
{
    success: false,
    message: "FFmpegService is not initialized. Please enable FFmpeg export first.",
}
```

### 4. 错误处理原则

**三个核心原则**:

1. **提前验证** - 在执行前检查所有必需条件
2. **优雅降级** - 提供清晰的错误消息
3. **统一格式** - 始终返回 `{ success, message }`

**标准错误处理模式**:
```typescript
async execute(args) {
    try {
        // 1. 参数验证
        if (!isAbsolutePath(args.filePath)) {
            return {
                success: false,
                message: "File path must be an absolute path",
            };
        }

        // 2. 服务检查
        const editor = EditorCore.getInstance();
        const renderer = editor.renderer;
        if (!renderer) {
            return {
                success: false,
                message: "FFmpeg export is not enabled.",
            };
        }

        // 3. 执行操作
        const result = await ffmpegService.exec(command);

        // 4. 返回结果
        return {
            success: result.exitCode === 0,
            message: result.exitCode === 0
                ? "Operation succeeded"
                : `Operation failed with exit code ${result.exitCode}`,
            data: { ... },
        };
    } catch (error) {
        return {
            success: false,
            message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
```

---

## 工具清单

### Phase 1: FFmpeg 基础工具（3 个）

#### 1. `execute_ffmpeg_command`

**描述**: 执行自定义 FFmpeg 命令（高级功能）

**使用场景**:
- 执行自定义 FFmpeg 命令
- 高级用户需要精细控制
- 特殊编码参数或滤镜

**参数**:
```typescript
{
    args: string[];           // 必需: FFmpeg 命令参数数组
    timeout?: number;         // 可选: 超时时间（毫秒，默认 300000）
}
```

**示例**:
```typescript
// 获取 FFmpeg 版本
execute_ffmpeg_command({
    args: ["-version"],
});

// 转换格式
execute_ffmpeg_command({
    args: ["-i", "/input.mp4", "-c:v", "libx264", "/output.mp4"],
    timeout: 600000,  // 10 分钟超时
});
```

**注意事项**:
- ⚠️ 这是低级别工具，优先使用更高级的工具
- 需要了解 FFmpeg 命令行语法

---

#### 2. `get_ffmpeg_status`

**描述**: 检查 FFmpeg 服务状态

**使用场景**:
- 检查 FFmpeg 是否已加载
- 获取 FFmpeg 版本信息
- 故障排查

**参数**:
```typescript
{}
```

**示例**:
```typescript
const { success, data } = await get_ffmpeg_status({});

if (success && data?.loaded) {
    console.log("FFmpeg is ready");
} else {
    console.log("FFmpeg is not loaded");
}
```

**返回值**:
```typescript
{
    success: true,
    data: {
        enabled: boolean;     // FFmpeg export 是否启用
        loaded: boolean;      // FFmpeg 是否已加载
    }
}
```

---

#### 3. `check_file_exists`

**描述**: 检查文件是否存在于虚拟文件系统

**使用场景**:
- 验证输入文件是否存在
- 检查输出文件是否已存在
- 文件存在性检查

**参数**:
```typescript
{
    filePath: string;        // 必需: 绝对文件路径
}
```

**示例**:
```typescript
const { success, data } = await check_file_exists({
    filePath: "/my-video.mp4",
});

if (data?.exists) {
    console.log("File exists");
} else {
    console.log("File not found");
}
```

---

### Phase 2: 视频导出工具（4 个）

#### 4. `export_video`

**描述**: 导出时间线为视频文件

**使用场景**:
- 将时间线内容导出为视频
- 生成最终视频成品

**参数**:
```typescript
{
    outputFile?: string;           // 可选: 输出文件路径（默认自动生成）
    format?: "mp4" | "webm";      // 可选: 输出格式
    quality?: "low" | "medium" | "high" | "max";  // 可选: 质量预设
    includeAudio?: boolean;        // 可选: 是否包含音频
}
```

**示例**:
```typescript
await export_video({
    outputFile: "/final-video.mp4",
    format: "mp4",
    quality: "high",
    includeAudio: true,
});
```

**注意事项**:
- ⚠️ 这是一个长时间运行的操作（可能需要几分钟）
- 会自动从 EditorCore 获取时间线、轨道和媒体资源

---

#### 5. `get_video_info`

**描述**: 获取视频文件的详细信息

**使用场景**:
- 获取视频分辨率、帧率、时长
- 检查视频编码格式
- 获取文件大小

**参数**:
```typescript
{
    filePath: string;        // 必需: 视频文件路径
}
```

**示例**:
```typescript
const { success, data } = await get_video_info({
    filePath: "/my-video.mp4",
});

console.log(data); // { width: 1920, height: 1080, fps: 30, duration: 120.5, size: 52428800 }
```

---

#### 6. `get_video_duration`

**描述**: 获取视频时长（秒）

**使用场景**:
- 快速获取视频时长
- 不需要完整的视频信息

**参数**:
```typescript
{
    filePath: string;        // 必需: 视频文件路径
}
```

**示例**:
```typescript
const { success, data } = await get_video_duration({
    filePath: "/my-video.mp4",
});

console.log(`Duration: ${data?.duration}s`);
```

---

#### 7. `generate_thumbnail`

**描述**: 从视频中提取缩略图

**使用场景**:
- 生成视频封面图
- 提取关键帧

**参数**:
```typescript
{
    filePath: string;            // 必需: 视频文件路径
    outputFile: string;          // 必需: 输出图片路径
    time?: number;               // 可选: 提取时间点（秒，默认 0）
}
```

**示例**:
```typescript
await generate_thumbnail({
    filePath: "/my-video.mp4",
    outputFile: "/thumbnail.png",
    time: 5,  // 第 5 秒
});
```

---

### Phase 3: 格式转换工具（2 个）

#### 8. `convert_video_format`

**描述**: 转换视频格式

**使用场景**:
- 将视频转换为不同格式（MP4/WebM/AVI 等）
- 重新编码视频

**参数**:
```typescript
{
    inputFile: string;           // 必需: 输入文件路径
    outputFile: string;          // 必需: 输出文件路径
    targetFormat: "mp4" | "webm" | "avi" | "mov" | "mkv";  // 必需: 目标格式
    quality?: "low" | "medium" | "high" | "max";            // 可选: 质量预设
    codec?: string;              // 可选: 自定义编码器
    crf?: number;                // 可选: 质量因子（0-51，默认 23）
}
```

**示例**:
```typescript
// 转换为 MP4（高质量）
await convert_video_format({
    inputFile: "/input.avi",
    outputFile: "/output.mp4",
    targetFormat: "mp4",
    quality: "high",
});

// 转换为 WebM（自定义 CRF）
await convert_video_format({
    inputFile: "/input.mp4",
    outputFile: "/output.webm",
    targetFormat: "webm",
    crf: 18,
});
```

**质量预设映射**:
- `low` → CRF 28（文件小，质量较低）
- `medium` → CRF 23（平衡）
- `high` → CRF 18（高质量）
- `max` → CRF 15（最高质量，文件大）

---

#### 9. `batch_convert_format`

**描述**: 批量转换多个视频格式

**使用场景**:
- 批量处理多个文件
- 统一格式

**参数**:
```typescript
{
    files: Array<{                   // 必需: 文件列表
        inputFile: string;
        outputFile: string;
    }>;
    targetFormat: "mp4" | "webm" | "avi" | "mov" | "mkv";  // 必需: 目标格式
    quality?: "low" | "medium" | "high" | "max";            // 可选: 质量预设
}
```

**示例**:
```typescript
await batch_convert_format({
    files: [
        { inputFile: "/video1.avi", outputFile: "/video1.mp4" },
        { inputFile: "/video2.avi", outputFile: "/video2.mp4" },
        { inputFile: "/video3.avi", outputFile: "/video3.mp4" },
    ],
    targetFormat: "mp4",
    quality: "high",
});
```

**注意**:
- 会**顺序**处理每个文件
- 如果某个文件失败，会继续处理下一个

---

### Phase 4: 视频滤镜工具（7 个）

#### 10. `apply_color_correction`

**描述**: 应用颜色校正（亮度、对比度、饱和度、色相）

**使用场景**:
- 调整视频色调
- 修复曝光问题
- 增强色彩

**参数**:
```typescript
{
    videoFile: string;         // 必需: 输入视频
    outputFile: string;        // 必需: 输出视频
    brightness?: number;       // 可选: 亮度（-1 到 1，默认 0）
    contrast?: number;         // 可选: 对比度（0 到 2，默认 1）
    saturation?: number;       // 可选: 饱和度（0 到 3，默认 1）
    hue?: number;              // 可选: 色相（0 到 360，默认 0）
}
```

**示例**:
```typescript
// 增强亮度和对比度
await apply_color_correction({
    videoFile: "/input.mp4",
    outputFile: "/output.mp4",
    brightness: 0.2,
    contrast: 1.3,
});

// 调整色相
await apply_color_correction({
    videoFile: "/input.mp4",
    outputFile: "/output.mp4",
    hue: 90,
});
```

---

#### 11. `apply_blur`

**描述**: 应用模糊效果

**使用场景**:
- 背景虚化
- 柔化画面
- 隐私保护（模糊人脸）

**参数**:
```typescript
{
    videoFile: string;         // 必需: 输入视频
    outputFile: string;        // 必需: 输出视频
    blurType?: "gaussian" | "box" | "motion";  // 可选: 模糊类型
    strength?: number;         // 可选: 模糊强度（1-20，默认 5）
}
```

**示例**:
```typescript
// 高斯模糊
await apply_blur({
    videoFile: "/input.mp4",
    outputFile: "/output.mp4",
    blurType: "gaussian",
    strength: 10,
});
```

---

#### 12. `apply_sharpen`

**描述**: 应用锐化效果

**使用场景**:
- 增强画面锐度
- 修复模糊视频

**参数**:
```typescript
{
    videoFile: string;         // 必需: 输入视频
    outputFile: string;        // 必需: 输出视频
    amount?: number;           // 可选: 锐化强度（0 到 2，默认 1）
    radius?: number;           // 可选: 锐化半径（0 到 5，默认 1）
}
```

**示例**:
```typescript
await apply_sharpen({
    videoFile: "/input.mp4",
    outputFile: "/output.mp4",
    amount: 1.5,
    radius: 2,
});
```

---

#### 13. `apply_lut`

**描述**: 应用 3D LUT 调色

**使用场景**:
- 应用电影级调色
- 使用预设颜色风格
- 批量调色

**参数**:
```typescript
{
    videoFile: string;         // 必需: 输入视频
    outputFile: string;        // 必需: 输出视频
    lutFile: string;           // 必需: LUT 文件路径（.cube 格式）
    intensity?: number;        // 可选: 强度（0 到 1，默认 1）
}
```

**示例**:
```typescript
await apply_lut({
    videoFile: "/input.mp4",
    outputFile: "/output.mp4",
    lutFile: "/cinematic.cube",
    intensity: 0.8,
});
```

**注意**:
- LUT 文件必须先上传到虚拟文件系统
- 支持 `.cube` 格式的 3D LUT

---

#### 14. `apply_filter_chain`

**描述**: 应用多个滤镜的组合

**使用场景**:
- 组合多个效果
- 创建复杂滤镜链

**参数**:
```typescript
{
    videoFile: string;         // 必需: 输入视频
    outputFile: string;        // 必需: 输出视频
    filters: Array<{           // 必需: 滤镜列表
        type: "blur" | "sharpen" | "color_correction";
        params: Record<string, any>;
    }>;
}
```

**示例**:
```typescript
await apply_filter_chain({
    videoFile: "/input.mp4",
    outputFile: "/output.mp4",
    filters: [
        { type: "color_correction", params: { brightness: 0.1, contrast: 1.2 } },
        { type: "sharpen", params: { amount: 1.3 } },
    ],
});
```

**执行顺序**: 滤镜按数组顺序依次应用

---

#### 15. `adjust_video_speed`

**描述**: 调整视频播放速度

**使用场景**:
- 创建快动作/慢动作效果
- 调整视频时长

**参数**:
```typescript
{
    videoFile: string;         // 必需: 输入视频
    outputFile: string;        // 必需: 输出视频
    speed: number;             // 必需: 速度倍率（0.25 到 4）
                                // 0.5 = 慢动作（2x 时长）
                                // 2 = 快动作（0.5x 时长）
}
```

**示例**:
```typescript
// 慢动作（0.5x 速度）
await adjust_video_speed({
    videoFile: "/input.mp4",
    outputFile: "/slow-motion.mp4",
    speed: 0.5,
});

// 快动作（2x 速度）
await adjust_video_speed({
    videoFile: "/input.mp4",
    outputFile: "/fast-motion.mp4",
    speed: 2,
});
```

---

#### 16. `reverse_video`

**描述**: 反转视频播放方向

**使用场景**:
- 创建倒放效果
- 创意视频编辑

**参数**:
```typescript
{
    videoFile: string;         // 必需: 输入视频
    outputFile: string;        // 必需: 输出视频
    reverseAudio?: boolean;    // 可选: 是否同时反转音频（默认 false）
}
```

**示例**:
```typescript
await reverse_video({
    videoFile: "/input.mp4",
    outputFile: "/reversed.mp4",
    reverseAudio: true,
});
```

---

### Phase 5: 字幕工具（4 个）

#### 17. `parse_subtitles`

**描述**: 解析字幕文件（SRT 或 VTT）

**使用场景**:
- 读取字幕文件
- 提取字幕内容

**参数**:
```typescript
{
    filePath: string;          // 必需: 字幕文件路径
}
```

**示例**:
```typescript
const { success, data } = await parse_subtitles({
    filePath: "/subtitles.srt",
});

console.log(data?.subtitles); // [{ start: 0, end: 5, text: "Hello" }, ...]
```

**返回值**:
```typescript
{
    success: true,
    data: {
        format: "srt" | "vtt";
        count: number;          // 字幕数量
        duration: number;       // 总时长（秒）
        subtitles: Array<{
            start: number;      // 开始时间（秒）
            end: number;        // 结束时间（秒）
            text: string;       // 字幕文本
        }>;
    }
}
```

---

#### 18. `burn_subtitles`

**描述**: 将字幕烧录到视频中（硬字幕）

**使用场景**:
- 创建带字幕的视频成品
- 生成字幕版本用于分发

**参数**:
```typescript
{
    videoFile: string;         // 必需: 输入视频
    subtitleFile: string;      // 必需: 字幕文件路径
    outputFile: string;        // 必需: 输出视频
    fontSize?: number;         // 可选: 字体大小（12-72，默认 24）
    fontColor?: string;        // 可选: 字体颜色（默认 "white"）
    backgroundColor?: string;  // 可选: 背景颜色（默认 "black@0.5"）
    position?: "bottom" | "top" | "middle";  // 可选: 位置（默认 "bottom"）
}
```

**示例**:
```typescript
await burn_subtitles({
    videoFile: "/input.mp4",
    subtitleFile: "/subtitles.srt",
    outputFile: "/with-subs.mp4",
    fontSize: 28,
    fontColor: "white",
    backgroundColor: "black@0.7",
    position: "bottom",
});
```

**注意**:
- ⚠️ 这需要**重新编码**视频（速度较慢）
- 字幕将永久嵌入视频中，无法后续修改

---

#### 19. `add_subtitle_track`

**描述**: 添加可编辑的字幕轨道

**使用场景**:
- 添加多语言字幕
- 创建可编辑的字幕轨道

**参数**:
```typescript
{
    subtitleFile: string;      // 必需: 字幕文件路径
    language?: string;         // 可选: 语言代码（如 "en", "zh"，默认 "en"）
    label?: string;            // 可选: 显示标签
    enabled?: boolean;         // 可选: 是否启用（默认 true）
}
```

**示例**:
```typescript
await add_subtitle_track({
    subtitleFile: "/subtitles.srt",
    language: "zh",
    label: "中文",
    enabled: true,
});
```

**注意**:
- ✅ 字幕轨道可以**后续编辑**
- ✅ 支持多个语言轨道

---

#### 20. `translate_subtitles`

**描述**: 翻译字幕到目标语言

**使用场景**:
- 创建多语言字幕版本
- 字幕本地化

**参数**:
```typescript
{
    subtitleFile: string;      // 必需: 输入字幕文件
    targetLanguage: string;    // 必需: 目标语言代码（如 "en", "zh"）
    outputFile: string;        // 必需: 输出字幕文件
}
```

**示例**:
```typescript
await translate_subtitles({
    subtitleFile: "/subtitles-en.srt",
    targetLanguage: "zh",
    outputFile: "/subtitles-zh.srt",
});
```

**注意**:
- ⚠️ 当前版本仅返回解析后的字幕信息
- ⚠️ 实际的翻译功能需要集成翻译 API

---

### Phase 6: 音频处理工具（5 个）

#### 21. `apply_equalizer`

**描述**: 应用音频均衡器

**使用场景**:
- 调整音频频段
- 增强低音/高音
- 修复音频频响

**参数**:
```typescript
{
    audioFile: string;         // 必需: 输入音频/视频
    outputFile: string;        // 必需: 输出音频/视频
    bands?: Array<{            // 可选: 自定义频段
        frequency: number;     // 频率（Hz）
        gain: number;          // 增益（-12 到 +12 dB）
    }>;
    preset?: "flat" | "bass-boost" | "treble-boost" | "vocal" | "loudness";
                            // 可选: 快速预设
}
```

**示例**:
```typescript
// 使用预设
await apply_equalizer({
    audioFile: "/audio.mp3",
    outputFile: "/equalized.mp3",
    preset: "bass-boost",
});

// 自定义频段
await apply_equalizer({
    audioFile: "/audio.mp3",
    outputFile: "/equalized.mp3",
    bands: [
        { frequency: 100, gain: 6 },    // 增强低音
        { frequency: 4000, gain: 3 },   // 增强高音
    ],
});
```

**10 段均衡器频率**:
32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 Hz

---

#### 22. `apply_compressor`

**描述**: 应用音频压缩器（控制动态范围）

**使用场景**:
- 平衡音频音量
- 减少动态范围
- 提升整体响度

**参数**:
```typescript
{
    audioFile: string;         // 必需: 输入音频/视频
    outputFile: string;        // 必需: 输出音频/视频
    threshold?: number;        // 可选: 压缩阈值（-60 到 0 dB，默认 -24）
    ratio?: number;            // 可选: 压缩比（1 到 20，默认 2）
    attack?: number;           // 可选: 启动时间（0.1 到 100 ms，默认 20）
    release?: number;          // 可选: 释放时间（10 到 2000 ms，默认 250）
    makeupGain?: number;       // 可选: 补偿增益（0 到 24 dB，默认 0）
}
```

**示例**:
```typescript
await apply_compressor({
    audioFile: "/audio.mp3",
    outputFile: "/compressed.mp3",
    threshold: -20,
    ratio: 3,
    attack: 10,
    release: 100,
    makeupGain: 3,
});
```

**参数说明**:
- **threshold**: 超过此电平的信号会被压缩
- **ratio**: 压缩比（2:1 表示超过阈值 2dB 的输出只增加 1dB）
- **attack**: 压缩器响应的速度
- **release**: 压缩器停止压缩的速度
- **makeupGain**: 压缩后提升整体音量

---

#### 23. `apply_reverb`

**描述**: 应用混响效果（添加空间感）

**使用场景**:
- 添加空间深度
- 创造氛围
- 模拟不同声学环境

**参数**:
```typescript
{
    audioFile: string;         // 必需: 输入音频/视频
    outputFile: string;        // 必需: 输出音频/视频
    type?: "room" | "hall" | "cathedral" | "plate" | "spring";  // 可选: 混响类型
    roomSize?: number;         // 可选: 房间大小（0 到 1，默认 0.5）
    wetMix?: number;           // 可选: 湿声比例（0 到 1，默认 0.3）
    damping?: number;          // 可选: 阻尼（0 到 1，默认 0.5）
}
```

**示例**:
```typescript
// 大厅混响
await apply_reverb({
    audioFile: "/vocals.mp3",
    outputFile: "/reverb.mp3",
    type: "hall",
    roomSize: 0.8,
    wetMix: 0.4,
});
```

**混响类型**:
- `room`: 小房间氛围
- `hall`: 大型音乐厅
- `cathedral`: 大教堂
- `plate`: 经典板式混响
- `spring`: 复古弹簧混响

---

#### 24. `apply_audio_effects_chain`

**描述**: 应用多个音频效果链

**使用场景**:
- 组合多个音频效果
- 创建复杂的音频处理流程

**参数**:
```typescript
{
    audioFile: string;         // 必需: 输入音频/视频
    outputFile: string;        // 必需: 输出音频/视频
    effects: Array<{           // 必需: 效果列表
        type: "equalizer" | "compressor" | "reverb" | "normalize";
        params: Record<string, any>;
    }>;
}
```

**示例**:
```typescript
await apply_audio_effects_chain({
    audioFile: "/raw-audio.mp3",
    outputFile: "/processed.mp3",
    effects: [
        { type: "compressor", params: { threshold: -20, ratio: 2 } },
        { type: "equalizer", params: { preset: "vocal" } },
        { type: "normalize", params: { targetLoudness: -16 } },
    ],
});
```

**执行顺序**: 效果按数组顺序依次应用

---

#### 25. `normalize_audio`

**描述**: 标准化音频响度

**使用场景**:
- 统一音频响度级别
- 符合广播/流媒体标准

**参数**:
```typescript
{
    audioFile: string;         // 必需: 输入音频/视频
    outputFile: string;        // 必需: 输出音频/视频
    targetLoudness?: number;   // 可选: 目标响度（-30 到 -6 LUFS，默认 -23）
    truePeak?: number;         // 可选: 峰值限制（-3 到 0 dBTP，默认 -2）
}
```

**示例**:
```typescript
// YouTube 标准
await normalize_audio({
    audioFile: "/audio.mp3",
    outputFile: "/normalized.mp3",
    targetLoudness: -16,
    truePeak: -2,
});
```

**响度标准**:
- `-23 LUFS`: EBU R128（欧洲广播标准）
- `-16 LUFS`: Netflix, YouTube（流媒体）
- `-14 LUFS`: 播客
- `-9 LUFS`: 美国广播（ATSC A/85）

---

### Phase 7: 视频合并/分割工具（4 个）

#### 26. `merge_videos`

**描述**: 合并多个视频文件

**使用场景**:
- 拼接视频片段
- 合并多个视频为一个

**参数**:
```typescript
{
    inputFiles: string[];      // 必需: 输入文件列表
    outputFile: string;        // 必需: 输出文件路径
    includeAudio?: boolean;    // 可选: 是否包含音频（默认 true）
}
```

**示例**:
```typescript
await merge_videos({
    inputFiles: ["/video1.mp4", "/video2.mp4", "/video3.mp4"],
    outputFile: "/merged.mp4",
    includeAudio: true,
});
```

**注意**:
- 输入文件将按数组顺序合并
- 使用**流复制模式**（快速，无重新编码）

---

#### 27. `concat_with_transitions`

**描述**: 带转场效果的视频合并

**使用场景**:
- 添加淡入淡出转场
- 创建专业视频过渡

**参数**:
```typescript
{
    inputFiles: string[];      // 必需: 输入文件列表
    transitions: Array<{       // 必需: 转场配置
        type: "fade" | "slide" | "wipe" | "dissolve";
        duration: number;      // 转场时长（秒）
    }>;
    outputFile: string;        // 必需: 输出文件路径
}
```

**示例**:
```typescript
await concat_with_transitions({
    inputFiles: ["/video1.mp4", "/video2.mp4"],
    transitions: [
        { type: "fade", duration: 1 },  // 1 秒淡入淡出
    ],
    outputFile: "/with-transitions.mp4",
});
```

**支持的转场类型**:
- `fade`: 淡入淡出
- `slide`: 滑动
- `wipe`: 擦除
- `dissolve`: 溶解

**注意**:
- ⚠️ 需要**重新编码**（速度较慢）
- transitions 数量应比 inputFiles 少 1

---

#### 28. `split_video`

**描述**: 按时间点分割视频

**使用场景**:
- 将长视频分割成多个片段
- 提取特定片段

**参数**:
```typescript
{
    inputFile: string;         // 必需: 输入文件路径
    splitPoints: number[];     // 必需: 分割时间点（秒）
    outputPrefix: string;      // 必需: 输出文件前缀
}
```

**示例**:
```typescript
// 在第 10 秒和第 20 秒处分割
const { success, data } = await split_video({
    inputFile: "/long-video.mp4",
    splitPoints: [10, 20],
    outputPrefix: "/segment_",
});

// 输出: /segment_1.mp4 (0-10s), /segment_2.mp4 (10-20s), /segment_3.mp4 (20s-结束)
```

**注意**:
- splitPoints 应该是有序的时间点
- 输出文件名: `${outputPrefix}${index}.mp4`

---

#### 29. `trim_video`

**描述**: 裁剪视频的开始/结束部分

**使用场景**:
- 去掉视频开头/结尾
- 提取特定时间段

**参数**:
```typescript
{
    inputFile: string;         // 必需: 输入文件路径
    startTime: number;         // 必需: 开始时间（秒）
    endTime: number;           // 必需: 结束时间（秒）
    outputFile: string;        // 必需: 输出文件路径
    reencode?: boolean;        // 可选: 是否重新编码（默认 false）
}
```

**示例**:
```typescript
// 提取第 10-20 秒
await trim_video({
    inputFile: "/input.mp4",
    startTime: 10,
    endTime: 20,
    outputFile: "/trimmed.mp4",
});
```

**参数说明**:
- **startTime**: 新视频的开始时间（秒）
- **endTime**: 新视频的结束时间（秒）
- **reencode**: 是否重新编码
  - `false`: 流复制（快速，但可能不精确）
  - `true`: 重新编码（精确，但速度慢）

**注意**:
- ⚠️ 确保 `startTime < endTime`
- ⚠️ 确保 `endTime` 不超过视频总时长

---

## 使用场景与最佳实践

### 场景 1: 视频格式转换

**用户请求**: "把视频转成 MP4 格式"

**推荐工作流**:
```
1. get_video_info({ filePath: "/input.avi" })
   ↓
2. convert_video_format({
       inputFile: "/input.avi",
       outputFile: "/output.mp4",
       targetFormat: "mp4",
       quality: "high"
   })
   ↓
3. 向用户报告转换成功
```

**为什么不直接用 convert_video_format？**
- 先检查输入文件是否存在
- 了解输入视频的基本信息

---

### 场景 2: 添加字幕

**用户请求**: "给视频加上字幕"

**推荐工作流**:
```
1. parse_subtitles({ filePath: "/subtitles.srt" })
   ↓
2. burn_subtitles({
       videoFile: "/video.mp4",
       subtitleFile: "/subtitles.srt",
       outputFile: "/with-subs.mp4",
       fontSize: 24,
       fontColor: "white"
   })
   ↓
3. 向用户报告字幕已烧录
```

**替代方案**（如果需要可编辑字幕）:
```
add_subtitle_track({
    subtitleFile: "/subtitles.srt",
    language: "zh",
    label: "中文"
})
```

---

### 场景 3: 视频合并

**用户请求**: "把这三个视频合并在一起"

**推荐工作流**:
```
1. merge_videos({
       inputFiles: ["/v1.mp4", "/v2.mp4", "/v3.mp4"],
       outputFile: "/merged.mp4"
   })
   ↓
2. 向用户报告合并完成
```

**如果需要转场**:
```
concat_with_transitions({
    inputFiles: ["/v1.mp4", "/v2.mp4", "/v3.mp4"],
    transitions: [
        { type: "fade", duration: 1 },
        { type: "fade", duration: 1 }
    ],
    outputFile: "/merged.mp4"
})
```

---

### 场景 4: 音频增强

**用户请求**: "优化音频质量"

**推荐工作流**:
```
1. apply_audio_effects_chain({
       audioFile: "/raw.mp3",
       outputFile: "/enhanced.mp3",
       effects: [
           { type: "compressor", params: { threshold: -20, ratio: 2 } },
           { type: "equalizer", params: { preset: "vocal" } },
           { type: "normalize", params: { targetLoudness: -16 } }
       ]
   })
   ↓
2. 向用户报告处理完成
```

---

### 场景 5: 视频裁剪

**用户请求**: "去掉视频的前 5 秒"

**推荐工作流**:
```
1. get_video_duration({ filePath: "/input.mp4" })
   ↓
2. trim_video({
       inputFile: "/input.mp4",
       startTime: 5,
       endTime: duration,  // 从步骤 1 获取
       outputFile: "/trimmed.mp4"
   })
   ↓
3. 向用户报告裁剪完成
```

---

## 常见错误处理

### 错误 1: FFmpeg 未启用

**错误消息**:
```
"FFmpeg export is not enabled. Please enable FFmpeg export first."
```

**原因**: EditorCore.renderer 为 null

**解决方案**:
- 告诉用户需要先在设置中启用 FFmpeg 导出
- 或者检查 EditorCore 是否正确初始化

---

### 错误 2: FFmpegService 未初始化

**错误消息**:
```
"FFmpegService is not initialized."
```

**原因**: renderer.ffmpegService 为 null

**解决方案**:
- 用户需要启用 FFmpeg 导出功能
- 检查 FFmpeg.wasm 是否已加载

---

### 错误 3: 文件路径不是绝对路径

**错误消息**:
```
"File path must be an absolute path (e.g., '/video.mp4')"
```

**原因**: 提供了相对路径

**解决方案**:
- 确保所有文件路径以 `/` 开头
- 使用绝对路径格式

---

### 错误 4: FFmpeg 命令执行失败

**错误消息**:
```
"FFmpeg command failed with exit code 1"
```

**原因**: FFmpeg 命令执行失败

**解决方案**:
1. 检查 `stderr` 中的详细错误信息
2. 验证输入文件是否存在
3. 检查参数是否正确
4. 查看 FFmpeg 文档确认命令语法

---

### 错误 5: 超时

**错误消息**:
```
"FFmpeg command timed out after 300000ms"
```

**原因**: 操作时间过长

**解决方案**:
- 增加 `timeout` 参数
- 优化处理流程
- 告知用户操作需要更长时间

---

## 参数格式规范

### 文件路径

```typescript
// ✅ 正确
"/video.mp4"
"/path/to/file.mp4"

// ❌ 错误
"video.mp4"
"./video.mp4"
"../video.mp4"
"C:\\video.mp4"  // Windows 风格路径
```

### 数值参数

```typescript
// 时间（秒）
duration: 120.5
startTime: 10
endTime: 20.5

// 质量因子（CRF）
crf: 23  // 范围 0-51

// 速度倍率
speed: 2  // 2x 速度
```

### 枚举参数

```typescript
// 格式
format: "mp4" | "webm" | "avi"

// 质量
quality: "low" | "medium" | "high" | "max"

// 混响类型
type: "room" | "hall" | "cathedral"
```

### 布尔参数

```typescript
// 可选布尔参数
includeAudio: true
reencode: false
```

### 数组参数

```typescript
// 文件列表
inputFiles: ["/v1.mp4", "/v2.mp4", "/v3.mp4"]

// 均衡器频段
bands: [
    { frequency: 100, gain: 6 },
    { frequency: 4000, gain: 3 }
]

// 滤镜链
filters: [
    { type: "color_correction", params: { brightness: 0.1 } },
    { type: "sharpen", params: { amount: 1.3 } }
]
```

---

## 性能优化建议

### 1. 使用流复制模式（当可用时）

**快速模式**:
- `merge_videos` 默认使用流复制（-c copy）
- `trim_video` 可以使用流复制（reencode: false）

**优点**:
- 速度极快（无重新编码）
- 保持原始质量

**缺点**:
- 格式必须兼容
- 某些操作不支持

### 2. 选择合适的质量预设

```typescript
// 快速预览（低质量）
quality: "low"

// 平衡质量和文件大小
quality: "medium"

// 高质量输出
quality: "high"

// 最高质量（大文件）
quality: "max"
```

### 3. 批量处理

```typescript
// ✅ 好：批量转换
batch_convert_format({
    files: [...],
    targetFormat: "mp4"
})

// ❌ 差：逐个转换（多次 FFmpeg 启动）
for (const file of files) {
    convert_video_format({ ... });
}
```

### 4. 异步执行

```typescript
// ✅ 好：并行执行（如果工具之间没有依赖）
const [result1, result2] = await Promise.all([
    convert_video_format({ ... }),
    apply_blur({ ... })
]);

// ❌ 差：顺序执行
await convert_video_format({ ... });
await apply_blur({ ... });
```

### 5. 超时设置

```typescript
// 简单操作
execute_ffmpeg_command({
    args: ["-version"],
    timeout: 10000  // 10 秒
});

// 长时间操作
execute_ffmpeg_command({
    args: [...],
    timeout: 600000  // 10 分钟
});
```

---

## 总结

### 关键要点

1. **所有路径必须是绝对路径**（以 `/` 开头）
2. **检查服务可用性**（EditorCore, FFmpegService）
3. **使用统一的响应格式**（`{ success, message, data }`）
4. **提供清晰的错误消息**
5. **优先使用高级工具**（而非 `execute_ffmpeg_command`）

### 工具选择决策树

```
用户请求视频处理
    ↓
是否需要导出时间线？
    ├─ 是 → export_video
    └─ 否 ↓
        是否是格式转换？
            ├─ 是 → convert_video_format / batch_convert_format
            └─ 否 ↓
                是否需要滤镜？
                    ├─ 是 → apply_* (滤镜工具)
                    └─ 否 ↓
                        是否涉及音频？
                            ├─ 是 → apply_* (音频工具)
                            └─ 否 ↓
                                是否合并/分割？
                                    ├─ 是 → merge_videos / split_video / trim_video
                                    └─ 否 → execute_ffmpeg_command（高级操作）
```

### 下一步

- ✅ **系统提示词已更新** - 集成工具使用指南
- ⏳ **实际测试** - 在真实浏览器环境中验证工具功能
- ⏳ **用户反馈** - 根据实际使用情况优化指南

---

**文档版本**: v1.0
**最后更新**: 2026-08-31
**维护者**: Cutia AI Team
