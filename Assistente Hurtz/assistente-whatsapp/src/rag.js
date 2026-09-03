import fs from "node:fs";
import path from "node:path";
import { rootDir } from "./config.js";
import { allKnowledgeChunks } from "./memory.js";

const kbDir = path.join(rootDir, "knowledge-base");
const stop = new Set(
  "a o as os de da do das dos e em para por com que um uma no na nos nas é ao se ou como mais".split(
    " ",
  ),
);

function terms(text) {
  return new Set(
    String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((x) => x.length > 2 && !stop.has(x)),
  );
}

function chunks(text, source) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  return paragraphs.flatMap((p, i) => {
    if (p.length <= 900) return [{ source, index: i, text: p }];
    return (
      p.match(/.{1,850}(?:\s|$)/gs)?.map((text, j) => ({
        source,
        index: i * 100 + j,
        text: text.trim(),
      })) || []
    );
  });
}

export function loadKnowledge() {
  const allowed = new Set([".txt", ".md", ".json"]);
  const files = fs.existsSync(kbDir)
    ? fs
        .readdirSync(kbDir)
        .filter((name) => allowed.has(path.extname(name).toLowerCase()))
        .flatMap((name) =>
          chunks(fs.readFileSync(path.join(kbDir, name), "utf8"), name),
        )
    : [];
  return [...allKnowledgeChunks(), ...files];
}

export function searchKnowledge(query, topK = 4) {
  const wanted = terms(query);
  if (!wanted.size) return [];
  return loadKnowledge()
    .map((item) => {
      const got = terms(item.text);
      let score = 0;
      for (const word of wanted) if (got.has(word)) score += 1;
      return { ...item, score: score / Math.sqrt(Math.max(1, got.size)) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
