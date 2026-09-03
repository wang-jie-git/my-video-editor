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
import { videoAnalysisTools } from "./video-analysis-tools";
import { type AgentTool, buildToolSchema } from "./types";

/**
 * 列出当前注册的全部工具（运行时动态读取，始终准确）
 *
 * 当用户问"你有哪些工具/列出工具列表/你能做什么"时，AI 应调用本工具
 * 获取完整的工具清单，而不是依赖 system prompt 里的静态描述。
 */
const listToolsTool: AgentTool = {
	name: "list_tools",
	description:
		"列出当前可用的全部工具及其用途（动态读取工具注册表，包含本地工具、Skills 技能、MCP 工具）。当用户询问你有哪些工具、列出工具列表、或想了解你能做什么时，调用本工具获取完整清单。",
	parameters: {
		type: "object",
		properties: {},
	},
	execute: async () => {
		const tools = getAllTools();
		const grouped = tools.reduce<Record<string, AgentTool[]>>((acc, tool) => {
			// 按前缀分组的辅助函数
			const group =
				tool.name.startsWith("ffmpeg") || tool.name.startsWith("apply_") ||
				tool.name.startsWith("convert_") || tool.name.startsWith("merge_") ||
				tool.name.startsWith("split_") || tool.name.startsWith("trim_") ||
				tool.name.startsWith("parse_") || tool.name.startsWith("burn_") ||
				tool.name.startsWith("add_subtitle") || tool.name.startsWith("translate_sub") ||
				tool.name.startsWith("execute_ffmpeg") || tool.name.startsWith("get_ffmpeg") ||
				tool.name.startsWith("check_file") || tool.name.startsWith("export_") ||
				tool.name.startsWith("get_video") || tool.name.startsWith("generate_thumb") ||
				tool.name.startsWith("normalize") || tool.name.startsWith("batch_convert") ||
				tool.name.startsWith("adjust_video") || tool.name.startsWith("reverse_") ||
				tool.name.startsWith("concat_")
					? "FFmpeg Video Processing"
					: tool.name.startsWith("generate_") || tool.name.startsWith("list_char") ||
						  tool.name.startsWith("get_character") ||
						  tool.name.startsWith("update_character") ||
						  tool.name.startsWith("analyze_character")
						? "AI Generation & Characters"
						: tool.name.startsWith("list_media") || tool.name.startsWith("add_") ||
							  tool.name.startsWith("update_element") ||
							  tool.name.startsWith("delete_element") ||
							  tool.name.startsWith("move_element") ||
							  tool.name.startsWith("get_timeline") ||
							  tool.name.startsWith("get_project") ||
							  tool.name.startsWith("update_project") ||
							  tool.name.startsWith("generate_captions") ||
							  tool.name.startsWith("inspect_frame") ||
							  tool.name.startsWith("generate_speech") ||
							  tool.name.startsWith("list_tools")
							? "Editing & Media"
							: tool.name.startsWith("skill")
								? "Workflow Skills"
								: tool.name.startsWith("switch_expert")
									? "Expert Roles"
									: "MCP Tools";
			(acc[group] ??= []).push(tool);
			return acc;
		}, {});

		const data: Record<string, unknown> = {
			total: tools.length,
			tools: tools.map((t) => ({
				name: t.name,
				description: t.description,
			})),
			groups: Object.entries(grouped).map(([group, list]) => ({
				group,
				tools: list.map((t) => t.name),
			})),
		};
		return {
			success: true,
			message: `共 ${tools.length} 个工具`,
			data,
		};
	},
};

// 本地工具（静态）
const LOCAL_TOOLS: AgentTool[] = [
	listToolsTool,
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
	// Phase 8: 视频理解工具（video_probe / video_analyze / video_ask + set_asr_config）
	...videoAnalysisTools,
];


// MCP 工具（动态加载，仅在 Node.js 环境）
let mcpTools: AgentTool[] = [];
let mcpInitialized = false;

// 动态工具（运行时按会话状态注册，如 Director 模式的 switch_expert_role）
let dynamicTools: AgentTool[] = [];

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
 * 设置动态工具列表（由 service.ts 在每次会话运行时注册，如 Director 模式的 switch_expert_role）
 */
export function setDynamicTools(tools: AgentTool[]): void {
	dynamicTools = tools;
}

/**
 * 获取所有工具（本地 + 动态 + MCP + Skills）
 */
export function getAllTools(): AgentTool[] {
	return [...LOCAL_TOOLS, ...dynamicTools, ...skillTools, ...mcpTools];
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
 *
 * - Node 环境：真实 spawn MCP Server 子进程
 * - 浏览器环境：通过 HTTP 桥接到 server 端 API（Phase 2）
 *   纯浏览器部署（无 server）时 fetch 失败 → 优雅降级为空工具
 */
export async function initMcpTools(): Promise<void> {
	if (mcpSkippedInBrowser) return;
	try {
		// 浏览器环境：HTTP 桥接
		if (typeof window !== "undefined") {
			const {
				bridgeIsAvailable,
				bridgeConnectServers,
				bridgeFetchMcpTools,
				buildBridgeMcpTools,
			} = await import("../bridge/mcp-bridge");
			// 桥接不可达（纯浏览器部署无 server）→ 跳过本次，不反复尝试
			const available = await bridgeIsAvailable();
			if (!available) {
				mcpSkippedInBrowser = true;
				console.log("[Tools] MCP bridge unavailable, skipped");
				return;
			}
			// 从 localStorage 持久化的 MCP 配置中读取启用的 Server 并连接
			let servers: Parameters<typeof bridgeConnectServers>[0] = [];
			try {
				const { useMcpStore } = await import("../mcp/mcp-store");
				servers = useMcpStore.getState().config.servers;
			} catch {
				servers = [];
			}
			const connected = await bridgeConnectServers(servers);
			const tools = await bridgeFetchMcpTools();
			if (tools.length > 0) {
				setMcpTools(buildBridgeMcpTools(tools));
				refreshToolMap();
			}
			console.log(
				`[Tools] MCP via HTTP bridge: connected=${connected} tools=${tools.length}`,
			);
			return;
		}
		const { initMcpTools: init } = await import("../mcp/mcp-tools");
		await init();
		mcpInitialized = true;
	} catch (error) {
		console.error("[Tools] Failed to initialize MCP:", error);
	}
}

/**
 * 初始化 Skills（动态导入，避免浏览器环境加载）
 *
 * - Node 环境：真实读取文件系统（node:fs）加载技能
 * - 浏览器环境：通过 HTTP 桥接到 server 端 API（Phase 2）
 *   纯浏览器部署（无 server）时 fetch 失败 → 优雅降级为空工具
 */
export async function initSkillTools(): Promise<void> {
	if (skillsSkippedInBrowser) return;
	try {
		// 浏览器环境：HTTP 桥接
		if (typeof window !== "undefined") {
			const { buildBridgeSkillTools } = await import("../bridge/skill-bridge");
			const tools = buildBridgeSkillTools();
			setSkillTools(tools);
			refreshToolMap();
			skillsInitialized = true;
			skillsSkippedInBrowser = true;
			console.log(`[Tools] Skills via HTTP bridge: ${tools.length} tools`);
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
	return mcpInitialized;
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
