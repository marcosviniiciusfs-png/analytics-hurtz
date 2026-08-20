import fs from "node:fs";

const sourcePath = "data/.evolution-vps.tmp.env";
const targetPath = ".env";

function parseEnv(text) {
  const result = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    result[line.slice(0, index).trim()] = line.slice(index + 1).trim()
      .replace(/^['"]|['"]$/g, "");
  }
  return result;
}

function setEnv(text, name, value) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  return pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}

const remote = parseEnv(fs.readFileSync(sourcePath, "utf8"));
let url = String(remote.EVOLUTION_API_URL || "").replace(/\/+$/, "");
url = url.replace(/127\.0\.0\.1|localhost/, "161.97.148.99");
const key = remote.EVOLUTION_API_KEY || remote.AUTHENTICATION_API_KEY || "";
if (!url || !key) throw new Error("Credenciais Evolution não encontradas na VPS");

const response = await fetch(`${url}/instance/fetchInstances`, {
  headers: { apikey: key },
  signal: AbortSignal.timeout(10000)
});
if (!response.ok) throw new Error(`Evolution respondeu HTTP ${response.status}`);
const instances = await response.json();

let local = fs.readFileSync(targetPath, "utf8");
local = setEnv(local, "EVOLUTION_API_URL", url);
local = setEnv(local, "EVOLUTION_API_KEY", key);
fs.writeFileSync(targetPath, local, "utf8");

console.log(JSON.stringify({
  connected: true,
  protocol: new URL(url).protocol,
  host: new URL(url).host,
  instances: Array.isArray(instances) ? instances.length : null,
  credentialsSaved: true
}));
