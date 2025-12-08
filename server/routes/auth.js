import { Router } from 'express';
import {
  confirmReset,
  handleLogin,
  handleLogout,
  handleRegister,
  sendResetCode,
  showLogin,
  showRegister,
  showReset,
} from '../controllers/authController.js';

const router = Router();

router.get('/login', showLogin);
router.get('/register', showRegister);
router.get('/reset', showReset);

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/logout', handleLogout);

router.post('/reset/request', sendResetCode);
router.post('/reset/confirm', confirmReset);

export default router;
