import { pageMeta } from '../utils/meta.js';
import { getBttsTips, getHt15Tips, getMegaTips, getOver15Tips, getVipTips } from './tipsController.js';
import { loadPosts } from '../utils/blog.js';
import { enforceVipAccess } from '../utils/vipAccess.js';

export async function renderHome(req, res) {
  const tips = await getMegaTips();
  const latestPosts = (await loadPosts()).slice(0, 3);
  res.render('pages/home', {
    activeId: 'home',
    meta: pageMeta({ title: 'Mikeka ya Uhakika | Pata Mikeka ya Bure Kila Siku', path: '/', image: '/social_img.webp' }),
    tips,
    latestPosts,
  });
}

export async function renderOver15(req, res) {
  const tips = await getOver15Tips();
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
}

export async function renderBtts(req, res) {
  const tips = await getBttsTips();
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
}

export async function renderHt15(req, res) {
  const tips = await getHt15Tips();
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
}

export async function renderVip(req, res) {
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
  });
}

export function renderAbout(req, res) {
  res.render('pages/about', {
    activeId: 'about',
    meta: pageMeta({ title: 'Kuhusu Sisi | Mikeka ya Uhakika', path: '/about' }),
  });
}

export function renderServices(req, res) {
  res.render('pages/services', {
    activeId: 'services',
    meta: pageMeta({ title: 'Huduma Zetu | Mikeka ya Uhakika', path: '/services' }),
  });
}

export function renderProjects(req, res) {
  res.render('pages/projects', {
    activeId: 'projects',
    meta: pageMeta({ title: 'Miradi Yetu | Mikeka ya Uhakika', path: '/projects' }),
  });
}
