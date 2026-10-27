// data.js – loads and normalizes the taxonomy dataset.
//
// Single source of truth is taxonomy.json. taxonomy.csv is a flat export
// kept in sync for users who prefer spreadsheets; it is NOT read by the site.
//
// Expected taxonomy.json shape (see README.md "Data schema"):
// {
//   "title":   string,
//   "source":  string,
//   "version": string,
//   "groups":  [ { "name": string, "paper_section": string,
//                  "methods": number, "review_studies": number } ],
//   "methods": [
//     {
//       "id":             string   (unique, kebab-case),
//       "name":           string,
//       "group":          string   (one of groups[].name),
//       "category":       string,
//       "subcategory":    string   (optional),
//       "description":    string,
//       "tags":           string[] (optional),
//       "references":     [ { "text": string, "url": string (optional) } ],
//       "review_studies": string[] (included studies that employ the method),
//       "paper_section":  string   (section of the paper),
//       "paper_table":    number   (table of the paper listing the method),
//       "previous_code":  string   (sub-category code in dataset v1.1.0)
//     }
//   ]
// }

const DEFAULT_URL = "./taxonomy.json";

export async function loadTaxonomy(url = DEFAULT_URL) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (HTTP ${res.status})`);
  }

  const raw = await res.json();
  const methods = Array.isArray(raw.methods) ? raw.methods : [];

  // Normalize so the UI can rely on a stable shape.
  const normalized = methods.map((m, i) => ({
    id: m.id || `method-${i}`,
    name: m.name || "(unnamed method)",
    group: m.group || "Ungrouped",
    category: m.category || "Uncategorized",
    subcategory: m.subcategory || "",
    description: m.description || "",
    tags: Array.isArray(m.tags) ? m.tags : [],
    references: Array.isArray(m.references) ? m.references : [],
    reviewStudies: Array.isArray(m.review_studies) ? m.review_studies : [],
    paperSection: m.paper_section || "",
    paperTable: Number.isFinite(m.paper_table) ? m.paper_table : null,
  }));

  return {
    meta: {
      title: raw.title || "Faithfulness Evaluation Methods in Imaging XAI",
      source: raw.source || "",
      version: raw.version || "",
      groups: Array.isArray(raw.groups) ? raw.groups : [],
    },
    methods: normalized,
  };
}

// Groups in the order declared in taxonomy.json (falls back to first appearance).
export function groupsOf(methods, declared = []) {
  const seen = declared.map((g) => g.name);
  for (const m of methods) if (!seen.includes(m.group)) seen.push(m.group);
  return seen.filter((g) => methods.some((m) => m.group === g));
}

// Categories in paper order (lowest table number first).
export function categoriesOf(methods) {
  const first = new Map();
  for (const m of methods) {
    const t = m.paperTable ?? Number.MAX_SAFE_INTEGER;
    if (!first.has(m.category) || t < first.get(m.category)) {
      first.set(m.category, t);
    }
  }
  return [...first.entries()].sort((a, b) => a[1] - b[1]).map(([c]) => c);
}
