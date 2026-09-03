(() => {
  const colors = {
    nucleus: "#ff7f32",
    knowledge: "#65a8ff",
    intelligence: "#9b7cff",
    humor: "#f2c94c",
    slang: "#27d39b",
    attitude: "#ff9b62",
    action: "#f55f7a",
  };
  const labels = {
    knowledge: "Conhecimento",
    intelligence: "Inteligência",
    humor: "Humor",
    slang: "Gírias",
    attitude: "Atitudes",
    action: "Ações",
  };
  const stop = new Set(
    "para como uma isso esse essa seus suas mais pelo pela entre sobre quando onde porque".split(
      " ",
    ),
  );
  const state = {
    nodes: [],
    links: [],
    canvas: null,
    ctx: null,
    drag: null,
    selected: null,
    hover: null,
    nucleusId: "",
    frame: 0,
    motionFrames: 0,
    heat: 0,
    query: "",
    showLabels: true,
    showOrphans: true,
    center: 0.008,
    repel: 1600,
    link: 0.015,
    distance: 170,
  };
  const $ = (id) => document.getElementById(id);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4;
  const terms = (value) =>
    new Set(
      (
        String(value)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .match(/[a-z0-9]{4,}/g) || []
      ).filter((x) => !stop.has(x)),
    );
  const displayName = (value) =>
    String(value || "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s*:\s*trecho\s*(\d+)/i, " · parte $1")
      .trim();
  function resizeCanvas() {
    const rect = state.canvas.getBoundingClientRect();
    const ratio = lowEnd ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    state.canvas.width = Math.max(1, Math.round(rect.width * ratio));
    state.canvas.height = Math.max(1, Math.round(rect.height * ratio));
  }
  function model(nucleus) {
    resizeCanvas();
    const sameNucleus = state.nucleusId === nucleus.id;
    const old = new Map((sameNucleus ? state.nodes : []).map((n) => [n.id, n]));
    const w = state.canvas?.width || 900,
      h = state.canvas?.height || 600;
    const nodes = [],
      links = [];
    const add = (n, initial = {}) => {
      const previous = old.get(n.id);
      nodes.push({
        x: previous?.x ?? initial.x ?? w / 2,
        y: previous?.y ?? initial.y ?? h / 2,
        vx: 0,
        vy: 0,
        hoverMix: previous?.hoverMix || 0,
        ...n,
      });
    };
    const root = `nucleus:${nucleus.id}`;
    add(
      {
        id: root,
        name: displayName(nucleus.name),
        content: nucleus.instructions,
        category: "nucleus",
        kind: "root",
      },
      { x: w / 2, y: h / 2 },
    );
    Object.keys(labels).forEach((category, index) => {
      const memories = (
        window.compactBrainNodes?.(nucleus.nodes) || nucleus.nodes
      ).filter((n) => n.category === category);
      if (!memories.length) return;
      const hub = `category:${nucleus.id}:${category}`;
      const angle = (index / 6) * Math.PI * 2 - Math.PI / 2;
      const hubX = w / 2 + Math.cos(angle) * Math.min(w, h) * 0.22;
      const hubY = h / 2 + Math.sin(angle) * Math.min(w, h) * 0.22;
      add(
        {
          id: hub,
          name: labels[category],
          category,
          kind: "category",
        },
        { x: hubX, y: hubY },
      );
      links.push({ source: root, target: hub, kind: "structure" });
      memories.forEach((memory, memoryIndex) => {
        const spread =
          angle +
          (memoryIndex - (memories.length - 1) / 2) *
            Math.min(0.2, 1.25 / Math.max(memories.length, 1));
        const ring = Math.min(w, h) * (0.34 + (memoryIndex % 3) * 0.045);
        add(
          {
            ...memory,
            id: String(memory.id),
            name: displayName(memory.name),
            kind: "memory",
            terms: terms(`${memory.name} ${memory.content}`),
          },
          {
            x: w / 2 + Math.cos(spread) * ring,
            y: h / 2 + Math.sin(spread) * ring,
          },
        );
        links.push({
          source: memory.parent_id ? String(memory.parent_id) : hub,
          target: String(memory.id),
          kind: memory.parent_id ? "parent" : "group",
        });
      });
    });
    const memories = nodes.filter((n) => n.kind === "memory");
    memories.forEach((a, i) => {
      memories
        .slice(i + 1)
        .map((b) => ({
          b,
          score: [...a.terms].filter((t) => b.terms.has(t)).length,
        }))
        .filter((x) => x.score >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .forEach(({ b }) =>
          links.push({ source: a.id, target: b.id, kind: "semantic" }),
        );
    });
    const degree = new Map();
    links.forEach((l) => {
      degree.set(l.source, (degree.get(l.source) || 0) + 1);
      degree.set(l.target, (degree.get(l.target) || 0) + 1);
    });
    nodes.forEach((n) => {
      n.degree = degree.get(n.id) || 0;
      n.orphan =
        n.kind === "memory" &&
        !links.some(
          (l) => l.kind !== "group" && (l.source === n.id || l.target === n.id),
        );
      n.radius =
        n.kind === "root"
          ? 18
          : n.kind === "category"
            ? 11 + Math.min(n.degree, 8)
            : 5 + Math.min(n.degree * 1.5, 8);
    });
    state.nodes = nodes;
    state.links = links;
    state.nucleusId = nucleus.id;
    state.selected = null;
    state.hover = null;
    $("brainGraphInspector").hidden = true;
    state.heat = 1;
  }
  function point(event) {
    const r = state.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - r.left) / r.width) * state.canvas.width,
      y: ((event.clientY - r.top) / r.height) * state.canvas.height,
    };
  }
  function hit(p) {
    return [...state.nodes]
      .reverse()
      .find((n) => Math.hypot(n.x - p.x, n.y - p.y) <= n.radius + 7);
  }
  function inspect(node) {
    const panel = $("brainGraphInspector");
    if (!node) return (panel.hidden = true);
    panel.hidden = false;
    const stateLabel =
      node.risk_level === "critical" && !node.usable
        ? "Bloqueado · dado crítico precisa de aprovação"
        : node.review_status === "pending"
          ? "Usável · aguardando revisão"
          : "Revisado";
    panel.innerHTML = `<header><div><span class="eyebrow">${labels[node.category] || "NÚCLEO"}</span><h3></h3></div><button aria-label="Fechar">×</button></header><div class="graph-inspector-content"></div><small>${node.kind === "memory" ? `${stateLabel} · confiança ${Math.round(Number(node.confidence || 1) * 100)}%` : `${node.degree} conexão(ões)`}</small>${node.review_status === "pending" ? `<button class="primary" data-graph-review="${node.id}">Aprovar conhecimento</button>` : ""}`;
    panel.querySelector("h3").textContent = node.name;
    panel.querySelector(".graph-inspector-content").innerHTML =
      window.knowledgeHtml?.(
        node.content ||
          (node.kind === "category"
            ? `${node.degree - 1} conhecimento(s) conectado(s).`
            : ""),
      ) || "";
    panel.querySelector("header button").onclick = () => (panel.hidden = true);
    panel
      .querySelector("[data-graph-review]")
      ?.addEventListener("click", () => window.reviewBrainNode?.(node.id));
  }
  function physics() {
    const { nodes, links } = state,
      w = state.canvas.width,
      h = state.canvas.height;
    const lookup = new Map(nodes.map((n) => [n.id, n]));
    const limit = Math.min(nodes.length, lowEnd ? 120 : 240);
    for (let i = 0; i < limit; i++)
      for (let j = i + 1; j < limit; j++) {
        const a = nodes[i],
          b = nodes[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          d2 = Math.max(dx * dx + dy * dy, 80),
          d = Math.sqrt(d2),
          f = state.repel / d2;
        a.vx -= (dx / d) * f;
        a.vy -= (dy / d) * f;
        b.vx += (dx / d) * f;
        b.vy += (dy / d) * f;
      }
    links.forEach((l) => {
      const a = lookup.get(l.source),
        b = lookup.get(l.target);
      if (!a || !b) return;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.max(Math.hypot(dx, dy), 1),
        target = state.distance * (l.kind === "group" ? 1.15 : 0.9),
        f = (d - target) * state.link;
      a.vx += (dx / d) * f;
      a.vy += (dy / d) * f;
      b.vx -= (dx / d) * f;
      b.vy -= (dy / d) * f;
    });
    nodes.forEach((n) => {
      if (n === state.drag) return;
      n.vx += (w / 2 - n.x) * state.center;
      n.vy += (h / 2 - n.y) * state.center;
      n.vx *= 0.84;
      n.vy *= 0.84;
      n.x = Math.max(24, Math.min(w - 24, n.x + n.vx));
      n.y = Math.max(24, Math.min(h - 24, n.y + n.vy));
    });
    state.heat *= 0.985;
  }
  function draw() {
    const c = state.canvas,
      ctx = state.ctx,
      ratio = lowEnd ? 1 : Math.min(devicePixelRatio || 1, 1.5),
      rect = c.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * ratio)),
      h = Math.max(1, Math.round(rect.height * ratio));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
      state.heat = 0.4;
    }
    ctx.clearRect(0, 0, w, h);
    const lookup = new Map(state.nodes.map((n) => [n.id, n]));
    state.links.forEach((l) => {
      const a = lookup.get(l.source),
        b = lookup.get(l.target);
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      const related =
        state.hover &&
        (l.source === state.hover.id || l.target === state.hover.id);
      ctx.strokeStyle = related
        ? `${colors[state.hover.category]}aa`
        : l.kind === "semantic"
          ? "rgba(101,168,255,.24)"
          : "rgba(160,175,180,.14)";
      ctx.lineWidth = related ? 2 : l.kind === "semantic" ? 1.1 : 0.8;
      ctx.stroke();
    });
    state.nodes.forEach((n) => {
      const match =
        !state.query ||
        `${n.name} ${n.content || ""}`.toLowerCase().includes(state.query);
      ctx.globalAlpha = match ? 1 : 0.12;
      ctx.beginPath();
      const hovered = n === state.hover;
      n.hoverMix += ((hovered ? 1 : 0) - n.hoverMix) * 0.24;
      const animatedRadius = n.radius * (1 + n.hoverMix * 0.42);
      ctx.arc(n.x, n.y, animatedRadius, 0, Math.PI * 2);
      ctx.fillStyle = colors[n.category] || "#829097";
      ctx.shadowBlur =
        lowEnd || state.nodes.length > 140
          ? 0
          : hovered || n === state.selected
            ? 25
            : n.kind === "root"
              ? 15
              : 6;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (n === state.selected) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (n.orphan && state.showOrphans) {
        ctx.beginPath();
        ctx.setLineDash([2, 3]);
        ctx.arc(n.x, n.y, n.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,.45)";
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (
        state.showLabels &&
        (n.kind !== "memory" || hovered || n === state.selected)
      ) {
        ctx.font = `${n.kind === "root" ? "600 13" : "500 10"}px Inter,sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#dce3e6";
        ctx.fillText(n.name.slice(0, 38), n.x, n.y + animatedRadius + 15);
      }
    });
    ctx.globalAlpha = 1;
  }
  function animate() {
    cancelAnimationFrame(state.frame);
    const loop = () => {
      if (state.heat > 0.015 || state.drag) physics();
      draw();
      if (state.motionFrames > 0) state.motionFrames -= 1;
      if (state.heat > 0.015 || state.drag || state.motionFrames > 0)
        state.frame = requestAnimationFrame(loop);
    };
    loop();
  }
  function init() {
    if (state.canvas) return;
    state.canvas = $("brainGraphCanvas");
    state.ctx = state.canvas.getContext("2d");
    new ResizeObserver(() => {
      state.heat = 0.4;
      animate();
    }).observe($("brainGraphStage"));
    state.canvas.onpointerdown = (e) => {
      const n = hit(point(e));
      if (!n) return;
      state.drag = state.selected = n;
      state.canvas.classList.add("dragging");
      state.canvas.setPointerCapture(e.pointerId);
      state.heat = 1;
      animate();
    };
    state.canvas.onpointermove = (e) => {
      if (state.drag) {
        Object.assign(state.drag, point(e), { vx: 0, vy: 0 });
        return;
      }
      const hovered = hit(point(e)) || null;
      if (hovered !== state.hover) {
        state.hover = hovered;
        state.canvas.classList.toggle("node-hover", Boolean(hovered));
        state.motionFrames = reducedMotion ? 0 : 18;
        reducedMotion ? draw() : animate();
      }
    };
    state.canvas.onpointerleave = () => {
      if (!state.drag) {
        state.hover = null;
        state.canvas.classList.remove("node-hover");
        state.motionFrames = reducedMotion ? 0 : 18;
        reducedMotion ? draw() : animate();
      }
    };
    const release = (e) => {
      if (!state.drag) return;
      const n = state.drag;
      state.drag = null;
      state.canvas.classList.remove("dragging");
      state.canvas.releasePointerCapture?.(e.pointerId);
      inspect(n);
      state.heat = 0.35;
      animate();
    };
    state.canvas.onpointerup = state.canvas.onpointercancel = release;
    $("brainGraphSettings").onclick = () =>
      $("brainGraphPanel").classList.toggle("open");
    $("brainGraphPanelClose").onclick = () =>
      $("brainGraphPanel").classList.remove("open");
    $("brainGraphReset").onclick = () => {
      state.nodes.forEach((n) => {
        n.x = state.canvas.width / 2 + (Math.random() - 0.5) * 120;
        n.y = state.canvas.height / 2 + (Math.random() - 0.5) * 120;
      });
      state.heat = 1;
      animate();
    };
    $("brainGraphSearch").oninput = (e) => {
      state.query = e.target.value.trim().toLowerCase();
      draw();
    };
    $("graphLabels").onchange = (e) => {
      state.showLabels = e.target.checked;
      draw();
    };
    $("graphOrphans").onchange = (e) => {
      state.showOrphans = e.target.checked;
      draw();
    };
    [
      ["graphCenter", "center", 1000],
      ["graphRepel", "repel", 0.1],
      ["graphLink", "link", 1000],
      ["graphDistance", "distance", 1],
    ].forEach(([id, key, divisor]) => {
      $(id).oninput = (e) => {
        state[key] = Number(e.target.value) / divisor;
        state.heat = 1;
        animate();
      };
    });
    $("brainGraphGroups").innerHTML = Object.entries(labels)
      .map(
        ([key, label]) =>
          `<span class="graph-group"><i style="background:${colors[key]}"></i>${label}</span>`,
      )
      .join("");
  }
  window.HurtzGraph = {
    render(nucleus) {
      init();
      model(nucleus);
      animate();
    },
  };
})();
