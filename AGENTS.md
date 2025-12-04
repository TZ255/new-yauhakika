# AGENTS GUIDE (READ ME BEFORE CHANGING CODE)

This project is a pure Express + EJS SSR stack (no Astro). MongoDB is used for live tips via the provided models; blog posts are Markdown files parsed with gray-matter + marked.

## File Structure
- `server/` – Express app code.
  - `app.js` – Express init, middleware, static files, layout config.
  - `config/` – `db.js` (Mongo connection), `site.js` (site constants, nav items, static URLs).
  - `controllers/` – Route handlers: `pageController` (static + tips pages), `blogController`, `tipsController`, `seoController` (RSS + sitemap).
  - `models/` – Provided Mongoose schemas under `server/models/` (btts, fametips, over15db, correctScoreModel) already match the production databases.
  - `routes/` – Route maps for pages, blog, sitemap/rss.
  - `utils/` – Helpers like `slugify.js`, `meta.js`, `blog.js` (filesystem blog loader).
  - `views/` – EJS templates (`layouts`, `pages`, `partials`, `blocks`).
- `content/blog/` – Markdown blog posts with frontmatter.
- `public/` – Static assets (images, css, js). `public/css/main.css` defines the global color theme and custom tables. `public/js/sidebar.js` handles the drawer toggle; `public/js/tip-toggle.js` swaps day tabs client-side.
- `server.js` – Entry point that boots the HTTP server.

## Naming Conventions
- Routes live in `server/routes` and call a controller with the same intent (e.g., `/blog` → `blogController`).
- Views are lowercase with hyphens when multi-word (e.g., `blog-detail.ejs`).
- Tips categories: `mega` (home/acca), `over15`, `btts`, `ht15`. Days: `jana`, `leo`, `kesho`.
- Blog posts live in `content/blog/*.md` with frontmatter fields: `title`, `description`, `pubDate` (ISO), `updatedDate` (ISO, optional), `heroImage`, `badge`, `tags`, `slug` (optional – auto slugified if missing).

## Adding a New Route
1. Create or reuse a controller function under `server/controllers`.
2. Register the path in an existing router or a new file in `server/routes`, then mount it in `server/routes/index.js`.
3. Add an EJS view in `server/views/pages` and render it from the controller with a `meta` object from `pageMeta()`.
4. If the page should appear in the sidebar, add an entry to `NAV_ITEMS` in `server/config/site.js`.

## Creating/Updating Pages
- Use `server/views/layouts/main.ejs` for shared head/foot; include partials (`sidebar`, `topbar`, `footer`).
- Pass `meta` (title, description, canonical path) from controllers to preserve SEO.
- Keep tables custom: do not swap them for Bootstrap tables. Use `.tip-table` styling from `main.css`.

## Inserting/Updating Betting Tips
- Live tips come from Mongo via the provided models (`btts`, `fametips`, `over15db`, `correctScoreModel`).
- `tipsController` groups them server-side for `jana`, `leo`, `kesho`; rendering is fully SSR (no HTMX).
- If you add a new tips category, mirror the pattern in `tipsController.js` and wire it in `pageController`.

## Blog Content
- Drop Markdown files into `content/blog/` with the frontmatter noted above; slugs auto-generate if missing.
- Rendering uses `utils/blog.js` (gray-matter + marked) and is SSR-only.

## Theme Editing (`public/css/main.css`)
- Global colors set at the top via CSS variables (`--accent`, `--bg-panel`, etc.).
- Sidebar, drawer motion, and `.tip-table` styling live here. Update these vars to reskin the site.
- Do not convert custom tables to Bootstrap; keep grid-based `.tip-table` rows.

Always read this file before editing to keep routing, styling, and SSR behaviors consistent.
