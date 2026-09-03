import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("envia o código aceito para português brasileiro ao Actor de busca", () => {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  const server = fs.readFileSync(path.resolve(directory, "../src/server.js"), "utf8");
  assert.match(server, /languageCode:\s*"pt-BR"/);
  assert.doesNotMatch(server, /languageCode:\s*"pt"/);
});
