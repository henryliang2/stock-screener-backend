const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const mongoose = require('mongoose');
const User = require('./models/User.js');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
require('dotenv').config(); 

// initialize express

const app = express();
const port = process.env.PORT || 3000;

// Passport Configuration

passport.use(new GoogleStrategy({
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
}
));

passport.serializeUser((user, done) => {
  done(null, user.userId);
});

passport.deserializeUser((id, done) => {
  User.findOne({userId: id}, (err, user) => done(err, user));
});

// MongoDB + Mongoose

mongoose.connect(`mongodb+srv://zomgitshenry:${process.env.REACT_APP_MONGODB_KEY}@cluster0.gy4ko.mongodb.net/stocksurfer?retryWrites=true&w=majority`, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true, 
    useFindAndModify: false 
  });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('MongoDB Connected');
});

// Middleware

app.use(
  cookieSession({
    name: "session",
    keys: [process.env.REACT_APP_SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 100
  })
);
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors({
  origin: "https://stock-surfer.netlify.app",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
}));

// Passport Routes

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    successRedirect: 'https://stock-surfer.netlify.app/',
    failureRedirect: 'https://stock-surfer.netlify.app/' 
  }),
  (req, res) => {
    res.redirect('/');
  });

app.get("/auth/logout", (req, res) => {
  req.logout();
  res.redirect('https://stock-surfer.netlify.app');
});

// API Routes

app.get('/', (req, res) => {
  res.send('Hello World');
})

app.get('/sync', (req, res) => {
  if(!req.user) { res.send({}); return null };

  User.findOne({userId: req.user.userId})
  .then(user => { res.send(user) });
})

app.post('/set', (req, res) => {
  User.findOneAndUpdate(
    { userId: req.user.userId },
    {$set: { stocks: req.body.stocks }}
  ).then(console.log)
})

app.get('/search/:initialValue/:queryOptions?', async (req, res) => {

  const { queryOptions, initialValue } = req.params;

  const finvizResponse = await fetch(`https://finviz.com/screener.ashx?v=111&f=${queryOptions}&r=${initialValue}`);
  const finvizHtml = await finvizResponse.text();
  const finvizDOM = new JSDOM(finvizHtml);

  const tickers = Array.from(finvizDOM.window.document.getElementsByClassName('screener-link-primary'))
    .map(node => node.textContent)
    .join(',');

  let totalResultCount = Array.from(finvizDOM.window.document.getElementsByClassName('count-text'))[0]
    .textContent
    .split(' ')[1];
  totalResultCount = parseInt(totalResultCount);

  const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/profile/${tickers}?apikey=${process.env.REACT_APP_FMP_API_KEY}`);
  const stockData = await fmpResponse.json();
  console.log(stockData);

  res.send(JSON.stringify({ stockData, totalResultCount }));
})

app.get('/companies/:tickers', async (req, res) => {
  const { tickers } = req.params;
  const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/profile/${tickers}?apikey=${process.env.REACT_APP_FMP_API_KEY}`);
  const stockData = await fmpResponse.json();
  console.log(stockData)

  res.send(JSON.stringify({ stockData }));
})

app.get('/companynews/:ticker', async (req, res) => {
  const dateCurr = new Date().toISOString().slice(0, 10);
  let dateOld = new Date();
  dateOld.setMonth(dateOld.getMonth() - 8);
  dateOld = dateOld.toISOString().slice(0, 10);
  const dateQuery = `&from=${dateOld}&to=${dateCurr}`;

  try {
    const finnhubData = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${req.params.ticker}${dateQuery}`, {
      method: 'GET',
      headers: { 'X-Finnhub-Token' : process.env.REACT_APP_FINNHUB_API_KEY }
    })
    const articles = await finnhubData.json();
    const returnArray = articles.slice(0, 9);
    returnArray.forEach((article, i) => {
      article.summary = article.summary.slice(0, 480) + '...';
    });
    const returnData = JSON.stringify({ newsArray: returnArray });
    res.send(returnData);
  } catch(err) {
    console.log(err);
  }
})

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})