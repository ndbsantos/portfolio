(function () {
  const DATA_URL = "/data/projects.json";

  async function loadProjects() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Não foi possível carregar projects.json");
    const raw = await res.json();
    const data = Array.isArray(raw) ? raw : raw.projects || [];
    // normalize
    return data
      .map((p) => ({
        year: p["Year"] ?? p.year,
        name: p["ProjectClient"] ?? p["Project / Client"] ?? p.name,
        technologies: p["Technologies"] ?? p.technologies,
        outcome: p["Outcome"] ?? p.outcome,
        role: p["Role"] ?? p.role,
        sector: p["Sector"] ?? p.sector,
        notes: p["Notes"] ?? p.notes,
        scale: p["Scale"] ?? p.scale,
        slug:
          p.slug ||
          slugify(p["ProjectClient"] ?? p["Project / Client"] ?? p.name || ""),
      }))
      .sort((a, b) => (b.year || 0) - (a.year || 0));
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

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function badge(text) {
    return `<span class="badge">${esc(text)}</span>`;
  }

  function projectCard(p) {
    const tech = (p.technologies ? String(p.technologies).split(/,\s*/) : [])
      .slice(0, 6)
      .filter(Boolean);

    return `
      <article class="card">
        <div class="project">
          <div>
            <div class="year">${esc(p.year)}</div>
            <h3 class="name">${esc(p.name)}</h3>
            <div class="meta">
              ${p.sector ? badge(p.sector) : ""}
              ${p.role ? badge(p.role) : ""}
            </div>
          </div>
        </div>
        ${p.outcome ? `<p class="outcome">${esc(p.outcome)}</p>` : ""}
        ${tech.length ? `<div class="meta">${tech.map(badge).join("")}</div>` : ""}
        <p style="margin-top:14px"><a href="project.html?slug=${encodeURIComponent(
          p.slug
        )}">Ver detalhe →</a></p>
      </article>
    `;
  }

  async function renderLatest(containerId, n) {
    const el = document.getElementById(containerId);
    if (!el) return;
    try {
      const projects = await loadProjects();
      el.innerHTML = projects.slice(0, n || 6).map(projectCard).join("");
    } catch (e) {
      el.innerHTML = `<div class="card"><p class="muted">Erro a carregar projetos.</p></div>`;
      console.error(e);
    }
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

  async function initProjectsPage() {
    const q = document.getElementById("q");
    const year = document.getElementById("year");
    const sector = document.getElementById("sector");
    const role = document.getElementById("role");
    const clear = document.getElementById("clear");
    const list = document.getElementById("list");
    const count = document.getElementById("count");

    const projects = await loadProjects();

    const years = unique(projects.map((p) => String(p.year))).sort(
      (a, b) => Number(b) - Number(a)
    );
    const sectors = unique(projects.map((p) => p.sector));
    const roles = unique(projects.map((p) => p.role));

    fillSelect(year, years, "Ano (todos)");
    fillSelect(sector, sectors, "Setor (todos)");
    fillSelect(role, roles, "Função (todas)");

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
          const blob = `${p.year} ${p.name} ${p.technologies || ""} ${
            p.outcome || ""
          } ${p.sector || ""} ${p.role || ""}`.toLowerCase();
          if (!blob.includes(term)) return false;
        }
        return true;
      });

      list.innerHTML =
        filtered.map(projectCard).join("") ||
        `<div class="card"><p class="muted">Sem resultados.</p></div>`;
      count.textContent = `${filtered.length} projeto(s)`;
    }

    q.addEventListener("input", apply);
    [year, sector, role].forEach((el) => el.addEventListener("change", apply));

    clear.addEventListener("click", () => {
      q.value = "";
      year.value = "";
      sector.value = "";
      role.value = "";
      apply();
    });

    apply();
  }

  async function initProjectDetail() {
    const titleEl = document.getElementById("title");
    const metaEl = document.getElementById("meta");
    const techEl = document.getElementById("tech");
    const outEl = document.getElementById("outcome");
    const notesEl = document.getElementById("notes");

    const params = new URLSearchParams(location.search);
    const slug = params.get("slug");
    const projects = await loadProjects();
    const p = projects.find((x) => x.slug === slug) || projects[0];

    if (!p) {
      titleEl.textContent = "Projeto não encontrado";
      return;
    }

    document.title = `${p.name} — Nelson Santos`;
    titleEl.textContent = p.name;

    const metaBits = [p.year, p.sector, p.role].filter(Boolean);
    metaEl.innerHTML = metaBits.map(badge).join("");

    const tech = (p.technologies ? String(p.technologies).split(/,\s*/) : [])
      .filter(Boolean);
    techEl.innerHTML =
      tech.map(badge).join("") || '<span class="muted">(não especificado)</span>';

    outEl.textContent = p.outcome || "";
    notesEl.textContent = p.notes || p.scale || "";

    if (!notesEl.textContent) {
      notesEl.innerHTML = '<span class="muted">(sem notas adicionais)</span>';
    }
  }

  window.Portfolio = {
    renderLatest,
    initProjectsPage,
    initProjectDetail,
  };
})();
