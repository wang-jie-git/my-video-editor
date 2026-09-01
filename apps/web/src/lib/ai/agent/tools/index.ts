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

// 本地工具（静态）
const LOCAL_TOOLS: AgentTool[] = [
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

// MCP 工具（动态加载，仅在 Node.js 环境）
let mcpTools: AgentTool[] = [];

/**
 * 设置 MCP 工具列表（由 mcp-tools.ts 调用）
 */
export function setMcpTools(tools: AgentTool[]): void {
	mcpTools = tools;
}

/**
 * 获取所有工具（本地 + MCP）
 */
export function getAllTools(): AgentTool[] {
	return [...LOCAL_TOOLS, ...mcpTools];
}

/**
 * 获取所有工具 Schema（本地 + MCP）
 */
export function getAllToolSchemas(): OpenAIToolSchema[] {
	return getAllTools().map((tool) => buildToolSchema({ tool }));
}

const toolMap = new Map<string, AgentTool>(
	getAllTools().map((tool) => [tool.name, tool]),
);

/**
 * 根据名称获取工具
 */
export function getToolByName({
	name,
}: {
	name: string;
}): AgentTool | undefined {
	return toolMap.get(name);
}

/**
 * 初始化 MCP（动态导入，避免浏览器环境加载）
 */
export async function initMcpTools(): Promise<void> {
	try {
		const { initMcpTools: init } = await import("../mcp/mcp-tools");
		await init();
	} catch (error) {
		console.error("[Tools] Failed to initialize MCP:", error);
	}
}

/**
 * 检查 MCP 是否就绪
 */
export function isMcpReady(): boolean {
	try {
		const { isMcpReady: check } = require("../mcp/mcp-tools");
		return check();
	} catch {
		return false;
	}
}

/**
 * 刷新工具映射
 */
export function refreshToolMap(): void {
	toolMap.clear();
	getAllTools().forEach((tool) => {
		toolMap.set(tool.name, tool);
	});
}
