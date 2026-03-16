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
      throw new Error('Invalid token type');
    }
    const user = await User.findById(payload.sub);
    if (!user || user.isDeleted) {
      return done(null, false);
    }

    // Check if the session still exists in the database
    if (payload.rt) {
      const session = await Session.findOne({ 
        user: user.id, 
        token: { $regex: `${payload.rt}$` } 
      });
      if (!session) {
        return done(null, false, { message: 'Session expired or removed' });
      }
    }

    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
  jwtStrategy,
};
