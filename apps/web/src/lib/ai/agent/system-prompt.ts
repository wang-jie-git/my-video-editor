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

${buildFFmpegPromptSection(i18next)}
${rolePromptAddition}
${characterContext}${projectContext}${assetsContext}${timelineContext}`;
}
