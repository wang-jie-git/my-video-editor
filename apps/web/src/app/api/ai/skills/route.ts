import { NextResponse } from "next/server";
import { loadSkillRegistry, loadExternalSkills } from "@/lib/ai/agent/skills/loader";
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
				contentLength: s.content?.length ?? 0,
				path: s.path ?? "",
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

/**
 * POST /api/ai/skills
 *
 * 创建或更新项目级技能（.openharness/skills/<name>.md）。
 * - name 必须是小写 kebab-case（防路径穿越）
 * - content 必须包含 frontmatter（name/description）+ 正文
 * - 写入后重新加载外部技能，验证新技能可被 loader 识别
 */
export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			name?: string;
			content?: string;
		};
		const name = body.name?.trim() ?? "";
		const content = body.content ?? "";

		// 名称校验：仅允许小写字母/数字/连字符，防路径穿越
		if (!name) {
			return NextResponse.json(
				{ success: false, message: "缺少技能名称 name" },
				{ status: 400 },
			);
		}
		if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) {
			return NextResponse.json(
				{
					success: false,
					message:
						"技能名称只能包含小写字母、数字、连字符（kebab-case），如 video-mix-workflow",
				},
				{ status: 400 },
			);
		}
		if (!content || content.trim().length < 20) {
			return NextResponse.json(
				{ success: false, message: "技能内容过短（至少 20 字符）" },
				{ status: 400 },
			);
		}

		// 写入项目级技能目录（loader 的 USER_SKILL_DIRS_REL 首个路径）
		const path = await import("node:path");
		const fs = await import("node:fs/promises");
		const dir = path.join(process.cwd(), ".openharness", "skills");
		await fs.mkdir(dir, { recursive: true });
		const filePath = path.join(dir, `${name}.md`);
		await fs.writeFile(filePath, content, "utf-8");

		// 重新加载外部技能并验证新技能可识别
		const registry = getSkillRegistry();
		const external = await loadExternalSkills();
		for (const skill of external) {
			registry.register(skill);
		}
		const loaded = registry.get(name);

		return NextResponse.json({
			success: true,
			message: loaded
				? `技能 "${name}" 已保存并成功加载（${filePath}）`
				: `技能 "${name}" 已写入（${filePath}），但未被 loader 识别，请检查 frontmatter 格式`,
			path: filePath,
			loaded: Boolean(loaded),
		});
	} catch (error) {
		console.error("Failed to create skill:", error);
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to create skill",
			},
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/ai/skills?name=<技能名>
 *
 * 淘汰（删除）项目级技能。
 * - 仅允许删除 source=project 的技能（内置/用户全局技能不可删）
 * - name 走同款 kebab-case 校验，防路径穿越
 */
export async function DELETE(request: Request) {
	try {
		const url = new URL(request.url);
		const name = url.searchParams.get("name")?.trim() ?? "";

		if (!name) {
			return NextResponse.json(
				{ success: false, message: "缺少技能名称 name" },
				{ status: 400 },
			);
		}
		if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) {
			return NextResponse.json(
				{
					success: false,
					message: "技能名称只能包含小写字母、数字、连字符（kebab-case）",
				},
				{ status: 400 },
			);
		}

		// 检查技能是否存在 + 来源
		await loadSkillRegistry();
		const registry = getSkillRegistry();
		const skill = registry.get(name);
		if (!skill) {
			return NextResponse.json(
				{ success: false, message: `技能 "${name}" 未找到` },
				{ status: 404 },
			);
		}
		if (skill.source !== "project") {
			return NextResponse.json(
				{
					success: false,
					message: `技能 "${name}" 来源为 ${skill.source}，不可删除（仅 project 技能可淘汰）`,
				},
				{ status: 403 },
			);
		}

		// 删除项目级技能文件
		const path = await import("node:path");
		const fs = await import("node:fs/promises");
		const filePath = path.join(process.cwd(), ".openharness", "skills", `${name}.md`);
		await fs.unlink(filePath);

		// 重新加载
		registry.clear();
		await loadSkillRegistry();

		return NextResponse.json({
			success: true,
			message: `技能 "${name}" 已淘汰（${filePath}）`,
		});
	} catch (error) {
		console.error("Failed to delete skill:", error);
		return NextResponse.json(
			{
				success: false,
				message: error instanceof Error ? error.message : "Failed to delete skill",
			},
			{ status: 500 },
		);
	}
}
