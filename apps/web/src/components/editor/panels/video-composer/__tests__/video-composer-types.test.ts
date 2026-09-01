/**
 * VideoComposer UI 组件基础测试
 *
 * 验证组件可以正确导入和类型检查
 */

import { describe, expect, test } from "bun:test";

// 测试类型定义
import type {
  VideoListItem,
  VideoMergeUIConfig,
  VideoSplitUIConfig,
  VideoTrimUIConfig,
} from "@/services/renderer/video-composer/types";

// 测试 UI 类型
import type {
  VideoListEntry,
  VideoMergeUIConfig as UIVideoMergeUIConfig,
  VideoSplitUIConfig as UIVideoSplitUIConfig,
  VideoTrimUIConfig as UIVideoTrimUIConfig,
  Transition,
} from "../types";

// Mock test data
const mockVideoListEntry: VideoListEntry = {
  id: "test-video-1",
  fileName: "test.mp4",
  duration: 60,
  size: 1024 * 1024,
  hasAudio: true,
};

const mockVideoMergeConfig: UIVideoMergeUIConfig = {
  videos: [mockVideoListEntry],
  outputFormat: "mp4",
  includeAudio: true,
  reencode: false,
};

const mockVideoSplitConfig: UIVideoSplitUIConfig = {
  video: mockVideoListEntry,
  splitPoints: [10, 30, 60],
  outputFormat: "mp4",
  outputPrefix: "segment",
};

const mockVideoTrimConfig: UIVideoTrimUIConfig = {
  video: mockVideoListEntry,
  startTime: 5,
  endTime: 25,
  outputFormat: "mp4",
  outputFile: "trimmed.mp4",
  reencode: false,
};

const mockTransition: Transition = {
  type: "fade",
  duration: 1.0,
};

// ============ 类型验证测试 ============

describe("VideoListEntry 类型验证", () => {
  test("应该接受有效的 VideoListEntry", () => {
    expect(mockVideoListEntry.id).toBe("test-video-1");
    expect(mockVideoListEntry.fileName).toBe("test.mp4");
    expect(mockVideoListEntry.duration).toBe(60);
    expect(mockVideoListEntry.size).toBe(1024 * 1024);
    expect(mockVideoListEntry.hasAudio).toBe(true);
  });

  test("应该接受可选的 thumbnailUrl", () => {
    const videoWithThumbnail: VideoListEntry = {
      ...mockVideoListEntry,
      thumbnailUrl: "https://example.com/thumb.jpg",
    };

    expect(videoWithThumbnail.thumbnailUrl).toBe(
      "https://example.com/thumb.jpg",
    );
  });
});

describe("VideoMergeUIConfig 类型验证", () => {
  test("应该接受有效的合并配置", () => {
    expect(mockVideoMergeConfig.videos).toHaveLength(1);
    expect(mockVideoMergeConfig.outputFormat).toBe("mp4");
    expect(mockVideoMergeConfig.includeAudio).toBe(true);
    expect(mockVideoMergeConfig.reencode).toBe(false);
  });

  test("应该接受可选的转场配置", () => {
    const configWithTransition: UIVideoMergeUIConfig = {
      ...mockVideoMergeConfig,
      transitionType: "fade",
      transitionDuration: 1.5,
    };

    expect(configWithTransition.transitionType).toBe("fade");
    expect(configWithTransition.transitionDuration).toBe(1.5);
  });
});

describe("VideoSplitUIConfig 类型验证", () => {
  test("应该接受有效的分割配置", () => {
    expect(mockVideoSplitConfig.video.id).toBe("test-video-1");
    expect(mockVideoSplitConfig.splitPoints).toEqual([10, 30, 60]);
    expect(mockVideoSplitConfig.outputFormat).toBe("mp4");
    expect(mockVideoSplitConfig.outputPrefix).toBe("segment");
  });
});

describe("VideoTrimUIConfig 类型验证", () => {
  test("应该接受有效的裁剪配置", () => {
    expect(mockVideoTrimConfig.video.id).toBe("test-video-1");
    expect(mockVideoTrimConfig.startTime).toBe(5);
    expect(mockVideoTrimConfig.endTime).toBe(25);
    expect(mockVideoTrimConfig.outputFile).toBe("trimmed.mp4");
    expect(mockVideoTrimConfig.reencode).toBe(false);
  });
});

describe("Transition 类型验证", () => {
  test("应该接受有效的转场配置", () => {
    expect(mockTransition.type).toBe("fade");
    expect(mockTransition.duration).toBe(1.0);
  });

  test("应该接受可选的 offset", () => {
    const transitionWithOffset: Transition = {
      type: "slide",
      duration: 2.0,
      offset: 5.0,
    };

    expect(transitionWithOffset.offset).toBe(5.0);
  });
});

// ============ 类型兼容性测试 ============

describe("类型兼容性", () => {
  test("VideoListEntry 应该兼容 VideoListItem", () => {
    // 验证 UI 类型可以映射到服务层类型
    const serviceType: import("@/services/renderer/video-composer/types").VideoListItem =
      {
        id: mockVideoListEntry.id,
        fileName: mockVideoListEntry.fileName,
        duration: mockVideoListEntry.duration,
        size: mockVideoListEntry.size,
        hasAudio: mockVideoListEntry.hasAudio,
      };

    expect(serviceType.id).toBe(mockVideoListEntry.id);
    expect(serviceType.fileName).toBe(mockVideoListEntry.fileName);
  });
});
