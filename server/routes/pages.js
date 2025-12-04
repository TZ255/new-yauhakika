import { Router } from 'express';
import {
  renderAbout,
  renderBtts,
  renderHome,
  renderHt15,
  renderOver15,
  renderProjects,
  renderServices,
} from '../controllers/pageController.js';

const router = Router();

router.get('/', renderHome);
router.get('/over-15', renderOver15);
router.get('/both-teams-to-score', renderBtts);
router.get('/under-over-15-first-half', renderHt15);
router.get('/about', renderAbout);
router.get('/services', renderServices);
router.get('/projects', renderProjects);

export default router;
