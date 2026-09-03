const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const project = path.resolve(__dirname, "..");
const localUrl = "http://127.0.0.1:3338";
let window;
let backend;
let tunnel;

function envValues() {
  const file = path.join(project, ".env");
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const split = line.indexOf("=");
        return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
      }),
  );
}

function saveWebhook(url) {
  const file = path.join(project, ".env");
  let content = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const line = `PUBLIC_WEBHOOK_URL=${url}`;
  content = /^PUBLIC_WEBHOOK_URL=.*$/m.test(content)
    ? content.replace(/^PUBLIC_WEBHOOK_URL=.*$/m, line)
    : `${content.trimEnd()}\n${line}\n`;
  fs.writeFileSync(file, content, "utf8");
}

async function healthInfo() {
  try {
    const response = await fetch(`${localUrl}/health`, {
      signal: AbortSignal.timeout(700),
    });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

async function waitForBackend() {
  for (let attempt = 0; attempt < 50; attempt++) {
    if ((await healthInfo())?.version === "1.4.0") return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

function startBackend() {
  backend = spawn("node", ["src/index.js"], {
    cwd: project,
    windowsHide: true,
    stdio: "ignore",
  });
}

function stopLegacyBackend() {
  try {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "$id=(Get-NetTCPConnection -LocalPort 3338 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess); if($id){Stop-Process -Id $id -Force}",
      ],
      { windowsHide: true, stdio: "ignore" },
    );
  } catch {}
}

function cloudflaredPath() {
  try {
    return execFileSync("where.exe", ["cloudflared.exe"], {
      windowsHide: true,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .find(Boolean);
  } catch {
    const candidates = [
      path.join(
        process.env.ProgramFiles || "",
        "cloudflared",
        "cloudflared.exe",
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "",
        "cloudflared",
        "cloudflared.exe",
      ),
      path.join(
        process.env.LOCALAPPDATA || "",
        "Microsoft",
        "WinGet",
        "Links",
        "cloudflared.exe",
      ),
    ];
    return candidates.find(
      (candidate) => candidate && fs.existsSync(candidate),
    );
  }
}

async function localApi(route, options = {}) {
  const token = envValues().HURTZ_ADMIN_TOKEN || "";
  return fetch(`${localUrl}${route}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

async function configurePublicWebhook(baseUrl) {
  const webhook = `${baseUrl.replace(/\/+$/, "")}/webhooks/evolution`;
  saveWebhook(webhook);
  const runtime = await localApi("/api/runtime/webhook", {
    method: "PUT",
    body: JSON.stringify({ url: webhook }),
  });
  if (!runtime.ok)
    throw new Error("Não foi possível registrar a URL pública no backend");
  const status = await localApi("/api/status").then((response) =>
    response.json(),
  );
  for (const instance of status.instances || []) {
    await localApi(
      `/api/instances/${encodeURIComponent(instance.name)}/webhook`,
      { method: "POST" },
    );
  }
}

function startTunnel() {
  const executable = cloudflaredPath();
  if (!executable) return;
  tunnel = spawn(executable, ["tunnel", "--url", localUrl, "--no-autoupdate"], {
    cwd: project,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let configured = false;
  const inspect = (data) => {
    if (configured) return;
    const match = String(data).match(
      /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i,
    );
    if (!match) return;
    configured = true;
    configurePublicWebhook(match[0]).catch(() => {});
  };
  tunnel.stdout.on("data", inspect);
  tunnel.stderr.on("data", inspect);
}

function createWindow() {
  window = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 820,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#080A0B",
    title: "Assistente Hurtz — WhatsApp",
    icon: path.resolve(project, "..", "assets", "hurtz-logo.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.loadURL(localUrl);
  window.once("ready-to-show", () => window.show());
}

async function boot() {
  const current = await healthInfo();
  if (current && current.version !== "1.4.0") {
    stopLegacyBackend();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if ((await healthInfo())?.version !== "1.4.0") startBackend();
  if (!(await waitForBackend())) {
    dialog.showErrorBox(
      "Assistente Hurtz",
      "Não foi possível iniciar o backend do Atendente WhatsApp.",
    );
    app.quit();
    return;
  }
  startTunnel();
  createWindow();
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  ipcMain.handle(
    "security:admin-token",
    () => envValues().HURTZ_ADMIN_TOKEN || "",
  );
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });
  app.whenReady().then(boot);
}

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  if (tunnel && !tunnel.killed) tunnel.kill();
  if (backend && !backend.killed) backend.kill();
});
