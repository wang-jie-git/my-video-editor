/**
 * video-analysis-tools 注册与 schema 测试
 *
 * 通过 getAllTools（index）验证新工具已注册——与 frame-tools.test.ts 模式一致，
 * 避免直接 import 工具模块在 bun test 环境下触发循环依赖 TDZ。
 */

import { describe, expect, it } from "bun:test";
import { getAllTools } from "../index";

describe("video-analysis-tools registration", () => {
	it("registers video_probe / video_analyze / video_ask / set_asr_config", () => {
		const tools = getAllTools();
		const names = tools.map((t) => t.name).sort();
		expect(names).toContain("video_probe");
		expect(names).toContain("video_analyze");
		expect(names).toContain("video_ask");
		expect(names).toContain("set_asr_config");
	});

	it("video_probe exposes assetId-required schema", () => {
		const tool = getAllTools().find((t) => t.name === "video_probe");
		expect(tool).toBeDefined();
		expect(tool!.parameters).toMatchObject({
			type: "object",
			properties: { assetId: { type: "string" } },
		});
		const required = (tool!.parameters as { required?: string[] }).required;
		expect(required).toContain("assetId");
	});

	it("video_analyze exposes maxFrames / withTranscript schema and is confirmation-worthy", () => {
		const tool = getAllTools().find((t) => t.name === "video_analyze");
		expect(tool).toBeDefined();
		expect(tool!.parameters).toMatchObject({
			type: "object",
			properties: {
				assetId: { type: "string" },
				maxFrames: { type: "number" },
				withTranscript: { type: "boolean" },
			},
		});
		expect(tool!.requiresConfirmation).toBe(true);
	});

	it("video_ask requires assetId and question", () => {
		const tool = getAllTools().find((t) => t.name === "video_ask");
		expect(tool).toBeDefined();
		const required = (tool!.parameters as { required?: string[] }).required;
		expect(required).toContain("assetId");
		expect(required).toContain("question");
	});

	it("set_asr_config captures baseUrl / apiKey / model", () => {
		const tool = getAllTools().find((t) => t.name === "set_asr_config");
		expect(tool).toBeDefined();
		expect(tool!.parameters).toMatchObject({
			type: "object",
			properties: {
				baseUrl: { type: "string" },
				apiKey: { type: "string" },
				model: { type: "string" },
			},
		});
		expect(tool!.requiresConfirmation).toBe(true);
	});
});