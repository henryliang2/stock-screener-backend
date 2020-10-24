const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const searchByCriteria = async (initialValue, queryOptions) => {
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
  
  return { stockData, totalResultCount }
}

const getCompanyNews = async (ticker) => {
  const dateCurr = new Date().toISOString().slice(0, 10);
  let dateOld = new Date();
  dateOld.setMonth(dateOld.getMonth() - 8);
  dateOld = dateOld.toISOString().slice(0, 10);
  const dateQuery = `&from=${dateOld}&to=${dateCurr}`;

  try {
    const finnhubData = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${ticker}${dateQuery}`, {
      method: 'GET',
      headers: { 'X-Finnhub-Token' : process.env.REACT_APP_FINNHUB_API_KEY }
    })
    const articles = await finnhubData.json();
    let returnArray = articles.slice(0, 9);
    returnArray.forEach((article, i) => {
      article.summary = article.summary.slice(0, 480) + '...'; // shorten description
      if (article.image === 'null') {
        article.image = 'https://stocksurfer-server.herokuapp.com/stocksurfer.png'
      }
    });
    return { newsArray: returnArray };
  } catch(err) {
    console.log(err);
  }
}

const getCompanyData = async (tickers) => {
  const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/profile/${tickers}?apikey=${process.env.REACT_APP_FMP_API_KEY}`);
  const stockData = await fmpResponse.json();
  return stockData
}

const getQuote = async (ticker) => {
  const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.REACT_APP_FMP_API_KEY}`)
  const responseData = await fmpResponse.json();
  const quoteData = [...responseData.historical].slice(0, 255);
  return quoteData;
}

module.exports = { 
  searchByCriteria,
  getCompanyNews,
  getCompanyData,
  getQuote,
}