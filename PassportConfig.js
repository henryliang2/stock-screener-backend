const User = require('./models/User.js');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const googleStrategy = new GoogleStrategy({
  clientID: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  clientSecret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
  console.log(profile);
  let user = await User.findOne({userId: profile.id});
  if(user) done(null, user);
  else {
    user = await User.create({
      userId: profile.id,
      displayName: profile.displayName,
      email: profile.emails[0].value,
      image: profile.photos[0].value,
      stocks: []
    })
    
    done(null, user);
  }
})

module.exports = { googleStrategy }