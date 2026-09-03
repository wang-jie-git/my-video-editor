/**
 * skill_create / skill_delete 功能测试
 *
 * 验证：
 * 1. 浏览器桥接（skill-bridge）的 buildBridgeSkillTools 包含 skill_create/skill_delete
 * 2. Node 本地（skill-tools）的 buildSkillTools 包含 skill_create/skill_delete
 * 3. createSkill 对非法名称拦截（防路径穿越）
 * 4. createSkill 对过短内容拦截
 * 5. deleteSkill 对非法名称拦截
 */
import { describe, it, expect } from "bun:test";
import { buildBridgeSkillTools } from "../../bridge/skill-bridge";
import {
	buildSkillTools,
	createSkill,
	deleteSkill,
	SKILL_CREATE_TOOL,
	SKILL_DELETE_TOOL,
} from "../skill-tools";

describe("skill_create tool registration", () => {
	it("bridge skill tools include skill_create and skill_delete", () => {
		const tools = buildBridgeSkillTools();
		const names = tools.map((t) => t.name);
		expect(names).toContain(SKILL_CREATE_TOOL);
		expect(names).toContain(SKILL_DELETE_TOOL);
		expect(names).toContain("skill_list");
		expect(names).toContain("skill_load");
	});

	it("node skill tools include skill_create and skill_delete", () => {
		const tools = buildSkillTools();
		const names = tools.map((t) => t.name);
		expect(names).toContain(SKILL_CREATE_TOOL);
		expect(names).toContain(SKILL_DELETE_TOOL);
	});

	it("rejects invalid skill names (path traversal protection)", async () => {
		const result = await createSkill("../evil", "---\nname: evil\ndescription: x\n---\n# evil\n");
		expect(result.success).toBe(false);
		expect(result.message).toContain("kebab-case");
	});

	it("rejects names with uppercase or spaces", async () => {
		const result = await createSkill("Bad Name", "---\nname: bad\ndescription: x\n---\n# bad\n");
		expect(result.success).toBe(false);
	});

	it("rejects too-short content", async () => {
		const result = await createSkill("valid-name", "short");
		expect(result.success).toBe(false);
		expect(result.message).toContain("过短");
	});

	it("deleteSkill rejects invalid names", async () => {
		const result = await deleteSkill("../evil");
		expect(result.success).toBe(false);
		expect(result.message).toContain("kebab-case");
	});

	it("deleteSkill returns not-found for missing skill", async () => {
		const result = await deleteSkill("definitely-not-exists-xyz");
		expect(result.success).toBe(false);
		expect(result.message).toContain("未找到");
	});
});
