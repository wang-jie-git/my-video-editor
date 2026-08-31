import type { OpenAIToolSchema } from "../types";
import { aiGenerationTools } from "./ai-generation-tools";
import { captionTools } from "./caption-tools";
import { characterTools } from "./character-tools";
import { ffmpegAudioTools } from "./ffmpeg-audio-tools";
import { ffmpegBasicTools } from "./ffmpeg-basic-tools";
import { ffmpegFilterTools } from "./ffmpeg-filter-tools";
import { ffmpegFormatTools } from "./ffmpeg-format-tools";
import { ffmpegSubtitleTools } from "./ffmpeg-subtitle-tools";
import { ffmpegVideoTools } from "./ffmpeg-video-tools";
import { ffmpegVideoToolsPhase2 } from "./ffmpeg-video-tools-phase2";
import { frameTools } from "./frame-tools";
import { mediaTools } from "./media-tools";
import { projectTools } from "./project-tools";
import { timelineTools } from "./timeline-tools";
import { ttsTools } from "./tts-tools";
import { type AgentTool, buildToolSchema } from "./types";

const ALL_TOOLS: AgentTool[] = [
	...projectTools,
	...frameTools,
	...mediaTools,
	...timelineTools,
	...captionTools,
	...aiGenerationTools,
	...characterTools,
	...ttsTools,
	// Phase 1: FFmpeg 基础工具
	...ffmpegBasicTools,
	// Phase 2: 视频导出工具
	...ffmpegVideoToolsPhase2,
	// Phase 3: 格式转换工具
	...ffmpegFormatTools,
	// Phase 4: 滤镜工具
	...ffmpegFilterTools,
	// Phase 5: 字幕工具
	...ffmpegSubtitleTools,
	// Phase 6: 音频工具
	...ffmpegAudioTools,
	// Phase 7: 视频合并/分割工具
	...ffmpegVideoTools,
];

const toolMap = new Map<string, AgentTool>(
	ALL_TOOLS.map((tool) => [tool.name, tool]),
);

export function getToolByName({
	name,
}: {
	name: string;
}): AgentTool | undefined {
	return toolMap.get(name);
}

export function getAllTools(): AgentTool[] {
	return ALL_TOOLS;
}

export function getAllToolSchemas(): OpenAIToolSchema[] {
	return ALL_TOOLS.map((tool) => buildToolSchema({ tool }));
}
