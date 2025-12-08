import passport from 'passport';
import User from '../models/user.js';
import { pageMeta } from '../utils/meta.js';
import { sendEmail } from '../utils/sendEmail.js';
import { hashPassword } from '../utils/password.js';

const ALLOWED_DOMAINS = ['gmail.com', 'icloud.com', 'yahoo.com', 'outlook.com'];
const RESET_TTL_HOURS = 4;

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const logError = (context, err) => console.error(`[auth] ${context}:`, err);

function isAllowedEmail(email = '') {
  const domain = email.split('@')[1];
  return domain && ALLOWED_DOMAINS.includes(domain);
}

function respondAlert(req, res, { id, type = 'danger', message = '', status = 200, redirectPath }) {
  if (req.headers['hx-request']) {
    return res.status(status).render('fragments/alert', { id, type, message, layout: false });
  }

  if (req.flash && message) {
    const key = ['danger', 'error'].includes(type) ? 'danger' : type;
    req.flash(key, message);
  }

  const target = redirectPath || req.get('Referrer') || req.originalUrl || '/';
  return res.redirect(target);
}

export function showLogin(req, res) {
  if (req.isAuthenticated?.() && req.user) {
    return res.redirect('/vip');
  }
  res.render('pages/login', {
    activeId: null,
    meta: pageMeta({ title: 'Ingia | Mikeka ya Uhakika', path: '/auth/login' }),
  });
}

export function showRegister(req, res) {
  if (req.isAuthenticated?.() && req.user) {
    return res.redirect('/vip');
  }
  res.render('pages/register', {
    activeId: null,
    meta: pageMeta({ title: 'Jisajili | Mikeka ya Uhakika', path: '/auth/register' }),
  });
}

export function showReset(req, res) {
  res.render('pages/reset', {
    activeId: null,
    meta: pageMeta({ title: 'Weka Upya Nenosiri', path: '/auth/reset' }),
  });
}

export async function handleRegister(req, res, next) {
  try {
    const name = (req.body.name || '').trim();
    const emailRaw = req.body.email || '';
    const password = req.body.password || '';
    const email = normalizeEmail(emailRaw);

    if (!name || !email || !password) {
      return respondAlert(req, res, {
        id: 'register-alert',
        message: 'Tafadhali jaza taarifa zote.',
        redirectPath: '/auth/register',
      });
    }
    if (password.length < 4) {
      return respondAlert(req, res, {
        id: 'register-alert',
        message: 'Nenosiri lazima liwe na herufi 4 au zaidi.',
        redirectPath: '/auth/register',
      });
    }
    if (!isAllowedEmail(email)) {
      return respondAlert(req, res, {
        id: 'register-alert',
        message: 'Tunapokea email za Gmail, iCloud, Yahoo au Outlook pekee.',
        redirectPath: '/auth/register',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return respondAlert(req, res, {
        id: 'register-alert',
        message: 'Akaunti hii tayari imesajiliwa.',
        redirectPath: '/auth/register',
      });
    }

    const user = await User.create({ name, email, password: hashPassword(password) });

    req.login(user, (err) => {
      if (err) return next(err);
      if (req.headers['hx-request']) {
        res.set('HX-Redirect', '/vip');
        return res.render('fragments/alert', {
          id: 'register-alert',
          type: 'success',
          message: 'Usajili umekamilika, tunakuingiza...',
          layout: false,
        });
      }
      if (req.flash) req.flash('success', 'Usajili umekamilika. Karibu VIP.');
      return res.redirect('/vip');
    });
  } catch (err) {
    logError('register', err);
    return next(err);
  }
}

export function handleLogin(req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      logError('login-auth', err);
      return next(err);
    }
    if (!user) {
      return respondAlert(req, res, {
        id: 'login-alert',
        message: info?.message || 'Uthibitishaji umeshindikana. Jaribu tena.',
        redirectPath: '/auth/login',
      });
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        logError('login-session', loginErr);
        return next(loginErr);
      }
      if (req.headers['hx-request']) {
        res.set('HX-Redirect', '/vip');
        return res.render('fragments/alert', {
          id: 'login-alert',
          type: 'success',
          message: 'Umeingia kikamilifu. Tunakuelekeza...',
          layout: false,
        });
      }
      if (req.flash) req.flash('success', 'Umeingia kikamilifu.');
      return res.redirect('/vip');
    });
  })(req, res, next);
}

export function handleLogout(req, res, next) {
  req.logout?.((err) => {
    if (err) return next(err);
    if (req.headers['hx-request']) {
      res.set('HX-Redirect', '/auth/login');
      return res.send('');
    }
    if (req.flash) req.flash('success', 'Umetoka kikamilifu.');
    return res.redirect('/auth/login');
  });
}

export async function sendResetCode(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email || '');
    if (!email) {
      return respondAlert(req, res, {
        id: 'reset-request-alert',
        message: 'Weka barua pepe yako.',
        redirectPath: '/auth/reset',
      });
    }
    if (!isAllowedEmail(email)) {
      return respondAlert(req, res, {
        id: 'reset-request-alert',
        message: 'Tunapokea email za Gmail, iCloud, Yahoo au Outlook pekee.',
        redirectPath: '/auth/reset',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return respondAlert(req, res, {
        id: 'reset-request-alert',
        message: 'Email haipo. Tafadhali weka email sahihi au jisajili.',
        redirectPath: '/auth/reset',
      });
    }

    if (user.resetCode && user.resetExpires && user.resetExpires > new Date()) {
      return respondAlert(req, res, {
        id: 'reset-request-alert',
        type: 'info',
        message: 'OTP tayari imetumwa kwenye email yako. Angalia inbox and spam folder yako.',
        redirectPath: '/auth/reset',
      });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);

    user.resetCode = code;
    user.resetExpires = expiresAt;
    await user.save();

    const html = `
      <p>Habari ${user.name || ''},</p>
      <p>Hii ndio OTP yako ya kuthibitisha password mpya: <strong>${code}</strong></p>
      <p>OTP inaisha muda wake baada ya saa ${RESET_TTL_HOURS}. Ukipoteza OTP, tuma ombi lingine kupata mpya.</p>
    `;

    await sendEmail(email, 'OTP - Mikeka ya Uhakika', html);

    if (req.headers['hx-request']) {
      return res.render('fragments/alert', {
        id: 'reset-request-alert',
        type: 'success',
        message: 'OTP imetumwa kwenye barua pepe yako.',
        layout: false,
      });
    }

    if (req.flash) req.flash('success', 'OTP imetumwa kwenye barua pepe yako.');
    return res.redirect('/auth/reset');
  } catch (err) {
    logError('reset-send', err);
    return next(err);
  }
}

export async function confirmReset(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email || '');
    const code = (req.body.code || '').trim();
    const password = req.body.password || '';

    if (!email || !code || !password) {
      return respondAlert(req, res, {
        id: 'reset-confirm-alert',
        message: 'Jaza barua pepe, OTP na nenosiri jipya.',
        redirectPath: '/auth/reset',
      });
    }

    if (password.length < 4) {
      return respondAlert(req, res, {
        id: 'reset-confirm-alert',
        message: 'Nenosiri jipya lazima liwe na herufi 4 au zaidi.',
        redirectPath: '/auth/reset',
      });
    }

    const user = await User.findOne({ email, resetCode: code });
    if (!user || !user.resetExpires || user.resetExpires < new Date()) {
      return respondAlert(req, res, {
        id: 'reset-confirm-alert',
        message: 'OTP si sahihi au muda wake umeisha. Jaribu kuomba mpya.',
        redirectPath: '/auth/reset',
      });
    }

    user.password = hashPassword(password);
    user.resetCode = undefined;
    user.resetExpires = undefined;
    await user.save();

    req.login(user, (err) => {
      if (err) return next(err);
      if (req.headers['hx-request']) {
        res.set('HX-Redirect', '/vip');
        return res.render('fragments/alert', {
          id: 'reset-confirm-alert',
          type: 'success',
          message: 'Nenosiri limesasishwa. Tunakuingiza...',
          layout: false,
        });
      }
      if (req.flash) req.flash('success', 'Nenosiri limesasishwa. Karibu VIP.');
      return res.redirect('/vip');
    });
  } catch (err) {
    logError('reset-confirm', err);
    return next(err);
  }
}
