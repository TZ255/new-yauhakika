# AGENTS GUIDE (READ ME BEFORE CHANGING CODE)

This project is a pure Express + EJS SSR stack (no Astro). MongoDB is used for live tips via the provided models; blog posts are Markdown files parsed with gray-matter + marked.

## File Structure
- `server.js` – Single entry that bootstraps Express, middleware, sessions, and routes.
- `config/` – `env.js` (dotenv), `db.js` (Mongo connection), `site.js` (site constants/nav/static URLs), `passport.js` (local strategy).
- `routes/` – Route modules that contain their own handlers (no controllers). Includes pages, blog, auth, payments, RSS/sitemap wiring.
- `models/` – Mongoose schemas (btts, fametips, over15db, correctScoreModel, vip, user, paymentBin).
- `utils/` – Helpers like `slugify.js`, `meta.js`, `blog.js` (filesystem blog loader), `vipAccess.js`, `subscription.js`, `sendEmail.js`, and `get-tips/` (tip grouping for pages).
- `views/` – EJS templates (`layouts`, `pages`, `partials`, `blocks`).
- `content/blog/` – Markdown blog posts with frontmatter.
- `public/` – Static assets (images, css, js). `public/css/main.css` defines the global color theme and custom tables. `public/js/sidebar.js` handles the drawer toggle; `public/js/tip-toggle.js` swaps day tabs client-side.

## Naming Conventions
- Routes live in `routes` and own their handlers (e.g., `/blog` logic stays inside `routes/blog.js`).
- Views are lowercase with hyphens when multi-word (e.g., `blog-detail.ejs`).
- Tips categories: `mega` (home/acca), `over15`, `btts`, `ht15`. Days: `jana`, `leo`, `kesho`.
- Blog posts live in `content/blog/*.md` with frontmatter fields: `title`, `description`, `pubDate` (ISO), `updatedDate` (ISO, optional), `heroImage`, `badge`, `tags`, `slug` (optional – auto slugified if missing).

## Adding a New Route
1. Add a handler directly in a `routes/*.js` file (or a new file under `routes`).
2. Mount it in `routes/index.js`.
3. Add an EJS view in `views/pages` and render it with a `meta` object from `pageMeta()`.
4. If the page should appear in the sidebar, add an entry to `NAV_ITEMS` in `config/site.js`.

## Creating/Updating Pages
- Use `views/layouts/main.ejs` for shared head/foot; include partials (`sidebar`, `topbar`, `footer`).
- Pass `meta` (title, description, canonical path) from route handlers to preserve SEO.
- Keep tables custom: do not swap them for Bootstrap tables. Use `.tip-table` styling from `main.css`.

## Inserting/Updating Betting Tips
- Live tips come from Mongo via the provided models (`btts`, `fametips`, `over15db`, `correctScoreModel`).
- Tip grouping (jana/leo/kesho) happens inside `routes/pages.js` when rendering the pages.
- If you add a new tips category, mirror the pattern in `routes/pages.js`.

## Blog Content
- Drop Markdown files into `content/blog/` with the frontmatter noted above; slugs auto-generate if missing.
- Rendering uses `utils/blog.js` (gray-matter + marked) and is SSR-only.

## Theme Editing (`public/css/main.css`)
- Global colors set at the top via CSS variables (`--accent`, `--bg-panel`, etc.).
- Sidebar, drawer motion, and `.tip-table` styling live here. Update these vars to reskin the site.
- Do not convert custom tables to Bootstrap; keep grid-based `.tip-table` rows.

Always read this file before editing to keep routing, styling, and SSR behaviors consistent.
