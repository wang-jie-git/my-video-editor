/**
 * Skills 框架单元测试
 *
 * 验证：
 * 1. frontmatter 解析
 * 2. 文件加载
 * 3. SkillRegistry 注册/查找
 * 4. 工具构建（skill_list / skill_load）
 *
 * 运行：bun test src/lib/ai/agent/skills/__tests__/skills.test.ts
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { parseSkillFrontmatter } from "../loader";
import { SkillRegistry, getSkillRegistry, setSkillRegistry } from "../registry";
import { buildSkillTools, SKILL_LIST_TOOL, SKILL_LOAD_TOOL } from "../skill-tools";
import type { SkillDefinition } from "../types";

describe("parseSkillFrontmatter", () => {
	it("解析完整的 frontmatter + body", () => {
		const content = `---
name: test-skill
description: 测试技能
tags: [a, b, c]
---
# 技能正文
步骤 1；
步骤 2。`;
		const parsed = parseSkillFrontmatter(content);
		expect(parsed.name).toBe("test-skill");
		expect(parsed.description).toBe("测试技能");
		expect(parsed.tags).toEqual(["a", "b", "c"]);
		expect(parsed.body).toContain("# 技能正文");
		expect(parsed.body).toContain("步骤 2");
	});

	it("无 frontmatter 时返回整篇作为 body", () => {
		const parsed = parseSkillFrontmatter("普通内容\n没有 frontmatter");
		expect(parsed.name).toBeUndefined();
		expect(parsed.body).toBe("普通内容\n没有 frontmatter");
	});
});

describe("SkillRegistry", () => {
	let registry: SkillRegistry;

	beforeEach(() => {
		registry = new SkillRegistry();
	});

	it("注册/获取/删除/列出", () => {
		const skill: SkillDefinition = {
			name: "alpha",
			description: "Alpha 技能",
			content: "内容",
			source: "bundled",
		};
		registry.register(skill);

		expect(registry.has("alpha")).toBe(true);
		expect(registry.get("alpha")?.description).toBe("Alpha 技能");
		expect(registry.listNames()).toEqual(["alpha"]);
		expect(registry.listSkills().length).toBe(1);

		expect(registry.remove("alpha")).toBe(true);
		expect(registry.has("alpha")).toBe(false);
	});

	it("按来源过滤", () => {
		registry.registerAll([
			{
				name: "a",
				description: "d",
				content: "c",
				source: "bundled",
			},
			{
				name: "b",
				description: "d",
				content: "c",
				source: "user",
			},
		]);
		expect(registry.listSkills("bundled").length).toBe(1);
		expect(registry.listSkills("user").length).toBe(1);
	});

	it("统计状态", () => {
		registry.registerAll([
			{
				name: "a",
				description: "d",
				content: "c",
				source: "bundled",
			},
		]);
		const state = registry.getState();
		expect(state.total).toBe(1);
		expect(state.bySource.bundled).toBe(1);
	});
});

describe("buildSkillTools", () => {
	beforeEach(() => {
		const empty = new SkillRegistry();
		empty.registerAll([
			{
				name: "demo",
				description: "演示技能",
				content: "演示内容",
				source: "bundled",
			},
		]);
		setSkillRegistry(empty);
	});

	afterEach(() => {
		setSkillRegistry(null);
	});

	it("返回两个技能工具", () => {
		const tools = buildSkillTools();
		const names = tools.map((t) => t.name);
		expect(names).toContain(SKILL_LIST_TOOL);
		expect(names).toContain(SKILL_LOAD_TOOL);
	});

	it("skill_list 列出注册表技能", async () => {
		const tools = buildSkillTools();
		const listTool = tools.find((t) => t.name === SKILL_LIST_TOOL)!;
		const result = await listTool.execute({});
		expect(result.success).toBe(true);
		const data = result.data as unknown as Array<{ name: string }>;
		expect(data.some((s) => s.name === "demo")).toBe(true);
	});

	it("skill_load 加载技能内容", async () => {
		const tools = buildSkillTools();
		const loadTool = tools.find((t) => t.name === SKILL_LOAD_TOOL)!;
		const result = await loadTool.execute({ name: "demo" });
		expect(result.success).toBe(true);
		expect(result.message).toContain("demo");
		const data = result.data as { content?: string };
		expect(data?.content).toBe("演示内容");
	});

	it("skill_load 未找到技能返回失败", async () => {
		const tools = buildSkillTools();
		const loadTool = tools.find((t) => t.name === SKILL_LOAD_TOOL)!;
		const result = await loadTool.execute({ name: "not-exist" });
		expect(result.success).toBe(false);
		expect(result.message).toContain("未找到");
	});

	it("skill_load 缺少参数返回失败", async () => {
		const tools = buildSkillTools();
		const loadTool = tools.find((t) => t.name === SKILL_LOAD_TOOL)!;
		const result = await loadTool.execute({});
		expect(result.success).toBe(false);
	});
});