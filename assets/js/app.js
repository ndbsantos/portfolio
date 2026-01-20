(function () {
  const DATA_URL = "/data/projects.json";

  // Optional per-page labels (for EN pages). If not present, defaults to PT.
  const L = (window.PORTFOLIO_LABELS || {
    viewDetail: "Ver detalhe →",
    loadError: "Erro a carregar projetos.",
    noResults: "Sem resultados.",
    notSpecified: "(não especificado)",
    noNotes: "(sem notas adicionais)",
    relatedNone: "Sem projetos relacionados.",
    countSuffix: " projeto(s)",
    yearAll: "Ano (todos)",
    sectorAll: "Setor (todos)",
    roleAll: "Função (todas)",
  });

  async function loadProjects() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Não foi possível carregar projects.json");

    const raw = await res.json();
    const data = Array.isArray(raw) ? raw : (raw.projects || []);

    const projects = data.map((p) => {
      const year = p["Year"] ?? p.year ?? "";
      const name = p["ProjectClient"] ?? p["Project / Client"] ?? p.name ?? "";
      const technologies = p["Technologies"] ?? p.technologies ?? "";
      const outcome = p["Outcome"] ?? p.outcome ?? "";
      const role = p["Role"] ?? p.role ?? "";
      const sector = p["Sector"] ?? p.sector ?? "";
      const notes = p["Notes"] ?? p.notes ?? "";
      const scale = p["Scale"] ?? p.scale ?? "";
      const slug = p.slug || slugify(name);

      return { year, name, technologies, outcome, role, sector, notes, scale, slug };
    });

    projects.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
    return projects;
  }

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80);
  }

  function unique(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "pt-PT")
    );
  }

  function fillSelect(sel, items, placeholder) {
    sel.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    sel.appendChild(opt0);

    for (const it of items) {
      const o = document.createElement("option");
      o.value = it;
      o.textContent = it;
      sel.appendChild(o);
    }
  }

  function makeBadge(text) {
    const span = document.createElement("span");
    span.className = "badge";
    span.textContent = text;
    return span;
  }

  function makeCard(p) {
    const article = document.createElement("article");
    article.className = "card";

    const project = document.createElement("div");
    project.className = "project";

    const left = document.createElement("div");

    const yearEl = document.createElement("div");
    yearEl.className = "year";
    yearEl.textContent = String(p.year || "");
    left.appendChild(yearEl);

    const nameEl = document.createElement("h3");
    nameEl.className = "name";
    nameEl.textContent = p.name || "";
    left.appendChild(nameEl);

    const metaTop = document.createElement("div");
    metaTop.className = "meta";
    if (p.sector) metaTop.appendChild(makeBadge(p.sector));
    if (p.role) metaTop.appendChild(makeBadge(p.role));
    left.appendChild(metaTop);

    project.appendChild(left);
    article.appendChild(project);

    if (p.outcome) {
      const out = document.createElement("p");
      out.className = "outcome";
      out.textContent = p.outcome;
      article.appendChild(out);
    }

    const techList = String(p.technologies || "")
      .split(/,\s*/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (techList.length) {
      const metaTech = document.createElement("div");
      metaTech.className = "meta";
      for (const t of techList) metaTech.appendChild(makeBadge(t));
      article.appendChild(metaTech);
    }

    const linkP = document.createElement("p");
    linkP.style.marginTop = "14px";
    const a = document.createElement("a");
    a.href = "project.html?slug=" + encodeURIComponent(p.slug || "");
    a.textContent = L.viewDetail;
    linkP.appendChild(a);
    article.appendChild(linkP);

    return article;
  }

  async function renderLatest(containerId, n) {
    const el = document.getElementById(containerId);
    if (!el) return;

    try {
      const projects = await loadProjects();
      el.innerHTML = "";
      for (const p of projects.slice(0, n || 6)) {
        el.appendChild(makeCard(p));
      }
    } catch (e) {
      el.innerHTML = "";
      const card = document.createElement("div");
      card.className = "card";
      const msg = document.createElement("p");
      msg.className = "muted";
      msg.textContent = L.loadError;
      card.appendChild(msg);
      el.appendChild(card);
      console.error(e);
    }
  }

  async function initProjectsPage() {
    const q = document.getElementById("q");
    const year = document.getElementById("year");
    const sector = document.getElementById("sector");
    const role = document.getElementById("role");
    const clear = document.getElementById("clear");
    const list = document.getElementById("list");
    const count = document.getElementById("count");

    const projects = await loadProjects();

    const years = unique(projects.map((p) => String(p.year || "")))
      .filter(Boolean)
      .sort((a, b) => Number(b) - Number(a));
    const sectors = unique(projects.map((p) => p.sector));
    const roles = unique(projects.map((p) => p.role));

    fillSelect(year, years, L.yearAll);
    fillSelect(sector, sectors, L.sectorAll);
    fillSelect(role, roles, L.roleAll);

    function apply() {
      const term = (q.value || "").trim().toLowerCase();
      const y = year.value;
      const s = sector.value;
      const r = role.value;

      const filtered = projects.filter((p) => {
        if (y && String(p.year) !== y) return false;
        if (s && p.sector !== s) return false;
        if (r && p.role !== r) return false;

        if (term) {
          const blob =
            (p.year || "") +
            " " +
            (p.name || "") +
            " " +
            (p.technologies || "") +
            " " +
            (p.outcome || "") +
            " " +
            (p.sector || "") +
            " " +
            (p.role || "");
          if (!blob.toLowerCase().includes(term)) return false;
        }
        return true;
      });

      list.innerHTML = "";
      if (!filtered.length) {
        const card = document.createElement("div");
        card.className = "card";
        const msg = document.createElement("p");
        msg.className = "muted";
        msg.textContent = L.noResults;
        card.appendChild(msg);
        list.appendChild(card);
      } else {
        for (const p of filtered) list.appendChild(makeCard(p));
      }

      if (count) count.textContent = filtered.length + L.countSuffix;
    }

    if (q) q.addEventListener("input", apply);
    if (year) year.addEventListener("change", apply);
    if (sector) sector.addEventListener("change", apply);
    if (role) role.addEventListener("change", apply);

    if (clear) {
      clear.addEventListener("click", () => {
        if (q) q.value = "";
        if (year) year.value = "";
        if (sector) sector.value = "";
        if (role) role.value = "";
        apply();
      });
    }

    apply();
  }

  async function initProjectDetail() {
    const titleEl = document.getElementById("title");
    const metaEl = document.getElementById("meta");
    const techEl = document.getElementById("tech");
    const outEl = document.getElementById("outcome");
    const notesEl = document.getElementById("notes");
    const relatedEl = document.getElementById("related");

    const params = new URLSearchParams(location.search);
    const slug = params.get("slug");

    const projects = await loadProjects();
    const p = projects.find((x) => x.slug === slug) || projects[0];

    if (!p) {
      if (titleEl) titleEl.textContent = "Projeto não encontrado";
      return;
    }

    document.title = (p.name || "Projeto") + " — Nelson Santos";
    if (titleEl) titleEl.textContent = p.name || "";

    if (metaEl) {
      metaEl.innerHTML = "";
      [p.year, p.sector, p.role].filter(Boolean).forEach((x) => {
        metaEl.appendChild(makeBadge(String(x)));
      });
    }

    if (techEl) {
      techEl.innerHTML = "";
      const tech = String(p.technologies || "")
        .split(/,\s*/)
        .map((x) => x.trim())
        .filter(Boolean);

      if (!tech.length) {
        const span = document.createElement("span");
        span.className = "muted";
        span.textContent = L.notSpecified;
        techEl.appendChild(span);
      } else {
        tech.forEach((t) => techEl.appendChild(makeBadge(t)));
      }
    }

    if (outEl) outEl.textContent = p.outcome || "";

    if (notesEl) {
      const txt = p.notes || p.scale || "";
      if (txt) {
        notesEl.textContent = txt;
      } else {
        notesEl.innerHTML = "";
        const span = document.createElement("span");
        span.className = "muted";
        span.textContent = L.noNotes;
        notesEl.appendChild(span);
      }
    }

    // ----- Outros projetos (relacionados) -----
    if (relatedEl) {
      const currentSlug = p.slug;

      const currentTech = new Set(
        String(p.technologies || "")
          .split(/,\s*/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      );

      function scoreProject(x) {
        if (!x || x.slug === currentSlug) return -1;

        let score = 0;

        if (p.sector && x.sector && x.sector === p.sector) score += 50;
        if (p.role && x.role && x.role === p.role) score += 25;

        const tech = new Set(
          String(x.technologies || "")
            .split(/,\s*/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
        );

        let common = 0;
        for (const t of tech) if (currentTech.has(t)) common++;
        score += common * 8;

        const yearNum = Number(x.year) || 0;
        score += Math.min(10, Math.max(0, yearNum - 2000) / 5);

        return score;
      }

      const ranked = projects
        .filter((x) => x.slug !== currentSlug)
        .map((x) => ({ x, s: scoreProject(x) }))
        .filter((o) => o.s >= 0)
        .sort(
          (a, b) =>
            b.s - a.s || (Number(b.x.year) || 0) - (Number(a.x.year) || 0)
        )
        .slice(0, 6)
        .map((o) => o.x);

      relatedEl.innerHTML = "";

      if (!ranked.length) {
        const card = document.createElement("div");
        card.className = "card";
        const msg = document.createElement("p");
        msg.className = "muted";
        msg.textContent = L.relatedNone;
        card.appendChild(msg);
        relatedEl.appendChild(card);
      } else {
        for (const rp of ranked) relatedEl.appendChild(makeCard(rp));
      }
    }
  }

  window.Portfolio = {
    renderLatest,
    initProjectsPage,
    initProjectDetail,
  };
})();
