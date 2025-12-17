import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import User from '../models/user.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const normalizeEmail = (email = '') => email.trim().toLowerCase();

passport.use(
  new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
    try {
      const normalizedEmail = normalizeEmail(email);
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return done(null, false, { message: 'Email haipo... Tafadhali jisajili au weka email sahihi' });
      }

      const { valid, needsRehash } = verifyPassword(password, user.password);
      if (!valid) {
        return done(null, false, { message: 'Nenosiri si sahihi. Jaribu tena.' });
      }

      if (needsRehash) {
        user.password = hashPassword(password);
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).lean();
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});
