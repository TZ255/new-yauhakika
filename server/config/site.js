export const SITE = {
  name: 'Mikeka ya Uhakika',
  description:
    'Tanzania football tips & predictions. Pata mikeka ya uhakika kila siku. Mikeka ya bure, mikeka ya jumamosi na jumapili inapatikana hapa. Karibu nyumba ya ushindi',
  url: process.env.SITE_URL || 'http://localhost:3000',
  googleVerification: 'bre84rQ3JQJirLREUOE-3jYY0pU3uo8Gd8ddpOtJ4y8',
  defaultImage: '/profile.webp',
};

export const NAV_ITEMS = [
  { id: 'home', label: 'Home - Acca Tips', href: '/' },
  { id: 'over15', label: 'Over 1.5 Tips', href: '/over-15' },
  { id: 'btts', label: 'Both Teams to Score', href: '/both-teams-to-score' },
  {
    id: 'ht15',
    label: 'Under/Over 1.5 Halftime',
    href: '/under-over-15-first-half',
  },
  { id: 'blog', label: 'Makala', href: '/blog' },
  { id: 'about', label: 'Kuhusu Sisi', href: '/about' },
  { id: 'services', label: 'Huduma', href: '/services' },
  { id: 'projects', label: 'Miradi', href: '/projects' },
  { id: 'contact', label: 'Wasiliana Nasi', href: 'mailto:support@mikekayauhakika.com' },
];

export const STATIC_PAGES = [
  '/',
  '/over-15',
  '/both-teams-to-score',
  '/under-over-15-first-half',
  '/about',
  '/services',
  '/projects',
  '/blog',
];
