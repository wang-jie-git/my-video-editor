/**
 * Skill Tools - 暴露给 AI 助手的技能工具
 *
 * 提供三个技能相关工具：
 * - skill_list：列出所有可用技能
 * - skill_load：加载技能内容（将技能指令注入对话上下文）
 * - skill_create：创建/更新技能（写入 .openharness/skills/<name>.md）
 */
import { getSkillRegistry } from "./registry";
import { loadExternalSkills } from "./loader";
import type { SkillLoadResult } from "./types";
import type { AgentTool } from "../tools/types";

/** 技能工具名称 */
export const SKILL_LIST_TOOL = "skill_list";
export const SKILL_LOAD_TOOL = "skill_load";
export const SKILL_CREATE_TOOL = "skill_create";

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
 * 创建或更新技能（写入 .openharness/skills/<name>.md 并重新注册）
 * name 必须是小写 kebab-case（防路径穿越），与 server API 同规则
 */
export async function createSkill(
	name: string,
	content: string,
): Promise<SkillLoadResult> {
	const trimmed = name.trim();
	if (!trimmed) {
		return { success: false, message: "缺少技能名称 name" };
	}
	if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(trimmed)) {
		return {
			success: false,
			message: "技能名称只能包含小写字母、数字、连字符（kebab-case）",
		};
	}
	if (!content || content.trim().length < 20) {
		return { success: false, message: "技能内容过短（至少 20 字符）" };
	}

	try {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");
		const dir = path.join(process.cwd(), ".openharness", "skills");
		await fs.mkdir(dir, { recursive: true });
		const filePath = path.join(dir, `${trimmed}.md`);
		await fs.writeFile(filePath, content, "utf-8");

		// 重新加载外部技能，验证新技能可识别
		const registry = getSkillRegistry();
		const external = await loadExternalSkills();
		for (const skill of external) {
			registry.register(skill);
		}
		const loaded = registry.get(trimmed);

		return {
			success: true,
			message: loaded
				? `技能 "${trimmed}" 已保存并成功加载（${filePath}）`
				: `技能 "${trimmed}" 已写入（${filePath}），但未被 loader 识别，请检查 frontmatter 格式`,
			data: { path: filePath, loaded: Boolean(loaded) },
		};
	} catch (error) {
		console.warn("[Skills] Failed to create skill:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "创建技能失败",
		};
	}
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
		{
			name: SKILL_CREATE_TOOL,
			description:
				"创建或更新可复用技能（SKILL.md）。当用户要求把某个工作流/常用操作固化为技能、或更新已有技能时使用。技能内容须含 frontmatter（---\\nname: 技能名\\ndescription: 技能描述（含触发场景）\\n---）和正文（# 标题 + ## When to use 触发场景 + ## Workflow 步骤 + ## Rules 规则）。描述要写清楚何时触发。",
			parameters: {
				type: "object",
				properties: {
					name: {
						type: "string",
						description:
							"技能名称（小写 kebab-case，如 video-mix-workflow）",
					},
					content: {
						type: "string",
						description: "SKILL.md 完整内容（含 frontmatter 和正文）",
					},
				},
				required: ["name", "content"],
			},
			execute: async (args: Record<string, unknown>) => {
				const name = String(args.name ?? "");
				const content = String(args.content ?? "");
				const result = await createSkill(name, content);
				return {
					success: result.success,
					message: result.message,
					data: result.data as Record<string, unknown> | undefined,
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