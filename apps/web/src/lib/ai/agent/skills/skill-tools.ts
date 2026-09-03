/**
 * Skill Tools - 暴露给 AI 助手的技能工具
 *
 * 提供两个技能相关工具：
 * - skill_list：列出所有可用技能
 * - skill_load：加载技能内容（将技能指令注入对话上下文）
 */
import { getSkillRegistry } from "./registry";
import type { SkillLoadResult } from "./types";
import type { AgentTool } from "../tools/types";

/** 技能工具名称 */
export const SKILL_LIST_TOOL = "skill_list";
export const SKILL_LOAD_TOOL = "skill_load";

/**
 * 列出所有可用技能
 */
export async function listSkills(): Promise<SkillLoadResult> {
	const registry = getSkillRegistry();
	const skills = registry.listSkills();
	const state = registry.getState();

	return {
		success: true,
		message: `共 ${skills.length} 个技能`,
		data: skills.map((s) => ({
			name: s.name,
			description: s.description,
			source: s.source,
			tags: s.tags ?? [],
		})),
	};
}

/**
 * 加载技能内容
 */
export async function loadSkill(
	name: string,
): Promise<SkillLoadResult> {
	const registry = getSkillRegistry();
	const skill = registry.get(name);

	if (!skill) {
		return {
			success: false,
			message: `技能 "${name}" 未找到。可用技能：${registry
				.listNames()
				.join(", ") || "无"}`,
		};
	}

	return {
		success: true,
		message: `已加载技能 "${skill.name}"`,
		data: skill,
	};
}

/**
 * 构建技能相关工具
 */
export function buildSkillTools(): AgentTool[] {
	return [
		{
			name: SKILL_LIST_TOOL,
			description:
				"列出可复用的工作流技能（如 ffmpeg-migration、video-export-troubleshoot）。注意：这只是辅助工作流指令，不是你的全部能力；你的完整视频编辑工具集（时间线、AI 生成、FFmpeg 处理等）在系统提示词的 Your Capabilities 中列出。",
			parameters: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				const result = await listSkills();
				return {
					success: result.success,
					message: result.message,
					data: result.data as Record<string, unknown>,
				};
			},
		},
		{
			name: SKILL_LOAD_TOOL,
			description:
				"加载技能内容。技能是可复用的工作流指令，加载后按其指令执行任务。先调用 skill_list 查看可用技能。",
			parameters: {
				type: "object",
				properties: {
					name: {
						type: "string",
						description: "技能名称，来自 skill_list",
					},
				},
				required: ["name"],
			},
			execute: async (args: Record<string, unknown>) => {
				const name = String(args.name ?? "");
				if (!name) {
					return {
						success: false,
						message: "缺少技能名称 name",
					};
				}
				const result = await loadSkill(name);
				const skillData =
					typeof result.data === "object" &&
					result.data !== null &&
					"content" in result.data
						? (result.data as unknown as {
								name: string;
								description: string;
								content: string;
								tags?: string[];
							})
						: null;
				return {
					success: result.success,
					message: result.message,
					data: skillData
						? {
								name: skillData.name,
								description: skillData.description,
								content: skillData.content,
								tags: skillData.tags ?? [],
							}
						: undefined,
				};
			},
		},
	];
}

/**
 * 检查技能是否就绪
 */
export function isSkillsReady(): boolean {
	return getSkillRegistry().getState().total > 0;
}