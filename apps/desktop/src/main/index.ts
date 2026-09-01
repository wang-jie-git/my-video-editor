import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createNextServer, waitForServer, type NextServerHandle } from "./next-server";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isDev = !!process.env["ELECTRON_RENDERER_URL"] || process.env["NODE_ENV"] === "development";

let mainWindow: BrowserWindow | null = null;
let nextServer: NextServerHandle | null = null;

/**
 * 控制台输出带 [Electron] 前缀，方便与 renderer 日志区分
 */
function log(...args: unknown[]): void {
  console.log("[Electron]", ...args);
}

/**
 * 创建主窗口
 */
async function createWindow(port: number): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: "Cutia",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // 外部链接交给系统浏览器，不走应用窗口
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  const target = `http://127.0.0.1:${port}`;
  log("Loading:", target);
  await mainWindow.loadURL(target);
}

/**
 * 注册 IPC handlers（安全：只暴露白名单能力）
 */
function registerIpc(): void {
  ipcMain.handle("app:get-info", () => ({
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    isDesktop: true,
  }));

  // 窗口控制
  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:toggle-maximize", () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.handle("window:close", () => mainWindow?.close());
}

/**
 * 应用启动
 */
async function bootstrap(): Promise<void> {
  registerIpc();

  // 开发模式：连外部 Next dev server（turbo dev:web 提供）
  if (isDev) {
    const nextDevUrl = process.env["NEXT_DEV_URL"] || "http://127.0.0.1:4100";
    const nextDevPort = Number(new URL(nextDevUrl).port || 4100);
    if (!process.env["NEXT_DEV_URL"]) {
      // 未显式指定地址时，等待默认 4100 端口就绪（next dev 可能仍在启动）
      try {
        await waitForServer(nextDevPort);
      } catch {
        log("Warning: Next dev server not ready on port 4100 yet");
      }
    }
    await createWindow(nextDevPort);
    return;
  }

  // 生产模式：启动内嵌 Next standalone server
  // CUTIA_WEB_DIR 可显式指定 web 目录（开发期/打包部署用）；默认从应用包内 web/ 查找
  const webDir =
    process.env["CUTIA_WEB_DIR"] || join(app.getAppPath(), "web");
  nextServer = await createNextServer({ webDir });
  const { port } = nextServer;

  app.on("before-quit", () => {
    nextServer?.stop();
  });

  await createWindow(port);
}

app.whenReady().then(async () => {
  try {
    await bootstrap();
  } catch (err) {
    console.error("[Electron] Failed to start:", err);
    app.quit();
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0 && nextServer) {
      await createWindow(nextServer.port);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});