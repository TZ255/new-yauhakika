import './config/env.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import helmet from 'helmet';
import expressLayouts from 'express-ejs-layouts';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import flash from 'connect-flash';
import router from './routes/index.js';
import { connectDB } from './config/db.js';
import { SITE, NAV_ITEMS } from './config/site.js';
import { pageMeta } from './utils/meta.js';
import './config/passport.js';

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

// Parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Sessions (7 days)
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: 'sessions',
  ttl: 60 * 60 * 24 * 7,
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'mikeka-session-secret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    rolling: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Static assets
app.use(express.static(path.join(__dirname, '../public')));

// Global locals
app.use((req, res, next) => {
  res.locals.site = SITE;
  res.locals.navItems = NAV_ITEMS;
  res.locals.currentPath = req.path;
  res.locals.user = req.user;
  const hasFlash = req.session && req.session.flash;
  res.locals.flash = hasFlash && typeof req.flash === 'function' ? req.flash() : {};
  next();
});

// Routes
app.use('/', router);

// 404 handler
app.use((req, res) => {
  if (!res.headersSent && req.accepts('html')) {
    const meta = pageMeta({
      title: 'Ukurasa haujapatikana',
      description: 'Samahani, ukurasa unaotafuta haupo.',
      path: req.originalUrl || '/',
    });
    return res.status(404).render('pages/404', { activeId: null, meta });
  }

  return res.status(404).json({ message: 'Not found' });
});

export default app;
