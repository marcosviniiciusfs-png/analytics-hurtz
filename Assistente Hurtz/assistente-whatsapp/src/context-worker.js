const pending = new Map();
let activeGenerations = 0;
let running = false;

async function drain() {
  if (running || activeGenerations > 0 || !pending.size) return;
  running = true;
  try {
    while (pending.size && activeGenerations === 0) {
      const [contact, task] = pending.entries().next().value;
      pending.delete(contact);
      await task();
    }
  } finally {
    running = false;
    if (pending.size && activeGenerations === 0) queueMicrotask(drain);
  }
}

export function beginGeneration() {
  activeGenerations += 1;
}

export function endGeneration() {
  activeGenerations = Math.max(0, activeGenerations - 1);
  queueMicrotask(drain);
}

export function scheduleContextWork(contact, task) {
  pending.set(contact, task);
  queueMicrotask(drain);
}

export function contextWorkerStatus() {
  return { pending: pending.size, running, activeGenerations };
}
