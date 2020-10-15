const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const mongoose = require('mongoose');
const User = require('./models/User.js');
require('dotenv').config(); 

// initialize express

const app = express();
const port = 3001;

// MongoDB + Mongoose

mongoose.connect(`mongodb+srv://zomgitshenry:${process.env.REACT_APP_MONGODB_KEY}@cluster0.gy4ko.mongodb.net/stocksurfer?retryWrites=true&w=majority`, 
  {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('MongoDB Connected');
});

// Middleware

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

// Routes

app.get('/', (req, res) => {
  console.log('Hello World')
})

app.get('/sync/:googleId', (req, res) => {
  User.findOne({userId: req.params.googleId})
  .then(user => {console.log(user); res.send(user)});
})

app.post('/set', (req, res) => {
  User.findOneAndUpdate(
    { userId: req.body.googleId },
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

  res.send(JSON.stringify({ stockData, totalResultCount }));
})

app.get('/companies/:tickers', async (req, res) => {
  const { tickers } = req.params;
  const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/profile/${tickers}?apikey=${process.env.REACT_APP_FMP_API_KEY}`);
  const stockData = await fmpResponse.json();

  res.send(JSON.stringify({ stockData }));
})

app.get('/companynews/:ticker', async (req, res) => {
  const dateCurr = new Date().toISOString().slice(0, 10);
  let dateOld = new Date();
  dateOld.setMonth(dateOld.getMonth() - 8);
  dateOld = dateOld.toISOString().slice(0, 10);
  const dateQuery = `&from=${dateOld}&to=${dateCurr}`;

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
})

app.listen(port, () => {
  console.log(`listening on http://localhost:${port}`)
})