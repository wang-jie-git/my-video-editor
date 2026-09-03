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
	contentLength?: number;
	path?: string;
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
 * 创建/更新技能（通过 POST 写入 server 端文件系统）
 */
export async function bridgeCreateSkill(
	name: string,
	content: string,
): Promise<{ success: boolean; message: string; path?: string }> {
	try {
		const res = await fetch(BASE, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, content }),
			cache: "no-store",
		});
		const data = (await res.json()) as {
			success: boolean;
			message: string;
			path?: string;
			loaded?: boolean;
		};
		if (!res.ok || !data.success) {
			return {
				success: false,
				message: data.message || `创建失败（HTTP ${res.status}）`,
			};
		}
		return {
			success: true,
			message: data.message,
			path: data.path,
		};
	} catch (error) {
		console.warn("[Skill Bridge] create skill failed:", error);
		return {
			success: false,
			message: "创建技能失败：无法连接到技能服务",
		};
	}
}

/**
 * 淘汰（删除）项目级技能
 */
export async function bridgeDeleteSkill(
	name: string,
): Promise<{ success: boolean; message: string }> {
	try {
		const res = await fetch(`${BASE}?name=${encodeURIComponent(name)}`, {
			method: "DELETE",
			cache: "no-store",
		});
		const data = (await res.json()) as {
			success: boolean;
			message: string;
		};
		if (!res.ok || !data.success) {
			return {
				success: false,
				message: data.message || `删除失败（HTTP ${res.status}）`,
			};
		}
		return { success: true, message: data.message };
	} catch (error) {
		console.warn("[Skill Bridge] delete skill failed:", error);
		return {
			success: false,
			message: "删除技能失败：无法连接到技能服务",
		};
	}
}

/**
 * 构建 Skill AgentTool 列表（列表/内容/创建/删除均通过 HTTP 从 server 拉取）
 */
export function buildBridgeSkillTools(): AgentTool[] {
	return [
		{
			name: "skill_list",
			description:
				"列出可复用的工作流技能（如 ffmpeg-migration、video-export-troubleshoot）。注意：这只是辅助工作流指令，不是你的全部能力；你的完整视频编辑工具集（时间线、AI 生成、FFmpeg 处理等）在系统提示词的 Your Capabilities 中列出。",
			parameters: {
				type: "object",
				properties: {},
			},
			execute: async () => {
				const skills = await bridgeFetchSkills();
				return {
					success: true,
					message: `共 ${skills.length} 个技能（可通过 skill_load 查看内容后判断是否重复/需要整合）`,
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
		{
			name: "skill_create",
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
						description:
							"SKILL.md 完整内容（含 frontmatter 和正文）",
					},
				},
				required: ["name", "content"],
			},
			execute: async (args: Record<string, unknown>) => {
				const name = String(args.name ?? "").trim();
				const content = String(args.content ?? "");
				if (!name) {
					return { success: false, message: "缺少技能名称 name" };
				}
				if (!content) {
					return { success: false, message: "缺少技能内容 content" };
				}
				const result = await bridgeCreateSkill(name, content);
				return {
					success: result.success,
					message: result.message,
					data: result.path ? { path: result.path } : undefined,
				};
			},
		},
		{
			name: "skill_delete",
			description:
				"淘汰（删除）一个不再需要或已被整合的技能。删除前先 skill_load 确认该技能内容已被其他技能覆盖，避免误删。仅 project 技能可删（内置技能不可删）。",
			parameters: {
				type: "object",
				properties: {
					name: {
						type: "string",
						description: "要删除的技能名称（来自 skill_list）",
					},
				},
				required: ["name"],
			},
			execute: async (args: Record<string, unknown>) => {
				const name = String(args.name ?? "").trim();
				if (!name) {
					return { success: false, message: "缺少技能名称 name" };
				}
				const result = await bridgeDeleteSkill(name);
				return {
					success: result.success,
					message: result.message,
				};
			},
		},
	];
}
