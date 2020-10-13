const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
require('dotenv').config();

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors());

app.get('/', (req, res) => {
  console.log('hello world')
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
  const returnData = JSON.stringify({ "newsArray": returnArray });
  res.send(returnData);
})

app.listen(port, () => {
  console.log(`listening on http://localhost:${port}`)
})