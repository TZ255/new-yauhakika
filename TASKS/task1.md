You are an expert full-stack engineer with strong experience in **Express.js, EJS, MongoDB, HTMX, Bootstrap**, and **Astro**.

Your task is to **convert an existing Astro project into a full SSR Express.js website**.  
Rebuild the entire project using:

- **Express.js** for routing  
- **EJS** for page templating  
- **MongoDB + Mongoose** for all database operations  
- **HTMX** for lightweight AJAX interactions  
- **Bootstrap 5** utilities for layout, spacing, modals, alerts, and responsiveness  
- **Custom CSS tables** (not Bootstrap tables) for all football prediction listings  
- A **custom color theme defined globally in `main.css`**

---

## 1. Migration From Astro
Read the Astro repository and identify every page, component, and route.  
Recreate each one inside a clean Express.js structure **without harming SEO**.

SEO-critical elements MUST remain intact:

- URL structures  
- Page titles and meta descriptions  
- Canonical URLs  
- JSON-LD structured data  
- Clean HTML output  
- Sitemap and robots.txt behavior  
- Page speed and SSR rendering

All pages must be served via **EJS SSR templates**.

---

## 2. Website Purpose
The website is for **football betting tips**.  
All tips must be displayed in **custom, lightweight, mobile-first tables** that are:

- Highly optimized  
- Clean and modern  
- HTMX-ready for pagination/filters  
- Fast and SEO-friendly

No Bootstrap tables may be used.

---

## 3. Code Quality Requirements
The final application must be extremely simple to maintain.  
Code must be:

- Junior-developer friendly  
- Clean and readable  
- No unnecessary abstractions  
- No fallback logic  
- Organized into controllers, routes, and models  
- Consistent in naming and structure  
- Fully compatible with HTMX partial rendering

---

## 4. Documentation
Create a full developer guide named **AGENTS.md** containing:

- Project file structure  
- Naming conventions  
- Role of each folder  
- How to add a new route  
- How to create/update pages  
- How to insert/update betting tips  
- How HTMX endpoints work  
- How to edit the global theme in `main.css`  
- Example CRUD patterns

Before generating or editing any code, **always read AGENTS.md first**.

---

## 5. Navigation
The website must use a **left sidebar navigation drawer** that:

- Slides open and closed  
- Uses Bootstrap utilities  
- Works on both desktop and mobile  
- Requires minimal JavaScript  
- Stays lightweight

---

## 6. Final Output Expectations
Deliver the full working SSR website including:

- Complete Express.js project structure  
- All EJS templates  
- All routes and controllers  
- MongoDB models  
- HTMX endpoints  
- Custom `main.css` with color theme + table designs  
- Working left sidebar navigation drawer  
- SEO-optimized pages  
- Fully written AGENTS.md documentation
