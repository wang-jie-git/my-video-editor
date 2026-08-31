import { EditorCore } from "@/core";
import { useCharacterStore } from "@/stores/character-store";
import {
	type ExpertRoleId,
	DEFAULT_EXPERT_ROLE,
	DIRECTOR_SYSTEM_PROMPT_ADDITION,
	getExpertRole,
} from "./expert-roles";

export function buildSystemPrompt({
	roleId = DEFAULT_EXPERT_ROLE,
}: {
	roleId?: ExpertRoleId;
} = {}): string {
	const editor = EditorCore.getInstance();
	const project = editor.project.getActiveOrNull();
	const tracks = editor.timeline.getTracks();
	const assets = editor.media.getAssets();
	const duration = editor.timeline.getTotalDuration();
	const characters = useCharacterStore.getState().characters;

	const projectContext = project
		? `
## Current Project
- Name: ${project.metadata.name}
- Canvas: ${project.settings.canvasSize.width}x${project.settings.canvasSize.height}
- FPS: ${project.settings.fps}
- Background: ${JSON.stringify(project.settings.background)}
- Total Duration: ${duration.toFixed(2)}s
- Tracks: ${tracks.length}
`
		: "\n## No project is currently open.\n";

	const assetsContext =
		assets.length > 0
			? `
## Available Media Assets
${assets
	.map(
		(a) =>
			`- [${a.id}] "${a.name}" (${a.type}${a.duration ? `, ${a.duration.toFixed(1)}s` : ""}${a.width ? `, ${a.width}x${a.height}` : ""})`,
	)
	.join("\n")}
`
			: "\n## No media assets in the project yet.\n";

	const characterContext =
		characters.length > 0
			? `
## Available Characters
${characters
	.map((c) => {
		const parts = [
			`- [${c.id}] "${c.name}" (${c.images.length} ref images, ${c.generations.length} generations)`,
		];
		if (c.description) parts.push(`  Description: ${c.description}`);
		if (c.styleDescription)
			parts.push(`  Style Lock: ${c.styleDescription}`);
		return parts.join("\n");
	})
	.join("\n")}
`
			: "\n## No characters in the library.\n";

	const timelineContext =
		tracks.length > 0
			? `
## Current Timeline
${tracks
	.map(
		(track) =>
			`- Track "${track.name}" (${track.type}, ${track.elements.length} elements)${
				track.elements.length > 0
					? `\n${track.elements
							.map(
								(el) =>
									`  - [${el.id}] "${el.name}" ${el.startTime.toFixed(1)}s-${(el.startTime + el.duration).toFixed(1)}s`,
							)
							.join("\n")}`
					: ""
			}`,
	)
	.join("\n")}
`
			: "";

	const rolePromptAddition =
		roleId === "auto"
			? DIRECTOR_SYSTEM_PROMPT_ADDITION
			: getExpertRole({ roleId }).systemPromptAddition;

	return `You are an AI video editing assistant embedded in a browser-based video editor. You help users create and edit videos by using the available tools.

## FFmpeg Video Processing Tools

You have access to **29 FFmpeg video processing tools** organized in 7 phases. These tools enable you to perform professional video editing operations directly in the browser.

### When to Use FFmpeg Tools

Use FFmpeg tools when the user requests:
- Video format conversion (MP4, WebM, AVI, etc.)
- Video merging or splitting
- Subtitle burning or parsing
- Audio processing (equalizer, compressor, reverb)
- Video filters (blur, sharpen, color correction)
- Video speed adjustment or reversal
- Thumbnail generation

**DO NOT use FFmpeg tools for**:
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

For comprehensive tool documentation with examples, parameters, and best practices, see:
\`docs/ai/ffmpeg-tools-guide.md\`

Key sections:
- [Quick Start](#quick-start) - When to use FFmpeg tools
- [Core Concepts](#core-concepts) - File paths, service checks, response format
- [Tool Reference](#tool-reference) - All 29 tools with parameters and examples
- [Common Scenarios](#使用场景与最佳实践) - Workflows for common tasks
- [Error Handling](#常见错误处理) - Troubleshooting guide
- [Performance Tips](#性能优化建议) - Optimization strategies

${rolePromptAddition}
${characterContext}${projectContext}${assetsContext}${timelineContext}`;
}
