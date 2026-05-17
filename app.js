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
