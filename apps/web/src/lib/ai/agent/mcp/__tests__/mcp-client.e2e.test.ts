/**
 * McpClient/McpManager E2E 验证
 *
 * 使用真实 stdio 子进程（mock MCP server）验证：
 * 1. McpClient 连接（initialize 握手）
 * 2. 工具发现（tools/list）
 * 3. 工具调用（tools/call）
 * 4. McpManager 多 Server 聚合
 *
 * 运行：bun test src/lib/ai/agent/mcp/__tests__/mcp-client.e2e.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { McpClient } from "../mcp-client";
import { McpManager } from "../mcp-manager";

const MOCK_SERVER_PATH = "/tmp/mcp-mock-server.js";

describe("McpClient (stdlib JSON-RPC over stdio)", () => {
  let client: McpClient;

  beforeAll(async () => {
    client = new McpClient();
    await client.connect(MOCK_SERVER_PATH, []);
  });

  afterAll(() => {
    client.disconnect();
  });

  it("连接后已发现工具", () => {
    const tools = client.getTools();
    expect(tools.length).toBeGreaterThan(0);
    const names = tools.map((t) => t.name);
    expect(names).toContain("echo");
    expect(names).toContain("add");
  });

  it("调用 echo 工具返回文本结果", async () => {
    const result = await client.callTool("echo", { text: "hello mcp" });
    expect(result.success).toBe(true);
    expect(result.message).toContain("echo: hello mcp");
  });

  it("调用 add 工具正确传参", async () => {
    const result = await client.callTool("add", { a: 2, b: 3 });
    expect(result.success).toBe(true);
    expect(result.message).toContain("sum: 5");
  });

  it("调用不存在的工具返回错误", async () => {
    const result = await client.callTool("nonexistent", {});
    expect(result.success).toBe(false);
  });
});

describe("McpManager (多 Server 聚合)", () => {
  let manager: McpManager;

  beforeAll(async () => {
    manager = new McpManager();
    await manager.addServer({
      id: "mock-a",
      name: "Mock A",
      enabled: true,
      serverPath: MOCK_SERVER_PATH,
    });
    await manager.addServer({
      id: "mock-b",
      name: "Mock B",
      enabled: true,
      serverPath: MOCK_SERVER_PATH,
    });
  });

  afterAll(() => {
    manager.disconnectAll();
  });

  it("聚合两个 Server 的所有工具", () => {
    const tools = manager.getAllTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);
  });

  it("通过 Manager 调用工具（serverId + toolName）", async () => {
    const result = await manager.callTool("mock-a", "echo", { text: "via manager" });
    expect(result.success).toBe(true);
    expect(result.message).toContain("echo: via manager");
  });

  it("禁用 Server 后工具被移除", async () => {
    manager.disableServer("mock-b");
    const names = manager.getAllTools().map((t) => t.name);
    expect(names.some((n) => n.startsWith("mock-b"))).toBe(false);

    const status = manager.getServerStatus("mock-b");
    expect(status?.connected).toBe(false);
  });
});