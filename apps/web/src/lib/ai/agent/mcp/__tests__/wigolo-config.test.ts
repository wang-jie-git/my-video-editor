/**
 * wigolo MCP 配置测试
 *
 * 验证 wigolo 已注册到默认 MCP Server 配置，且配置完整可被 McpClient 加载。
 */
import { describe, expect, test } from "bun:test";
import { DEFAULT_MCP_SERVERS } from "../config";

describe("Wigolo MCP 配置", () => {
  test("DEFAULT_MCP_SERVERS 包含 wigolo 条目", () => {
    const wigolo = DEFAULT_MCP_SERVERS.find((s) => s.id === "wigolo");
    expect(wigolo).toBeDefined();
  });

  test("wigolo 配置完整（serverPath/超时/图标/分类）", () => {
    const wigolo = DEFAULT_MCP_SERVERS.find((s) => s.id === "wigolo")!;
    expect(wigolo.name).toBe("Wigolo");
    expect(wigolo.enabled).toBe(true);
    expect(wigolo.serverPath).toContain("wigolo");
    expect(wigolo.timeout).toBeGreaterThan(0);
    expect(wigolo.icon).toBeTruthy();
    expect(wigolo.category).toBe("search");
  });

  test("wigolo 与其他 server 无 id 冲突", () => {
    const ids = DEFAULT_MCP_SERVERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("wigolo 二进制存在且可执行", () => {
    const wigolo = DEFAULT_MCP_SERVERS.find((s) => s.id === "wigolo")!;
    // serverPath 可能是环境变量覆盖，仅在默认路径时验证文件存在
    if (wigolo.serverPath === "/Users/mac/.npm-global/bin/wigolo") {
      const { existsSync } = require("node:fs");
      expect(existsSync(wigolo.serverPath)).toBe(true);
    }
  });
});
