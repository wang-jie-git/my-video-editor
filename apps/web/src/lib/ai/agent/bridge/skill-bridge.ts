/**
 * Skill 浏览器桥接（Phase 2）
 *
 * skill_list / skill_load 工具需要读取文件系统（node:fs），浏览器端无法直接执行。
 * 本模块通过 HTTP 从 server 端拉取技能列表与内容：
 * - 列表: GET  /api/ai/skills
 * - 内容: GET  /api/ai/skills?name=<技能名>
 *
 * 纯浏览器部署（无 server）时 fetch 失败 → 优雅降级（返回空，不抛错）。
 */
import type { AgentTool } from "../tools/types";

const BASE = "/api/ai/skills";

interface BridgeSkillMeta {
	name: string;
	description: string;
	source: string;
	tags: string[];
}

interface BridgeSkillFull extends BridgeSkillMeta {
	content: string;
}

/**
 * 拉取技能列表（从 server 端加载的文件系统技能）
 */
export async function bridgeFetchSkills(): Promise<BridgeSkillMeta[]> {
	try {
		const res = await fetch(BASE, { cache: "no-store" });
		if (!res.ok) return [];
		const data = (await res.json()) as {
			success: boolean;
			skills?: BridgeSkillMeta[];
		};
		if (!data.success) return [];
		return data.skills ?? [];
	} catch (error) {
		console.warn("[Skill Bridge] fetch list failed (graceful):", error);
		return [];
	}
}

/**
 * 拉取单个技能完整内容
 */
export async function bridgeFetchSkill(
	name: string,
): Promise<BridgeSkillFull | null> {
	try {
		const res = await fetch(`${BASE}?name=${encodeURIComponent(name)}`, {
			cache: "no-store",
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			success: boolean;
			skill?: BridgeSkillFull;
		};
		if (!data.success || !data.skill) return null;
		return data.skill;
	} catch (error) {
		console.warn("[Skill Bridge] fetch skill failed (graceful):", error);
		return null;
	}
}

/**
 * 构建 Skill AgentTool 列表（列表/内容均通过 HTTP 从 server 拉取）
 */
export function buildBridgeSkillTools(): AgentTool[] {
	return [
		{
			name: "skill_list",
			description:
				"列出所有可用技能。技能是可复用的工作流指令，适合视频编辑、FFmpeg 处理、格式转换等场景优化。",
			parameters: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				const skills = await bridgeFetchSkills();
				return {
					success: true,
					message: `共 ${skills.length} 个技能`,
					data: { skills },
				};
			},
		},
		{
			name: "skill_load",
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
					return { success: false, message: "缺少技能名称 name" };
				}
				const skill = await bridgeFetchSkill(name);
				if (!skill) {
					return {
						success: false,
						message: `技能 "${name}" 未找到`,
					};
				}
				return {
					success: true,
					message: `已加载技能 "${skill.name}"`,
					data: {
						name: skill.name,
						description: skill.description,
						content: skill.content,
						tags: skill.tags ?? [],
					},
				};
			},
		},
	];
}
