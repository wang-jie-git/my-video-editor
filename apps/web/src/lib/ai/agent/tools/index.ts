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

// Skill 工具（动态加载）
let skillTools: AgentTool[] = [];
let skillsInitialized = false;

// 浏览器环境跳过标志（避免每次对话重复尝试失败初始化）
let mcpSkippedInBrowser = false;
let skillsSkippedInBrowser = false;

/**
 * 设置 MCP 工具列表（由 mcp-tools.ts 调用）
 */
export function setMcpTools(tools: AgentTool[]): void {
	mcpTools = tools;
}

/**
 * 设置 Skill 工具列表（由 skill-tools.ts 调用）
 */
export function setSkillTools(tools: AgentTool[]): void {
	skillTools = tools;
}

/**
 * 获取所有工具（本地 + MCP + Skills）
 */
export function getAllTools(): AgentTool[] {
	return [...LOCAL_TOOLS, ...skillTools, ...mcpTools];
}

/**
 * 获取所有工具 Schema（本地 + MCP + Skills）
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
	if (mcpSkippedInBrowser) return;
	try {
		// 浏览器环境无法运行 McpClient（需要 node child_process），直接跳过
		if (typeof window !== "undefined") {
			mcpSkippedInBrowser = true;
			console.log("[Tools] MCP skipped: browser environment");
			return;
		}
		const { initMcpTools: init } = await import("../mcp/mcp-tools");
		await init();
	} catch (error) {
		console.error("[Tools] Failed to initialize MCP:", error);
	}
}

/**
 * 初始化 Skills（动态导入，避免浏览器环境加载）
 */
export async function initSkillTools(): Promise<void> {
	if (skillsSkippedInBrowser) return;
	try {
		// 浏览器环境无法读取文件系统（node:fs），跳过技能注册
		if (typeof window !== "undefined") {
			skillsSkippedInBrowser = true;
			console.log("[Tools] Skills skipped: browser environment");
			return;
		}
		const { loadSkillRegistry, buildSkillTools } = await import("../skills");
		await loadSkillRegistry();
		setSkillTools(buildSkillTools());
		refreshToolMap();
		skillsInitialized = true;
	} catch (error) {
		console.error("[Tools] Failed to initialize Skills:", error);
	}
}

/**
 * 检查 Skills 是否就绪
 */
export function isSkillsReady(): boolean {
	return skillsInitialized;
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
