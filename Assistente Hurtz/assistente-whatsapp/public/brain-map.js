(() => {
  const areas = [
    {
      id: "identity",
      name: "Identidade e regras",
      short: "Identidade",
      color: "#67b7f7",
      path: "M34 24 H284 C318 75 310 136 280 190 C250 238 190 263 116 270 L26 250 Z",
      label: [143, 140],
    },
    {
      id: "knowledge",
      name: "Conhecimento",
      short: "Conhecimento",
      color: "#54a8e8",
      path: "M250 6 H397 L411 182 C365 203 317 211 274 192 C310 132 316 70 250 6 Z",
      label: [340, 92],
    },
    {
      id: "lead",
      name: "Memória do lead",
      short: "Lead",
      color: "#f2ef55",
      path: "M380 5 H532 L565 157 C514 183 462 190 411 182 L397 5 Z",
      label: [468, 94],
    },
    {
      id: "conversation",
      name: "Memória da conversa",
      short: "Conversa",
      color: "#ebe84b",
      path: "M512 24 H632 L704 175 L561 211 L565 157 Z",
      label: [585, 122],
    },
    {
      id: "intelligence",
      name: "Inteligência e raciocínio",
      short: "Raciocínio",
      color: "#a6e65b",
      path: "M274 192 C337 164 407 168 473 188 L506 282 C449 313 375 322 305 294 L238 243 Z",
      label: [371, 239],
    },
    {
      id: "personality",
      name: "Personalidade e humor",
      short: "Humor",
      color: "#8cdb55",
      path: "M24 244 C106 249 179 227 238 243 L305 294 L276 402 L97 429 L30 354 Z",
      label: [151, 326],
    },
    {
      id: "language",
      name: "Linguagem e gírias",
      short: "Linguagem",
      color: "#77ce45",
      path: "M238 243 L305 294 C361 318 386 360 369 430 L265 466 L168 433 L276 402 Z",
      label: [287, 367],
    },
    {
      id: "actions",
      name: "Ações e ferramentas",
      short: "Ações",
      color: "#52c9a1",
      path: "M305 294 C375 322 449 313 506 282 L564 342 L514 416 L369 430 C386 360 361 318 305 294 Z",
      label: [439, 352],
    },
    {
      id: "safety",
      name: "Segurança e transferência humana",
      short: "Segurança",
      color: "#ff7a88",
      path: "M450 165 C492 174 541 176 590 180 L635 310 L565 360 L485 290 Z",
      label: [536, 256],
    },
    {
      id: "learning",
      name: "Aprendizado e feedback loop",
      short: "Aprendizado",
      color: "#f26678",
      path: "M561 147 L714 168 L729 337 L621 357 L621 310 L561 211 Z",
      label: [649, 241],
    },
  ];
  const keywordMap = {
    identity: /identidade|regra|objetivo|limite|prioridade|nunca|sempre/i,
    lead: /lead|cliente|perfil|prefer[eê]ncia|necessidade|interesse|nome/i,
    conversation:
      /conversa|hist[oó]rico|contexto|registro|acompanhar|pr[oó]ximo passo/i,
    safety: /seguran|humano|transfer|risco|sens[ií]vel|bloque|proibid/i,
    learning: /aprendi|feedback|revis|corre[cç][aã]o|melhoria/i,
  };
  const categoryMap = {
    knowledge: ["knowledge"],
    intelligence: ["intelligence"],
    personality: ["humor", "attitude"],
    language: ["slang"],
    actions: ["action"],
  };
  let currentNucleus = null;
  let selectedArea = "intelligence";
  const $ = (id) => document.getElementById(id);

  function relevant(area, nodes, instructions = "") {
    if (categoryMap[area])
      return nodes.filter((node) => categoryMap[area].includes(node.category));
    const pattern = keywordMap[area];
    const matches = nodes.filter((node) =>
      pattern?.test(`${node.name} ${node.content}`),
    );
    if (area === "identity" && instructions.trim())
      matches.unshift({
        content: instructions,
        confidence: 1,
        review_status: "approved",
        synthetic: true,
      });
    if (area === "learning")
      return [
        ...new Map(
          [...matches, ...nodes.filter((node) => node.origin === "ai")].map(
            (node) => [node.id || "rules", node],
          ),
        ).values(),
      ];
    return matches;
  }
  function maturity(nodes) {
    if (!nodes.length) return 0;
    const chars = nodes.reduce(
      (sum, node) => sum + String(node.content || "").length,
      0,
    );
    const confidence =
      nodes.reduce((sum, node) => sum + Number(node.confidence || 0.5), 0) /
      nodes.length;
    const reviewed =
      nodes.filter((node) => node.review_status === "approved").length /
      nodes.length;
    return Math.min(
      100,
      Math.round(
        Math.min(55, nodes.length * 9) +
          Math.min(20, chars / 500) +
          confidence * 15 +
          reviewed * 10,
      ),
    );
  }
  function scores(nucleus) {
    const nodes =
      window.compactBrainNodes?.(nucleus.nodes) || nucleus.nodes || [];
    const latest =
      nodes
        .map((node) => node.created_at || "")
        .sort()
        .at(-1) || "";
    const before = nodes.filter((node) => (node.created_at || "") !== latest);
    return Object.fromEntries(
      areas.map((area) => {
        const current = relevant(area.id, nodes, nucleus.instructions || "");
        const previous = relevant(area.id, before, nucleus.instructions || "");
        const score = maturity(current);
        return [
          area.id,
          {
            score,
            delta: Math.max(0, score - maturity(previous)),
            nodes: current,
            reviewed: current.filter(
              (node) => node.review_status === "approved",
            ).length,
          },
        ];
      }),
    );
  }
  function suggestion(area, metric) {
    if (!metric.nodes.length)
      return `Adicione regras ou conteúdos específicos sobre ${area.name.toLowerCase()}.`;
    if (metric.reviewed < metric.nodes.length)
      return "Revise os conhecimentos pendentes para aumentar a confiabilidade desta área.";
    if (metric.score < 70)
      return "Acrescente exemplos reais, exceções e decisões tomadas em atendimentos.";
    return "Área consistente. Continue alimentando com feedbacks e casos reais revisados.";
  }
  function showDetail(areaId, metrics) {
    selectedArea = areaId;
    const area = areas.find((item) => item.id === areaId),
      metric = metrics[areaId];
    $("brainMapDetail").innerHTML =
      `<span class="eyebrow">ÁREA SELECIONADA</span><div class="brain-area-title"><i style="background:${area.color}"></i><h3>${area.name}</h3></div><div class="brain-area-score"><strong>${metric.score}%</strong><span>Maturidade atual</span></div><div class="brain-area-delta ${metric.delta ? "positive" : ""}">${metric.delta ? `+${metric.delta}%` : "Sem mudança"}<small> desde o último aprendizado</small></div><dl><div><dt>Evidências</dt><dd>${metric.nodes.length}</dd></div><div><dt>Revisadas</dt><dd>${metric.reviewed}</dd></div></dl><p>${suggestion(area, metric)}</p>`;
    document
      .querySelectorAll(".brain-region")
      .forEach((region) =>
        region.classList.toggle("selected", region.dataset.area === areaId),
      );
  }
  function render(nucleus) {
    currentNucleus = nucleus;
    const metrics = scores(nucleus);
    const positions = [
      [18, 36],
      [36, 22],
      [54, 19],
      [69, 27],
      [46, 43],
      [31, 62],
      [44, 70],
      [59, 62],
      [72, 53],
      [84, 43],
    ];
    $("brainMapVisual").innerHTML =
      `<div class="brain-svg-source"><img src="/assets/brain-lateral-public-domain.svg" alt="Cérebro humano em vista lateral">${areas.map((area, index) => `<button class="brain-region brain-hotspot${selectedArea === area.id ? " selected" : ""}" data-area="${area.id}" style="--area-color:${area.color};left:${positions[index][0]}%;top:${positions[index][1]}%" aria-label="${area.name}: ${metrics[area.id].score}%"><span>${metrics[area.id].score}%</span><small>${area.short}</small></button>`).join("")}</div>`;
    document.querySelectorAll(".brain-region").forEach((region) => {
      const select = () => showDetail(region.dataset.area, metrics);
      region.onclick = select;
      region.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") select();
      };
    });
    showDetail(selectedArea, metrics);
  }
  function setView(view) {
    const brain = view === "brain";
    $("graphViewPane").hidden = brain;
    $("brainViewPane").hidden = !brain;
    $("graphViewPane").classList.toggle("active", !brain);
    $("brainViewPane").classList.toggle("active", brain);
    $("showGraphView").classList.toggle("active", !brain);
    $("showBrainView").classList.toggle("active", brain);
    $("showGraphView").setAttribute("aria-selected", String(!brain));
    $("showBrainView").setAttribute("aria-selected", String(brain));
    localStorage.setItem("hurtzBrainView", view);
    if (brain && currentNucleus) render(currentNucleus);
    if (!brain && currentNucleus) window.HurtzGraph?.render(currentNucleus);
  }
  window.HurtzBrainMap = { render, setView };
  addEventListener("DOMContentLoaded", () => {
    $("showGraphView").onclick = () => setView("graph");
    $("showBrainView").onclick = () => setView("brain");
    setView(
      localStorage.getItem("hurtzBrainView") === "brain" ? "brain" : "graph",
    );
  });
})();
