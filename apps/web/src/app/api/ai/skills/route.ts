import { NextResponse } from "next/server";
import { loadSkillRegistry } from "@/lib/ai/agent/skills/loader";
import { getSkillRegistry } from "@/lib/ai/agent/skills/registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/skills
 *
 * 返回已注册的技能列表（名称/描述/来源/标签）。
 * server 侧先加载 bundled + external 技能到注册表，再返回。
 *
 * 支持 ?name=<技能名> 返回单个技能的完整内容（供 skill_load 桥接）。
 */
export async function GET(request: Request) {
	try {
		await loadSkillRegistry();
		const registry = getSkillRegistry();
		const url = new URL(request.url);
		const name = url.searchParams.get("name");

		// 单个技能完整内容（skill_load）
		if (name) {
			const skill = registry.get(name);
			if (!skill) {
				return NextResponse.json(
					{
						success: false,
						message: `技能 "${name}" 未找到`,
					},
					{ status: 404 },
				);
			}
			return NextResponse.json({
				success: true,
				skill: {
					name: skill.name,
					description: skill.description,
					source: skill.source,
					tags: skill.tags ?? [],
					content: skill.content,
				},
			});
		}

		const skills = registry.listSkills();
		const state = registry.getState();

		return NextResponse.json({
			success: true,
			message: `共 ${skills.length} 个技能`,
			skills: skills.map((s) => ({
				name: s.name,
				description: s.description,
				source: s.source,
				tags: s.tags ?? [],
			})),
			state,
		});
	} catch (error) {
		console.error("Failed to load skills:", error);
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to load skills",
				skills: [],
			},
			{ status: 500 },
		);
	}
}
