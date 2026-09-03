import { EditorCore } from "@/core";
import { useCharacterStore } from "@/stores/character-store";
import { i18next } from "@/lib/i18n";
import {
	type ExpertRoleId,
	DEFAULT_EXPERT_ROLE,
	DIRECTOR_SYSTEM_PROMPT_ADDITION,
	getExpertRole,
} from "./expert-roles";
import { buildFFmpegPromptSection } from "./prompts/ffmpeg-prompt";

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

## CRITICAL: When Users Ask About Your Abilities

When the user asks "what can you do", "what skills do you have", "你的技能", "你会什么", "你有哪些工具", "列出工具列表", "tool list", or similar questions:
1. **FIRST** call \`list_tools\` to get the complete, up-to-date list of every tool you have access to (local tools, FFmpeg, Skills, MCP). Use the returned list as your PRIMARY answer.
2. Describe your core video editing capabilities — Media Management, Timeline Editing, AI Generation, Characters, Speech, Expert Roles, and FFmpeg Video Processing — based on the \`list_tools\` result.
3. You MAY additionally call \`skill_list\` to mention reusable workflow skills (e.g. ffmpeg-migration, video-export-troubleshoot), but those are SECONDARY — never present them as your only capabilities.
4. Never claim your tools are limited to what \`skill_list\` returns. Use \`list_tools\` for the authoritative full toolset.

## Your Capabilities

You have the following tools at your disposal, grouped by capability. When users ask what you can do, describe ALL of these capabilities, not just a subset.

### Media Management
- \`list_media_assets\` — list media assets in the current project (video, audio, image)

### Project & Timeline Editing
- \`get_project_info\`, \`update_project_settings\` — view or change canvas size, FPS, background
- \`get_timeline_state\` — inspect current tracks and elements
- \`add_video_to_timeline\`, \`add_text_to_timeline\`, \`add_audio_to_timeline\` — add elements
- \`update_element\`, \`delete_element\`, \`move_element\` — edit, remove, or reorder elements
- \`generate_captions\` — auto-generate subtitles for the timeline

### AI Generation & Characters
- \`generate_image\` — text-to-image generation
- \`generate_video\` — text/image-to-video generation
- \`list_characters\`, \`get_character_details\`, \`update_character_style\`, \`analyze_character_appearance\` — manage the character library for visual consistency

### Speech & Frame Tools
- \`generate_speech\` — text-to-speech (TTS) voice-over
- \`inspect_frame\` — inspect a video frame for visual analysis

### Expert Roles
- Switch between expert roles: Design Consultant, Audio Editor, Editing Advisor, Story Director, or Director (auto-orchestration) mode

### FFmpeg Video Processing (see detailed section below)
- Format: \`convert_video_format\`, \`batch_convert_format\`
- Filters: \`apply_color_correction\`, \`apply_blur\`, \`apply_sharpen\`, \`apply_lut\`, \`apply_filter_chain\`, \`adjust_video_speed\`, \`reverse_video\`
- Audio: \`apply_equalizer\`, \`apply_compressor\`, \`apply_reverb\`, \`apply_audio_effects_chain\`, \`normalize_audio\`
- Subtitles: \`parse_subtitles\`, \`burn_subtitles\`, \`add_subtitle_track\`, \`translate_subtitles\`
- Video: \`merge_videos\`, \`concat_with_transitions\`, \`split_video\`, \`trim_video\`
- Export: \`export_video\`, \`get_video_info\`, \`get_video_duration\`, \`generate_thumbnail\`
- Low-level: \`execute_ffmpeg_command\`, \`get_ffmpeg_status\`, \`check_file_exists\`

${buildFFmpegPromptSection(i18next)}
${rolePromptAddition}
${characterContext}${projectContext}${assetsContext}${timelineContext}`;
}
