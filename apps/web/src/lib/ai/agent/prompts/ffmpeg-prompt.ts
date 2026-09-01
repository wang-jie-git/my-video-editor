// FFmpeg 工具的多语言提示词片段
// 此文件生成系统提示词中 FFmpeg 部分的文本

export const ffmpegPromptEn = `
## FFmpeg Video Processing Tools

### When to Use FFmpeg Tools
Use FFmpeg tools when the user requests:
- Video format conversion (MP4, WebM, AVI, etc.)
- Video merging or splitting
- Subtitle burning or parsing
- Audio processing (equalizer, compressor, reverb)
- Video filters (blur, sharpen, color correction)
- Video speed adjustment or reversal
- Thumbnail generation

**DO NOT use FFmpeg tools for:**
- Adding elements to the timeline → use \`add_element_to_timeline\`
- Updating element properties → use \`update_element_properties\`
- Generating images/videos with AI → use \`generate_image\` / \`generate_video\`

### Core Concepts
1. **Absolute Paths Required**: All file paths MUST start with \`/\` (e.g., \`/video.mp4\`)
2. **Service Availability**: Check if EditorCore and FFmpegService are available
3. **Unified Response Format**: All tools return \`{ success: boolean, message: string, data?: any }\`
4. **Error Handling**: Always validate parameters and handle errors gracefully

### Quick Reference

| Category | Tools | Use Cases |
|----------|-------|-----------|
| **Basic** | \`execute_ffmpeg_command\`, \`get_ffmpeg_status\`, \`check_file_exists\` | Execute commands, check status, verify files |
| **Export** | \`export_video\`, \`get_video_info\`, \`get_video_duration\`, \`generate_thumbnail\` | Export timeline, get info, generate thumbnails |
| **Format** | \`convert_video_format\`, \`batch_convert_format\` | Convert between formats (MP4/WebM/AVI) |
| **Filters** | \`apply_color_correction\`, \`apply_blur\`, \`apply_sharpen\`, \`apply_lut\`, \`apply_filter_chain\`, \`adjust_video_speed\`, \`reverse_video\` | Visual effects and adjustments |
| **Subtitles** | \`parse_subtitles\`, \`burn_subtitles\`, \`add_subtitle_track\`, \`translate_subtitles\` | Parse, burn, add, translate subtitles |
| **Audio** | \`apply_equalizer\`, \`apply_compressor\`, \`apply_reverb\`, \`apply_audio_effects_chain\`, \`normalize_audio\` | Audio processing and enhancement |
| **Merge/Split** | \`merge_videos\`, \`concat_with_transitions\`, \`split_video\`, \`trim_video\` | Combine or split videos |

### Standard Workflow
\`\`\`typescript
// 1. Check FFmpeg status
const { success, data } = await get_ffmpeg_status({});

// 2. Validate input file exists
await check_file_exists({ filePath: "/input.mp4" });

// 3. Perform operation
const result = await convert_video_format({
    inputFile: "/input.mp4",
    outputFile: "/output.mp4",
    targetFormat: "mp4",
    quality: "high"
});

// 4. Report to user
if (result.success) {
    console.log(\`✅ \${result.message}\`);
} else {
    console.log(\`❌ \${result.message}\`);
}
\`\`\`

### Important Notes
- **Long-running operations**: Video processing can take seconds to minutes. Inform the user about progress.
- **Quality presets**: Use \`quality: "high"\` for final exports, \`"low"\` for previews
- **Batch operations**: Use \`batch_convert_format\` for multiple files
- **Advanced users**: \`execute_ffmpeg_command\` provides full FFmpeg control but requires knowledge of FFmpeg CLI

### Detailed Documentation
For comprehensive tool documentation with examples, parameters, and best practices, see \`docs/ai/ffmpeg-tools-guide.md\`

Key sections:
- [Quick Start](#quick-start) - When to use FFmpeg tools
- [Core Concepts](#core-concepts) - File paths, service checks, response format
- [Tool Reference](#tool-reference) - All 29 tools with parameters and examples
- [Common Scenarios](#使用场景与最佳实践) - Workflows for common tasks
- [Error Handling](#常见错误处理) - Troubleshooting guide
- [Performance Tips](#性能优化建议) - Optimization strategies
`;

// 辅助函数：返回 FFmpeg 提示词部分
// 注意：不要通过 i18next.t() 动态拼接。项目的 i18n 使用 CRC32 哈希键查找，
// 而 `ai.ffmpeg.*` 的明文翻译在 ffmpeg-tools.json（未加载进 namespace），
// 哈希查找会 miss 并回退返回 key 字符串，对字符串调 .map/.join 会抛
// "t(...).map is not a function"。这里直接使用完整的英文提示词常量。
export function buildFFmpegPromptSection(_i18next: any): string {
    return ffmpegPromptEn;
}
