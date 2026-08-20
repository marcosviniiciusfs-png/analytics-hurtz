import fs from "node:fs";
import path from "node:path";

const initial = { settings: { retentionDays: 30, apifyToken: "", actors: {} }, discoveries: [], jobs: [], leads: [], audit: [] };

export class Store {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) this.write(initial);
  }
  read() {
    try { return { ...structuredClone(initial), ...JSON.parse(fs.readFileSync(this.file, "utf8")) }; }
    catch { return structuredClone(initial); }
  }
  write(data) {
    const temporary = `${this.file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(temporary, this.file);
  }
  update(mutator) {
    const data = this.read();
    mutator(data);
    this.write(data);
    return data;
  }
  audit(action, details = {}) {
    return this.update((data) => {
      data.audit.unshift({ id: crypto.randomUUID(), action, details, at: new Date().toISOString() });
      data.audit = data.audit.slice(0, 500);
    });
  }
  purgeExpired() {
    return this.update((data) => {
      const days = Math.max(1, Number(data.settings.retentionDays || 30));
      const cutoff = Date.now() - days * 86400000;
      data.leads = data.leads.filter((lead) => new Date(lead.collectedAt).getTime() >= cutoff);
    });
  }
}
