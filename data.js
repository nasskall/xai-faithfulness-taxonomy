// data.js — loads and normalizes the taxonomy dataset.
//
// Single source of truth is taxonomy.json. taxonomy.csv is a flat export
// kept in sync manually for users who prefer spreadsheets; it is NOT read
// by the site.
//
// Expected taxonomy.json shape (see README.md "Data schema"):
// {
//   "title":   string,
//   "source":  string,
//   "version": string,
//   "methods": [
//     {
//       "id":          string   (unique, kebab-case),
//       "name":        string,
//       "category":    string,
//       "subcategory": string   (optional),
//       "description": string,
//       "tags":        string[] (optional),
//       "references":  [ { "text": string, "url": string (optional) } ]
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
    category: m.category || "Uncategorized",
    subcategory: m.subcategory || "",
    description: m.description || "",
    tags: Array.isArray(m.tags) ? m.tags : [],
    references: Array.isArray(m.references) ? m.references : [],
  }));

  return {
    meta: {
      title: raw.title || "Faithfulness Evaluation Methods in Imaging XAI",
      source: raw.source || "",
      version: raw.version || "",
    },
    methods: normalized,
  };
}

export function categoriesOf(methods) {
  return [...new Set(methods.map((m) => m.category))].sort((a, b) =>
    a.localeCompare(b)
  );
}
