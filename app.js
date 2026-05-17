// app.js — renders the interactive taxonomy and wires up search/filter.

import { loadTaxonomy, categoriesOf } from "./data.js";

const els = {
  search: document.getElementById("search"),
  categoryFilter: document.getElementById("category-filter"),
  count: document.getElementById("count"),
  results: document.getElementById("results"),
  empty: document.getElementById("empty-state"),
  error: document.getElementById("error-state"),
  errorDetail: document.getElementById("error-detail"),
  overview: document.getElementById("overview"),
  categoryChart: document.getElementById("category-chart"),
};

let allMethods = [];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function matches(method, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    method.name.toLowerCase().includes(q) ||
    method.description.toLowerCase().includes(q) ||
    method.category.toLowerCase().includes(q) ||
    method.subcategory.toLowerCase().includes(q) ||
    method.tags.some((t) => t.toLowerCase().includes(q))
  );
}

function cardHtml(m) {
  const tags = m.tags.length
    ? `<div class="tags">${m.tags
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
        .join("")}</div>`
    : "";

  const refs = m.references.length
    ? `<ul class="refs">${m.references
        .map((r) => {
          const text = escapeHtml(r.text || r.url || "reference");
          return r.url
            ? `<li><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${text}</a></li>`
            : `<li>${text}</li>`;
        })
        .join("")}</ul>`
    : "";

  const sub = m.subcategory
    ? ` <span class="tag">${escapeHtml(m.subcategory)}</span>`
    : "";

  return `<article class="card">
    <h3>${escapeHtml(m.name)}${sub}</h3>
    <p>${escapeHtml(m.description)}</p>
    ${tags}
    ${refs}
  </article>`;
}

function render() {
  const query = els.search.value.trim();
  const category = els.categoryFilter.value;

  const visible = allMethods.filter(
    (m) => (!category || m.category === category) && matches(m, query)
  );

  els.count.textContent = `${visible.length} of ${allMethods.length} method${
    allMethods.length === 1 ? "" : "s"
  }`;

  const byCategory = new Map();
  for (const m of visible) {
    if (!byCategory.has(m.category)) byCategory.set(m.category, []);
    byCategory.get(m.category).push(m);
  }

  const groups = [...byCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  els.results.innerHTML = groups
    .map(
      ([cat, methods]) => `<div class="category-group">
        <h2>${escapeHtml(cat)} <span class="count">(${methods.length})</span></h2>
        <div class="cards">${methods.map(cardHtml).join("")}</div>
      </div>`
    )
    .join("");

  if (visible.length === 0 && allMethods.length > 0) {
    els.results.innerHTML = `<p class="hint">No methods match the current filters.</p>`;
  }
}

function renderCategoryChart(methods) {
  const counts = new Map();
  for (const m of methods) {
    counts.set(m.category, (counts.get(m.category) || 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(...rows.map(([, n]) => n), 1);

  const W = 600;
  const rowH = 44;
  const gap = 12;
  const pad = 8;
  const left = 60; // gutter for the roman-numeral label
  const right = 44; // room for the value text
  const barMax = W - left - right;
  const H = pad * 2 + rows.length * rowH + (rows.length - 1) * gap;

  const bars = rows
    .map(([cat, n], i) => {
      const y = pad + i * (rowH + gap);
      const cy = y + rowH / 2;
      const w = Math.max((n / max) * barMax, 2);
      const short = escapeHtml(cat.split(" ")[0]);
      return `<g class="bar-row">
        <title>${escapeHtml(cat)}: ${n} methods</title>
        <text class="bar-label" x="0" y="${cy}" dominant-baseline="middle">${short}</text>
        <rect class="bar" x="${left}" y="${y}" width="${w.toFixed(1)}" height="${rowH}" rx="5"></rect>
        <text class="bar-value" x="${(left + w + 6).toFixed(1)}" y="${cy}" dominant-baseline="middle">${n}</text>
      </g>`;
    })
    .join("");

  const summary = rows
    .map(([c, n]) => `${c.split(" ")[0]}=${n}`)
    .join(", ");

  els.categoryChart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMinYMin meet" role="img" aria-label="Methods per category — ${summary} (total ${methods.length})">${bars}</svg>`;
}

function populateCategoryFilter(methods) {
  for (const cat of categoriesOf(methods)) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    els.categoryFilter.appendChild(opt);
  }
}

async function init() {
  try {
    const { methods } = await loadTaxonomy();
    allMethods = methods;

    if (allMethods.length === 0) {
      els.empty.hidden = false;
      els.count.textContent = "0 methods";
      return;
    }

    renderCategoryChart(allMethods);
    els.overview.hidden = false;
    populateCategoryFilter(allMethods);
    els.search.addEventListener("input", render);
    els.categoryFilter.addEventListener("change", render);
    render();
  } catch (err) {
    els.error.hidden = false;
    els.errorDetail.textContent = err.message;
    els.count.textContent = "";
    // eslint-disable-next-line no-console
    console.error(err);
  }
}

init();
