// app.js – renders the interactive taxonomy and wires up search/filters.

import { loadTaxonomy, categoriesOf, groupsOf } from "./data.js";

const els = {
  search: document.getElementById("search"),
  groupFilter: document.getElementById("group-filter"),
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
let groupOrder = [];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// Short label for the chart: roman numeral for taxonomy categories,
// a fixed abbreviation for the two groups outside the taxonomy.
function shortLabel(category) {
  const roman = category.match(/^(I{1,3}|IV)\b/);
  if (roman) return roman[1];
  if (category.startsWith("Analytical")) return "BD-A";
  if (category.startsWith("Built-in")) return "BD-B";
  if (category.startsWith("Plausibility")) return "PA";
  return category.slice(0, 4);
}

function matches(method, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    method.name.toLowerCase().includes(q) ||
    method.description.toLowerCase().includes(q) ||
    method.group.toLowerCase().includes(q) ||
    method.category.toLowerCase().includes(q) ||
    method.subcategory.toLowerCase().includes(q) ||
    method.tags.some((t) => t.toLowerCase().includes(q)) ||
    method.reviewStudies.some((s) => s.toLowerCase().includes(q))
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

  const studies = m.reviewStudies.length
    ? `<details class="studies">
        <summary>Review studies (${m.reviewStudies.length})</summary>
        <ul>${m.reviewStudies.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      </details>`
    : "";

  const source = m.paperTable
    ? `<p class="source">Paper: Table ${m.paperTable}${
        m.paperSection ? `, Section ${escapeHtml(m.paperSection)}` : ""
      }</p>`
    : "";

  const sub = m.subcategory
    ? ` <span class="tag">${escapeHtml(m.subcategory)}</span>`
    : "";

  return `<article class="card">
    <h3>${escapeHtml(m.name)}${sub}</h3>
    <p>${escapeHtml(m.description)}</p>
    ${tags}
    ${refs}
    ${studies}
    ${source}
  </article>`;
}

function render() {
  const query = els.search.value.trim();
  const group = els.groupFilter.value;
  const category = els.categoryFilter.value;

  const visible = allMethods.filter(
    (m) =>
      (!group || m.group === group) &&
      (!category || m.category === category) &&
      matches(m, query)
  );

  els.count.textContent = `${visible.length} of ${allMethods.length} method${
    allMethods.length === 1 ? "" : "s"
  }`;

  const html = groupOrder
    .map((g) => {
      const inGroup = visible.filter((m) => m.group === g);
      if (!inGroup.length) return "";
      const cats = categoriesOf(inGroup)
        .map((cat) => {
          const methods = inGroup.filter((m) => m.category === cat);
          // Skip the category heading when it only repeats the group name.
          const heading =
            cat === g
              ? ""
              : `<h3 class="category-title">${escapeHtml(cat)} <span class="count">(${methods.length})</span></h3>`;
          return `<div class="category-group">
            ${heading}
            <div class="cards">${methods.map(cardHtml).join("")}</div>
          </div>`;
        })
        .join("");
      return `<section class="group-block">
        <h2 class="group-title">${escapeHtml(g)} <span class="count">(${inGroup.length})</span></h2>
        ${cats}
      </section>`;
    })
    .join("");

  els.results.innerHTML =
    visible.length === 0 && allMethods.length > 0
      ? `<p class="hint">No methods match the current filters.</p>`
      : html;
}

function renderCategoryChart(methods) {
  // One bar per category, ordered by group then paper order.
  const rows = [];
  for (const g of groupOrder) {
    const inGroup = methods.filter((m) => m.group === g);
    for (const cat of categoriesOf(inGroup)) {
      rows.push({
        group: g,
        cat,
        n: inGroup.filter((m) => m.category === cat).length,
      });
    }
  }
  const max = Math.max(...rows.map((r) => r.n), 1);

  const W = 600;
  const rowH = 34;
  const gap = 10;
  const pad = 8;
  const left = 64; // gutter for the short label
  const right = 44; // room for the value text
  const barMax = W - left - right;
  const H = pad * 2 + rows.length * rowH + (rows.length - 1) * gap;

  const bars = rows
    .map((r, i) => {
      const y = pad + i * (rowH + gap);
      const cy = y + rowH / 2;
      const w = Math.max((r.n / max) * barMax, 2);
      const gi = groupOrder.indexOf(r.group);
      return `<g class="bar-row">
        <title>${escapeHtml(r.group)} / ${escapeHtml(r.cat)}: ${r.n} method${r.n === 1 ? "" : "s"}</title>
        <text class="bar-label" x="0" y="${cy}" dominant-baseline="middle">${escapeHtml(shortLabel(r.cat))}</text>
        <rect class="bar bar-g${gi}" x="${left}" y="${y}" width="${w.toFixed(1)}" height="${rowH}" rx="5"></rect>
        <text class="bar-value" x="${(left + w + 6).toFixed(1)}" y="${cy}" dominant-baseline="middle">${r.n}</text>
      </g>`;
    })
    .join("");

  const summary = rows.map((r) => `${shortLabel(r.cat)}=${r.n}`).join(", ");

  const legend = groupOrder
    .map(
      (g, gi) =>
        `<li><span class="swatch bar-g${gi}"></span>${escapeHtml(g)} (${
          methods.filter((m) => m.group === g).length
        })</li>`
    )
    .join("");

  const key = `<p class="hint chart-key">I, II, III: taxonomy categories. BD-A: analytical decomposition formulas. BD-B: built-in faithfulness objective. PA: plausibility-adjacent methods.</p>`;

  els.categoryChart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMinYMin meet" role="img" aria-label="Methods per category: ${summary} (total ${methods.length})">${bars}</svg>
    <ul class="legend">${legend}</ul>${key}`;
}

function populateFilters(methods) {
  for (const g of groupOrder) {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    els.groupFilter.appendChild(opt);
  }
  for (const g of groupOrder) {
    for (const cat of categoriesOf(methods.filter((m) => m.group === g))) {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      els.categoryFilter.appendChild(opt);
    }
  }
}

async function init() {
  try {
    const { meta, methods } = await loadTaxonomy();
    allMethods = methods;
    groupOrder = groupsOf(methods, meta.groups);

    if (allMethods.length === 0) {
      els.empty.hidden = false;
      els.count.textContent = "0 methods";
      return;
    }

    renderCategoryChart(allMethods);
    els.overview.hidden = false;
    populateFilters(allMethods);
    els.search.addEventListener("input", render);
    els.groupFilter.addEventListener("change", render);
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
