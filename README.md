# xai-faithfulness-taxonomy

Interactive taxonomy of faithfulness evaluation methods in imaging explainable
AI (XAI) — companion site to **Lamprou et al. (2026)**.

> ⚠️ **Data status:** this site currently ships with an **empty dataset**
> (`taxonomy.json` has `"methods": []`). The 68 methods and the full
> bibliographic reference for Lamprou et al. (2026) are to be supplied by the
> maintainer. Until then the live site shows a "no data loaded yet"
> placeholder. None of the taxonomy content has been auto-generated.

It is a plain static site (HTML/CSS/JS, no build step) deployed via GitHub
Pages.

## Project layout

| File | Purpose |
|------|---------|
| `index.html` | Page shell, search/filter controls, empty/error states |
| `styles.css` | Styling |
| `data.js` | Loads & normalizes `taxonomy.json` (ES module) |
| `app.js` | Renders cards, search, category filter (ES module) |
| `taxonomy.json` | **Canonical dataset** consumed by the site |
| `taxonomy.csv` | Flat export for spreadsheet users (kept in sync manually; not read by the site) |
| `.github/workflows/pages.yml` | GitHub Actions workflow that deploys the site to Pages |

## Data schema

`taxonomy.json`:

```json
{
  "title": "Faithfulness Evaluation Methods in Imaging XAI",
  "source": "Companion site to Lamprou et al. (2026).",
  "version": "0.1.0",
  "methods": [
    {
      "id": "kebab-case-unique-id",
      "name": "Method name",
      "category": "Top-level category",
      "subcategory": "Optional finer grouping",
      "description": "One- or two-sentence summary.",
      "tags": ["optional", "keywords"],
      "references": [
        { "text": "Author et al. (Year), Venue", "url": "https://doi.org/..." }
      ]
    }
  ]
}
```

Field notes:

- `id`, `name`, `category`, `description` are expected on every entry.
- `subcategory`, `tags`, `references` are optional (`references[].url` is
  optional within a reference).
- Categories shown on the site are derived automatically from each method's
  `category` value — no separate category list to maintain.

To add the real data, replace the empty `methods: []` array with the 68
entries and (optionally) regenerate `taxonomy.csv` with the same rows.

## Local preview

The site uses `fetch()` to load `taxonomy.json`, which browsers block when a
page is opened directly from disk (`file://`). Serve the folder over HTTP:

```bash
# from the project root
python -m http.server 8000
# then open http://localhost:8000
```

In PyCharm you can also right-click `index.html` → **Open in Browser**, which
uses the IDE's built-in web server (HTTP) and works the same way.

## Deployment

Pushing to `main` triggers `.github/workflows/pages.yml`, which uploads the
repository root as a Pages artifact and deploys it. The repository must have
Pages configured with **GitHub Actions** as the source (Settings → Pages →
Source: *GitHub Actions*).

Once deployed, the site is available at:

```
https://nasskall.github.io/xai-faithfulness-taxonomy/
```

## License

Code is released under the [MIT License](./LICENSE). Update the copyright
holder in `LICENSE` if it should credit the paper's authors or institution
rather than the repository maintainer. Note that the MIT license covers the
**site code**; licensing of the taxonomy/research content should follow the
terms of Lamprou et al. (2026).
