import { Router } from 'express';
import { loadPosts } from '../utils/blog.js';
import { pageMeta } from '../utils/meta.js';
import { enforceVipAccess } from '../utils/vipAccess.js';
import { getMegaTips, getOver15Tips, getBttsTips, getHt15Tips, getVipTips } from '../utils/get-tips/index.js';
import { sendNEXTSMS, sendNormalSMS } from '../utils/sendSMS.js';

const router = Router();

router.get('/', async (req, res) => {
  const tips = await getMegaTips();
  const latestPosts = (await loadPosts()).slice(0, 3);
  res.set('Cache-Control', 'public, max-age=600');
  res.render('pages/home', {
    activeId: 'home',
    meta: pageMeta({ title: 'Mikeka ya Uhakika | Pata Mikeka ya Bure Kila Siku', path: '/', image: '/social_img.webp' }),
    tips,
    latestPosts,
  });
});

router.get('/over-15', async (req, res) => {
  const tips = await getOver15Tips();
  res.set('Cache-Control', 'public, max-age=600');
  res.render('pages/over15', {
    activeId: 'over15',
    meta: pageMeta({
      title: 'Mikeka ya Over 1.5 ya Uhakika Leo',
      description:
        'Utabiri wa mpira wa miguu Over 1.5 mechi za leo - Pata mechi zenye nafasi kubwa za kufunga mabao mawili au zaidi.',
      path: '/over-15/',
      image: '/social_img.webp',
    }),
    tips,
  });
});

router.get('/both-teams-to-score', async (req, res) => {
  const tips = await getBttsTips();
  res.set('Cache-Control', 'public, max-age=600');
  res.render('pages/btts', {
    activeId: 'btts',
    meta: pageMeta({
      title: 'Mikeka ya Uhakika ya Both Teams to Score',
      description: 'Pata mikeka ya uhakika ya Both Teams to Score (GG / NG) hapa kila siku. Utabiri wa mechi za leo na kesho za GG',
      path: '/both-teams-to-score/',
      image: '/social_img.webp',
    }),
    tips,
  });
});

router.get('/under-over-15-first-half', async (req, res) => {
  const tips = await getHt15Tips();
  res.set('Cache-Control', 'public, max-age=600');
  res.render('pages/ht15', {
    activeId: 'ht15',
    meta: pageMeta({
      title: 'Mikeka ya Under/Over 1.5 Halftime',
      description:
        'Utabiri wa leo wa Under/Over 1.5 Halftime – bashiri kwa chaguo la magoli Under/Over 1.5 kipindi cha kwanza.',
      path: '/under-over-15-first-half/',
      image: '/social_img.webp',
    }),
    tips,
  });
});

router.get('/vip', async (req, res) => {
  const { user: freshUser, isActive, expired } = await enforceVipAccess(req.user, req);
  const tips = isActive ? await getVipTips() : null;
  if (freshUser) {
    req.user = freshUser;
    res.locals.user = freshUser;
  }
  res.render('pages/vip', {
    activeId: 'vip',
    meta: pageMeta({
      title: 'VIP Tips | Mikeka ya Uhakika',
      description: 'Mikeka ya VIP inayosasishwa kila siku.',
      path: '/vip/',
      image: '/social_img.webp',
    }),
    tips,
    user: freshUser,
    expired,
    extraStyles: '/css/payment-form-style.css',
  });
});

router.get('/about', (req, res) => {
  res.render('pages/about', {
    activeId: 'about',
    meta: pageMeta({ title: 'Kuhusu Sisi | Mikeka ya Uhakika', path: '/about' }),
  });
});

router.get('/services', (req, res) => {
  res.render('pages/services', {
    activeId: 'services',
    meta: pageMeta({ title: 'Huduma Zetu | Mikeka ya Uhakika', path: '/services' }),
  });
});

router.get('/projects', (req, res) => {
  res.render('pages/projects', {
    activeId: 'projects',
    meta: pageMeta({ title: 'Miradi Yetu | Mikeka ya Uhakika', path: '/projects' }),
  });
});

router.get('/api/testing', async (req, res) => {
  try {
    sendNEXTSMS("255754920480", "Kwa msaada wowote tembelea website yetu baruakazi.com")
    res.end()
  } catch (error) {
    console.log(error)
  }
})

export default router;
