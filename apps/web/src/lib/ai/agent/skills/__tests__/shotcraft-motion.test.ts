/**
 * shotcraft-motion 技能测试
 *
 * 验证：
 * 1. 技能文件能被 loader 正确加载（frontmatter 解析）
 * 2. 关键知识段存在（配方卡/能量骨架/节奏方法论）
 * 3. 与现有工具链映射完整
 *
 * 运行：bun test src/lib/ai/agent/skills/__tests__/shotcraft-motion.test.ts
 */
import { describe, it, expect } from "bun:test";
import { loadSkillFromFile } from "../loader";
import { existsSync } from "node:fs";

// 兼容两种运行环境：
// - runner (scripts/run-tests.sh): cwd = apps/web → src/lib/...
// - 手动从仓库根运行: cwd = 仓库根 → apps/web/src/lib/...
const REL_SKILL = "src/lib/ai/agent/skills/bundled/shotcraft-motion.md";
const SKILL_PATH = existsSync(`${process.cwd()}/${REL_SKILL}`)
	? `${process.cwd()}/${REL_SKILL}`
	: `${process.cwd()}/apps/web/${REL_SKILL}`;

describe("shotcraft-motion skill", () => {
	it("能被 loader 正确加载", async () => {
		const skill = await loadSkillFromFile(SKILL_PATH, "bundled");
		expect(skill).not.toBeNull();
		expect(skill?.name).toBe("shotcraft-motion");
		expect(skill?.source).toBe("bundled");
		expect(skill?.description).toContain("电影感");
	});

	it("frontmatter 完整（name/description/tags）", async () => {
		const skill = await loadSkillFromFile(SKILL_PATH, "bundled");
		expect(skill?.tags).toBeDefined();
		expect(skill?.tags).toContain("motion");
		expect(skill?.tags).toContain("transition");
		expect(skill?.tags).toContain("beat-sync");
	});

	it("包含核心知识段：能量骨架/配方卡/节奏方法论/声音设计/验收清单", async () => {
		const skill = await loadSkillFromFile(SKILL_PATH, "bundled");
		const body = skill?.content ?? "";
		expect(body).toContain("全片能量骨架");
		expect(body).toContain("精选配方卡");
		expect(body).toContain("spotlight-hero-card");
		expect(body).toContain("节奏卡点方法论");
		expect(body).toContain("声音设计准则");
		expect(body).toContain("验收清单");
		expect(body).toContain("落地映射");
	});

	it("配方卡包含帧级参数（可执行的调校起点）", async () => {
		const skill = await loadSkillFromFile(SKILL_PATH, "bundled");
		const body = skill?.content ?? "";
		// 抽查：line-carry-transition 关键参数
		expect(body).toContain("1920px / 60f");
		expect(body).toContain("32px/f");
		// 抽查：deck-deal-flyin 加速错峰
		expect(body).toContain("8–10f/张");
		// 抽查：节奏方法论中的验收标准
		expect(body).toContain("±15ms");
		expect(body).toContain("≤3 处");
	});

	it("落地映射覆盖我们的核心工具链", async () => {
		const skill = await loadSkillFromFile(SKILL_PATH, "bundled");
		const body = skill?.content ?? "";
		for (const tool of [
			"update_element",
			"concat_with_transitions",
			"adjust_video_speed",
			"add_text_to_timeline",
			"fade_audio",
			"mix_audio",
		]) {
			expect(body).toContain(tool);
		}
	});
});
