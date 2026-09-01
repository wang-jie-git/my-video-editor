/**
 * Loader E2E：验证真实 bundled md 文件能被加载并注册
 */
import { describe, it, expect, afterEach } from "bun:test";
import { loadBundledSkills, loadSkillRegistry, parseSkillFrontmatter } from "../loader";
import { setSkillRegistry } from "../registry";

afterEach(() => setSkillRegistry(null));

describe("loader (真实文件)", () => {
	it("加载 bundled 目录中的技能", async () => {
		const skills = await loadBundledSkills();
		expect(skills.length).toBeGreaterThanOrEqual(2);
		expect(skills.some((s) => s.name === "ffmpeg-migration")).toBe(true);
		expect(skills.some((s) => s.name === "video-export-troubleshoot")).toBe(true);
	});

	it("frontmatter 解析实际文件", async () => {
		const skills = await loadBundledSkills();
		const ffmpegSkill = skills.find((s) => s.name === "ffmpeg-migration")!;
		expect(ffmpegSkill.description).toContain("FFmpeg.wasm 迁移工作流");
		expect(ffmpegSkill.tags).toContain("ffmpeg");
		expect(ffmpegSkill.content).toContain("# FFmpeg.wasm 迁移技能");
		expect(ffmpegSkill.source).toBe("bundled");
	});

	it("loadSkillRegistry 注册全部技能", async () => {
		await loadSkillRegistry();
		const registry = (await import("../registry")).getSkillRegistry();
		const state = registry.getState();
		expect(state.total).toBeGreaterThanOrEqual(2);
		expect(state.bySource.bundled).toBeGreaterThanOrEqual(2);
	});
});
