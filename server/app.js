import './config/env.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import compression from 'compression';
import helmet from 'helmet';
import expressLayouts from 'express-ejs-layouts';
import router from './routes/index.js';
import { connectDB } from './config/db.js';
import { SITE, NAV_ITEMS } from './config/site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Database
connectDB().catch((err) => {
  console.error('Mongo connection error:', err.message);
});

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Security + perf
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(compression());
app.use(morgan('dev'));

// Parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static assets
app.use(express.static(path.join(__dirname, '../public')));

// Global locals
app.use((req, res, next) => {
  res.locals.site = SITE;
  res.locals.navItems = NAV_ITEMS;
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', router);

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: 'Ukurasa haujapatikana',
    description: 'Samahani, ukurasa unaotafuta haupo.',
  });
});

export default app;
