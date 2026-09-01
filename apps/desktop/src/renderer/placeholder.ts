// 占位入口：本应用渲染层由 Next.js 提供，此文件仅满足 electron-vite renderer 配置
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("root");
  if (el) el.textContent = "Cutia renderer placeholder (Next.js serves the real UI)";
});
