/**
 * native-audio-tools 注册与 schema 测试
 *
 * 与 video-analysis-tools.test.ts 同模式：通过 getAllTools 验证注册，
 * 避免 bun test 环境直接 import 工具模块触发循环依赖 TDZ。
 */

import { describe, expect, it } from "bun:test";
import { getAllTools } from "../index";

describe("native-audio-tools registration", () => {
	it("registers all 7 native audio tools", () => {
		const names = getAllTools().map((t) => t.name);
		for (const expected of [
			"extract_audio",
			"mix_audio",
			"set_audio_volume",
			"fade_audio",
			"mute_audio",
			"speed_audio",
			"denoise_audio",
		]) {
			expect(names).toContain(expected);
		}
	});

	it("extract_audio requires assetId", () => {
		const tool = getAllTools().find((t) => t.name === "extract_audio");
		expect(tool).toBeDefined();
		const required = (tool!.parameters as { required?: string[] }).required;
		expect(required).toContain("assetId");
	});

	it("mix_audio requires non-empty assetIds and is confirmation-worthy", () => {
		const tool = getAllTools().find((t) => t.name === "mix_audio");
		expect(tool).toBeDefined();
		const required = (tool!.parameters as { required?: string[] }).required;
		expect(required).toContain("assetIds");
		expect(tool!.requiresConfirmation).toBe(true);
	});

	it("set_audio_volume requires assetId and volume", () => {
		const tool = getAllTools().find((t) => t.name === "set_audio_volume");
		expect(tool).toBeDefined();
		const required = (tool!.parameters as { required?: string[] }).required;
		expect(required).toContain("assetId");
		expect(required).toContain("volume");
	});

	it("denoise_audio is confirmation-worthy (offline render cost)", () => {
		const tool = getAllTools().find((t) => t.name === "denoise_audio");
		expect(tool).toBeDefined();
		expect(tool!.requiresConfirmation).toBe(true);
	});
});