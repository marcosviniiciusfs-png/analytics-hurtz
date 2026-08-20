import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const files = fs
  .readdirSync("tests")
  .filter((name) => name.endsWith(".test.js"))
  .map((name) => `tests/${name}`);
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "hurtz-tests-"));
const child = spawn(
  process.execPath,
  ["--test", "--test-concurrency=1", ...files],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      HURTZ_DISABLE_CLOUD_SYNC: "1",
      HURTZ_ADMIN_TOKEN: "",
      EVOLUTION_WEBHOOK_SECRET: "",
      HURTZ_DB_PATH: path.join(testDir, "tests.sqlite"),
    },
  },
);

child.on("exit", (code) => {
  fs.rmSync(testDir, { recursive: true, force: true });
  process.exitCode = code ?? 1;
});
