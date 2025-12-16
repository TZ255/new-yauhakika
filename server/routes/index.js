import { Router } from 'express';
import pageRoutes from './pages.js';
import blogRoutes from './blog.js';
import authRoutes from './auth.js';
import paymentRoutes from './payment.js';
import { renderRss, renderSitemap } from '../controllers/seoController.js';

const router = Router();

router.use('/', pageRoutes);
router.use('/blog', blogRoutes);
router.use('/auth', authRoutes);
router.use('/', paymentRoutes);

router.get('/rss.xml', renderRss);
router.get('/sitemap.xml', renderSitemap);

export default router;
