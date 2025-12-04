# Mikeka ya Uhakika (Express SSR)

Server-side rendered Express + EJS site for football betting tips in Swahili. Live tips are pulled from MongoDB using the existing models in `server/models`, and blog posts are Markdown files parsed at runtime for SEO-friendly pages.

## Stack
- Express 4 + EJS (with express-ejs-layouts)
- MongoDB via Mongoose (models: `btts`, `fametips`, `over15db`, `correctScoreModel`)
- Bootstrap 5 utilities + custom theme in `public/css/main.css`
- gray-matter + marked for filesystem blogs

## Run locally
```bash
npm install
npm run dev   # nodemon server.js
# or npm start
```
Set `MONGO_URI` and `SITE_URL` in a `.env` file to point to your database and canonical domain.

## Content
- **Tips**: Queried server-side for `jana`, `leo`, and `kesho` in `tipsController.js` and rendered with custom tables (no Bootstrap tables, no HTMX fetching).
- **Blog posts**: Add Markdown files in `content/blog/` with frontmatter: `title`, `description`, `pubDate` (ISO), `updatedDate` (ISO, optional), `heroImage`, `badge`, `tags`, `slug` (optional, auto-generated if missing).

## Key paths
- `server/app.js` – Express setup and layout wiring
- `server/controllers/` – pages, tips, blogs, RSS/sitemap
- `server/views/` – EJS layouts/pages/partials
- `public/js/` – sidebar drawer + day-toggle scripts
- `public/css/main.css` – color theme + custom tables

## SEO
Canonical/meta tags are set in `server/views/layouts/main.ejs` using helpers in `server/utils/meta.js`. RSS and sitemap are generated from filesystem posts and static pages.
