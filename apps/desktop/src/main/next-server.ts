import { spawn, type ChildProcess } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import http from "node:http";

export interface NextServerHandle {
  port: number;
  stop: () => void;
}

const DEFAULT_PORT = 44100;

/**
 * 等待 HTTP 服务就绪
 */
export async function waitForServer(port: number, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(
          { host: "127.0.0.1", port, path: "/", timeout: 1000 },
          (res) => {
            res.destroy();
            resolve(null);
          }
        );
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("timeout"));
        });
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`Next server did not become ready on port ${port} within ${timeoutMs}ms`);
}

/**
 * 寻找可用的空闲端口
 */
async function findFreePort(start: number): Promise<number> {
  for (let port = start; port < start + 100; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = http.createServer();
        server.once("error", reject);
        server.listen(port, "127.0.0.1", () => {
          server.close(() => resolve(null));
        });
      });
      return port;
    } catch {
      // 端口被占用，尝试下一个
    }
  }
  throw new Error("No free port found");
}

/**
 * 递归查找 standalone 目录下的 server.js（Next 输出结构因仓库路径嵌套而异）
 */
async function findServerEntryRecursive(dir: string, depth = 0): Promise<string | null> {
  if (depth > 8) return null;
  let entries: import("node:fs").Dirent[];
  try {
    entries = await import("node:fs").then((fs) =>
      fs.promises.readdir(dir, { withFileTypes: true })
    );
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue; // 跳过依赖目录，避免深挖
      const found = await findServerEntryRecursive(full, depth + 1);
      if (found) return found;
    } else if (entry.name === "server.js") {
      return full;
    }
  }
  return null;
}

/**
 * 启动内嵌 Next standalone server
 *
 * @param webDir - apps/web 目录（内部从 .next/standalone 递归定位 server.js）
 */
export async function createNextServer({ webDir }: { webDir: string }): Promise<NextServerHandle> {
  // 直接探测常见路径
  const candidates = [
    join(webDir, ".next", "standalone", "apps", "web", "server.js"),
    join(webDir, ".next", "standalone", "web", "server.js"),
    join(webDir, "server.js"),
  ];

  let serverEntry: string | null = null;
  for (const candidate of candidates) {
    try {
      await access(candidate);
      serverEntry = candidate;
      break;
    } catch {
      // try next
    }
  }

  // 未命中则递归查找 standalone 根
  if (!serverEntry) {
    serverEntry = await findServerEntryRecursive(join(webDir, ".next", "standalone"));
  }

  if (!serverEntry) {
    throw new Error(
      `Next standalone server not found. Run "bun run build:web" first. Looked in:\n${candidates.join("\n")}`
    );
  }

  const port = await findFreePort(DEFAULT_PORT);

  const child: ChildProcess = spawn("node", [serverEntry], {
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      NODE_ENV: "production",
    },
    stdio: "pipe",
  });

  let childLog = "";
  child.stdout?.on("data", (d) => {
    childLog += d.toString();
    process.stdout.write(`[Next] ${d}`);
  });
  child.stderr?.on("data", (d) => {
    childLog += d.toString();
    process.stderr.write(`[Next:err] ${d}`);
  });

  child.on("exit", (code) => {
    log(`Next server exited (code=${code})`);
  });

  try {
    await waitForServer(port);
  } catch (err) {
    child.kill();
    throw new Error(
      `Failed to start Next standalone server:\n${childLog}\nOriginal: ${(err as Error).message}`
    );
  }

  return {
    port,
    stop: () => {
      if (!child.killed) {
        child.kill();
      }
    },
  };
}

function log(...args: unknown[]): void {
  console.log("[Electron]", ...args);
}