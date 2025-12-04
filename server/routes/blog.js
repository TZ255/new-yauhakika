import { Router } from 'express';
import { listBlog, showBlog } from '../controllers/blogController.js';

const router = Router();

router.get('/', listBlog);
router.get('/page/:page', listBlog);
router.get('/:slug', showBlog);

export default router;
