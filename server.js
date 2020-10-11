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

const runApiCalls = async (queryOptions, initialValue) => {

  let count = 0; // number of total results
  let tickers = [];

  const getCompanyData = async (tickers) => {
    const array = tickers.join(',');
    const jsonData = await fetch(`https://financialmodelingprep.com/api/v3/profile/${array}?apikey=${process.env.REACT_APP_FMP_API_KEY}`);
    return jsonData;
  }
  const getCompanies = async (startNum) => {
    console.log(startNum)
    const response = await fetch(`https://finviz.com/screener.ashx?v=111&f=${queryOptions}&r=${startNum}`);
    const html = await response.text();
    const dom = new JSDOM(html);

    const htmlElements = Array.from(dom.window.document.getElementsByClassName('screener-link-primary'));
    const countString = Array.from(dom.window.document.getElementsByClassName('count-text'))[0].textContent.split(' ')[1];
    count = parseInt(countString);

    htmlElements.forEach(node => {
      tickers.push(node.textContent);
    })
    const jsonData = await getCompanyData(tickers) 
    return jsonData;
  }
  const data = await getCompanies(initialValue);
  return data;
}

const getCompanyNews = async (ticker) => {
  const dateCurr = new Date().toISOString().slice(0, 10);
  let dateOld = new Date();
  dateOld.setMonth(dateOld.getMonth() - 8);
  dateOld = dateOld.toISOString().slice(0, 10);
  const dateQuery = `&from=${dateOld}&to=${dateCurr}`;

  const returnObj = fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}${dateQuery}`, {
    method: 'GET',
    headers: { 'X-Finnhub-Token' : process.env.REACT_APP_FINNHUB_API_KEY }
  })
  .then(jsonData => jsonData.json())
  .then(articles => {
    const returnArray = articles.slice(0, 9);
    return  { "newsArray": returnArray }
  })

  return returnObj;
}

app.get('/', (req, res) => {
  console.log('hello world')
})

app.post('/search', (req, res) => {
  runApiCalls(req.body.queryOptions, req.body.initialValue)
  .then(jsonData => jsonData.json())
  .then(data => { res.send(data) });
})

app.post('/companynews', (req, res) => {
  getCompanyNews(req.body.ticker)
  .then(data => JSON.stringify(data))
  .then(jsonData => {res.send(jsonData)})
})

app.listen(port, () => {
  console.log(`listening on http://localhost:${port}`)
})