/**
 * EditorCore VideoComposer 集成测试
 *
 * 测试 VideoComposer 与 EditorCore 的集成
 */

import { describe, expect, test, vi, beforeEach, afterEach } from "bun:test";
import { EditorCore } from "@/core";
import type {
  MergeResult,
  SplitResult,
  TrimResult,
} from "@/services/renderer/video-composer/types";

// Mock FFmpegService
vi.mock("@/services/renderer/ffmpeg/ffmpeg-service", () => {
  const mockExec = vi.fn().mockImplementation((args: string[]) => {
    // FFprobe getVideoDuration
    if (args.includes("-show_entries") && args.includes("format=duration")) {
      return Promise.resolve({
        stdout: "120.5",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
    }

    // FFprobe getVideoInfo
    if (args.includes("-show_entries") && args.includes("json")) {
      return Promise.resolve({
        stdout: JSON.stringify({
          streams: [
            {
              width: 1920,
              height: 1080,
              r_frame_rate: "30/1",
              codec_name: "h264",
            },
          ],
          format: {
            duration: "120.5",
            size: "104857600",
          },
        }),
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
    }

    return Promise.resolve({
      stdout: "",
      stderr: "",
      exitCode: 0,
      duration: 100,
    });
  });

  return {
    FFmpegService: vi.fn().mockImplementation(() => ({
      isLoaded: vi.fn().mockReturnValue(true),
      load: vi.fn().mockResolvedValue(undefined),
      exec: mockExec,
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(new Uint8Array(1024 * 1024)),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      listDir: vi.fn().mockResolvedValue([]),
      cleanup: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

describe("EditorCore VideoComposer 集成", () => {
  let editor: EditorCore;

  beforeEach(async () => {
    // 重置 EditorCore 单例
    EditorCore.reset();

    // 创建新的 EditorCore 实例
    editor = EditorCore.getInstance();

    // 启用 FFmpeg 导出
    await editor.renderer.enableFFmpegExport(true);
  });

  afterEach(() => {
    EditorCore.reset();
  });

  // ============ 初始化测试 ============

  describe("初始化", () => {
    test("应该成功启用 FFmpeg 导出", async () => {
      expect(editor.renderer.isUsingFFmpeg()).toBe(true);
    });

    test("应该能够获取 VideoComposer 实例", () => {
      const composer = editor.renderer.getVideoComposer();
      expect(composer).toBeDefined();
    });

    test("VideoComposer 应该是单例", () => {
      const composer1 = editor.renderer.getVideoComposer();
      const composer2 = editor.renderer.getVideoComposer();
      expect(composer1).toBe(composer2);
    });
  });

  // ============ 视频合并集成测试 ============

  describe("mergeVideos 集成", () => {
    test("应该能够通过 EditorCore 合并视频", async () => {
      const result = await editor.renderer.mergeVideos(
        ["video1.mp4", "video2.mp4"],
        {
          outputFile: "merged.mp4",
          includeAudio: true,
          reencode: false,
        },
        (progress) => {
          console.log("合并进度:", progress);
        },
      );

      expect(result.success).toBe(true);
      expect(result.outputFile).toBe("merged.mp4");
      expect(result.videoCount).toBe(2);
    });

    test("应该支持转场合并", async () => {
      const result = await editor.renderer.concatWithTransitions(
        ["video1.mp4", "video2.mp4"],
        {
          outputFile: "merged-transitions.mp4",
          transitions: [{ type: "fade", duration: 1.0 }],
          includeAudio: true,
        },
      );

      expect(result.success).toBe(true);
    });
  });

  // ============ 视频分割集成测试 ============

  describe("splitVideo 集成", () => {
    test("应该能够通过 EditorCore 分割视频", async () => {
      const result = await editor.renderer.splitVideo(
        "video.mp4",
        {
          splitPoints: [10, 20, 30],
          outputPrefix: "segment",
        },
        (progress) => {
          console.log("分割进度:", progress);
        },
      );

      expect(result.success).toBe(true);
      expect(result.outputFiles?.length).toBe(4); // 3 个分割点 → 4 个片段
    });

    test("应该支持单个分割点", async () => {
      const result = await editor.renderer.splitVideo("video.mp4", {
        splitPoints: [10],
        outputPrefix: "clip",
      });

      expect(result.success).toBe(true);
      expect(result.outputFiles?.length).toBe(2);
    });
  });

  // ============ 视频裁剪集成测试 ============

  describe("trimVideo 集成", () => {
    test("应该能够通过 EditorCore 裁剪视频", async () => {
      const result = await editor.renderer.trimVideo(
        "video.mp4",
        {
          startTime: 5,
          endTime: 15,
          outputFile: "trimmed.mp4",
          reencode: false,
        },
        (progress) => {
          console.log("裁剪进度:", progress);
        },
      );

      expect(result.success).toBe(true);
      expect(result.outputFile).toBe("trimmed.mp4");
      expect(result.duration).toBe(10); // 15 - 5 = 10
    });

    test("应该支持从开头裁剪", async () => {
      const result = await editor.renderer.trimVideo("video.mp4", {
        startTime: 0,
        endTime: 10,
        outputFile: "trimmed-start.mp4",
      });

      expect(result.success).toBe(true);
    });

    test("应该支持裁剪到末尾", async () => {
      const result = await editor.renderer.trimVideo("video.mp4", {
        startTime: 50,
        endTime: 60,
        outputFile: "trimmed-end.mp4",
      });

      expect(result.success).toBe(true);
    });
  });

  // ============ 视频信息查询集成测试 ============

  describe("getVideoInfo 集成", () => {
    test("应该能够获取视频信息", async () => {
      const info = await editor.renderer.getVideoInfo("video.mp4");

      expect(info).not.toBeNull();
      expect(info?.fileName).toBe("video.mp4");
      expect(info?.duration).toBeGreaterThan(0);
      expect(info?.width).toBe(1920);
      expect(info?.height).toBe(1080);
      expect(info?.fps).toBe(30);
    });

    test("应该能够获取视频时长", async () => {
      const duration = await editor.renderer.getVideoDuration("video.mp4");
      expect(duration).toBe(120.5);
    });
  });

  // ============ 禁用 FFmpeg 测试 ============

  describe("禁用 FFmpeg", () => {
    test("禁用 FFmpeg 后应该无法获取 VideoComposer", async () => {
      await editor.renderer.enableFFmpegExport(false);

      expect(editor.renderer.isUsingFFmpeg()).toBe(false);

      // 应该抛出错误
      expect(() => {
        editor.renderer.getVideoComposer();
      }).toThrow("VideoComposer not initialized");
    });
  });

  // ============ 完整工作流测试 ============

  describe("完整工作流", () => {
    test("应该能够执行完整的视频编辑工作流", async () => {
      // 步骤 1: 合并视频
      const mergeResult = await editor.renderer.mergeVideos(
        ["part1.mp4", "part2.mp4", "part3.mp4"],
        {
          outputFile: "merged.mp4",
          includeAudio: true,
          reencode: false,
        },
      );

      expect(mergeResult.success).toBe(true);
      expect(mergeResult.outputFile).toBe("merged.mp4");

      // 步骤 2: 分割合并后的视频
      const splitResult = await editor.renderer.splitVideo("merged.mp4", {
        splitPoints: [60, 120],
        outputPrefix: "final",
      });

      expect(splitResult.success).toBe(true);
      expect(splitResult.outputFiles?.length).toBe(3);

      // 步骤 3: 裁剪第一个片段
      const trimResult = await editor.renderer.trimVideo("final_1.mp4", {
        startTime: 5,
        endTime: 55,
        outputFile: "final_1_trimmed.mp4",
        reencode: false,
      });

      expect(trimResult.success).toBe(true);
      expect(trimResult.outputFile).toBe("final_1_trimmed.mp4");
      expect(trimResult.duration).toBe(50);
    });
  });

  // ============ 错误处理测试 ============

  describe("错误处理", () => {
    test("应该处理无效的合并参数", async () => {
      const result = await editor.renderer.mergeVideos([], {
        outputFile: "output.mp4",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("应该处理无效的分割参数", async () => {
      const result = await editor.renderer.splitVideo("video.mp4", {
        splitPoints: [-10, 20],
        outputPrefix: "output",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("应该处理无效的裁剪参数", async () => {
      const result = await editor.renderer.trimVideo("video.mp4", {
        startTime: 20,
        endTime: 10,
        outputFile: "output.mp4",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
