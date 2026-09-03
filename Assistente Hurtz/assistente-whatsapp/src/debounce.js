export class MessageDebouncer {
  constructor(waitMs, handler) {
    this.waitMs = waitMs;
    this.handler = handler;
    this.pending = new Map();
  }
  push(contact, item) {
    const previous = this.pending.get(contact) || { items: [], timer: null };
    clearTimeout(previous.timer);
    previous.items.push(item);
    previous.timer = setTimeout(async () => {
      this.pending.delete(contact);
      await this.handler(contact, previous.items);
    }, this.waitMs);
    this.pending.set(contact, previous);
  }
  async flush(contact) {
    const pending = this.pending.get(contact);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(contact);
    await this.handler(contact, pending.items);
  }
}
