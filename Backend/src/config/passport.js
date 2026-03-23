const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const config = require('./config');
const { tokenTypes } = require('./tokens');
const { User, Session } = require('../models');

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      console.error("[DEBUG] Invalid token type in JWT");
      throw new Error('Invalid token type');
    }
    const user = await User.findById(payload.sub);
    if (!user || user.isDeleted) {
      console.error(`[DEBUG] User not found or deleted for sub: ${payload.sub}`);
      return done(null, false);
    }

    // Check if the session still exists in the database
    if (payload.rt) {
      console.log(`[DEBUG] Verifying session with rt (truncated): ${payload.rt}`);
      // Escape regex special characters just in case the token ends with them (like .)
      const escapedRt = payload.rt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const session = await Session.findOne({ 
        user: user.id, 
        token: { $regex: `${escapedRt}$` } 
      });
      if (!session) {
        console.error(`[DEBUG] Session not found in DB for user ${user.id} with rt suffix: ${payload.rt}`);
        return done(null, false, { message: 'Session expired or removed' });
      }
      console.log(`[DEBUG] Session verified: ${session._id}`);
    }

    done(null, user);
  } catch (error) {
    console.error("[DEBUG] JWT Verification error:", error);
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
  jwtStrategy,
};
