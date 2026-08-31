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

// 辅助函数：从翻译键构建 FFmpeg 提示词部分
export function buildFFmpegPromptSection(i18next: any): string {
    const t = (key: string, options?: any) => i18next.t(`ai.ffmpeg.${key}`, options);

    return `
## ${t('title')}

### ${t('whenToUse.title')}
${t('whenToUse.useFFmpeg')}
${t('whenToUse.useCases')
    .map((uc: string) => `- ${uc}`)
    .join('\n')}

**${t('whenToUse.doNotUse')}**
${t('whenToUse.doNotUseCases')
    .map((uc: string) => `- ${uc}`)
    .join('\n')}

### ${t('concepts.title')}
1. **${t('concepts.paths.title')}**: ${t('concepts.paths.description')}
2. **${t('concepts.services.title')}**: ${t('concepts.services.description')}
3. **${t('concepts.response.title')}**: ${t('concepts.response.description')}
4. **${t('concepts.errorHandling.title')}**: ${t('concepts.errorHandling.description')}

### ${t('quickReference.title')}
| ${t('quickReference.categories.basic.name')} | ${t('quickReference.categories.basic.tools').join(', ')} | ${t('quickReference.categories.basic.useCases')} |
| ${t('quickReference.categories.export.name')} | ${t('quickReference.categories.export.tools').join(', ')} | ${t('quickReference.categories.export.useCases')} |
| ${t('quickReference.categories.format.name')} | ${t('quickReference.categories.format.tools').join(', ')} | ${t('quickReference.categories.format.useCases')} |
| ${t('quickReference.categories.filters.name')} | ${t('quickReference.categories.filters.tools').join(', ')} | ${t('quickReference.categories.filters.useCases')} |
| ${t('quickReference.categories.subtitles.name')} | ${t('quickReference.categories.subtitles.tools').join(', ')} | ${t('quickReference.categories.subtitles.useCases')} |
| ${t('quickReference.categories.audio.name')} | ${t('quickReference.categories.audio.tools').join(', ')} | ${t('quickReference.categories.audio.useCases')} |
| ${t('quickReference.categories.mergeSplit.name')} | ${t('quickReference.categories.mergeSplit.tools').join(', ')} | ${t('quickReference.categories.mergeSplit.useCases')} |

### ${t('workflow.title')}
${t('workflow.steps')
    .map((step: string, i: number) => `${i + 1}. ${step}`)
    .join('\n')}

### ${t('notes.title')}
- **${t('notes.longRunning').split(':')[0]}**: ${t('notes.longRunning').split(':').slice(1).join(':').trim()}
- **${t('notes.qualityPresets').split(':')[0]}**: ${t('notes.qualityPresets').split(':').slice(1).join(':').trim()}
- **${t('notes.batchOperations').split(':')[0]}**: ${t('notes.batchOperations').split(':').slice(1).join(':').trim()}
- **${t('notes.advancedUsers').split(':')[0]}**: ${t('notes.advancedUsers').split(':').slice(1).join(':').trim()}

### ${t('documentation.title')}
${t('documentation.reference')} \`${t('documentation.path')}\`

- ${t('documentation.sections.quickStart')}
- ${t('documentation.sections.coreConcepts')}
- ${t('documentation.sections.toolReference')}
- ${t('documentation.sections.scenarios')}
- ${t('documentation.sections.errorHandling')}
- ${t('documentation.sections.performance')}
`;
}
