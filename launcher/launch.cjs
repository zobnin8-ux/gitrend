const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const launcherDir = process.pkg
  ? path.dirname(process.execPath)
  : __dirname;
const PROJECT_ROOT = path.resolve(launcherDir, "..");
const PORT = 3000;
const URL = `http://localhost:${PORT}`;

function showError(message) {
  try {
    execSync(
      `powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; [System.Windows.Forms.MessageBox]::Show('${message.replace(/'/g, "''")}','GitHub Trends','OK','Error')"`,
      { stdio: "ignore", windowsHide: true }
    );
  } catch {
    // ignore
  }
}

function isListening() {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForServer(timeoutMs = 90000) {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = async () => {
      if (await isListening()) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(tick, 600);
    };
    tick();
  });
}

function launchSilent() {
  const ps1 = path.join(PROJECT_ROOT, "launch-app.ps1");
  if (!fs.existsSync(ps1)) {
    showError("launch-app.ps1 not found in project root.");
    process.exit(1);
  }

  spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-WindowStyle",
      "Hidden",
      "-File",
      ps1,
      "-Silent",
    ],
    {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }
  ).unref();
}

function openBrowser() {
  spawn("cmd", ["/c", "start", "", URL], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();
}

async function main() {
  if (!(await isListening())) {
    launchSilent();
    const ready = await waitForServer();
    if (!ready) {
      showError(
        `Server did not start within 90 s.\\nCheck data\\\\launch.log and data\\\\server.log`
      );
      process.exit(1);
    }
  }

  openBrowser();
  process.exit(0);
}

main().catch(() => {
  showError("Failed to start GitHub Trends.");
  process.exit(1);
});
