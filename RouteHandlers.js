const fetch = require('node-fetch');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const formatStockData = (companyObject) => {
    
  // Format Change String
  let changeString = companyObject.changes.toFixed(2);
  if (Math.sign(changeString) === 1 || Math.sign(changeString) === 0) {
    companyObject.changeString = `(+${changeString.toString()}%)`
  } else { 
    companyObject.changeString = `(${changeString.toString()}%)`
  }

  // Formatting Market Cap String
  const mktCapStrLength = companyObject.mktCap.toString().length;
  if (mktCapStrLength >= 13) companyObject.mktCapStr = (companyObject.mktCap / 1000000000000).toFixed(2) + ' Trillion'
  else if (mktCapStrLength >= 10) companyObject.mktCapStr = (companyObject.mktCap / 1000000000).toFixed(2) + ' Billion'
  else if (mktCapStrLength >= 7) companyObject.mktCapStr = (companyObject.mktCap / 1000000).toFixed(2) + ' Million'
  else companyObject.mktCapStr = companyObject.mktCap.toString();

  // Formatting Description String
  companyObject.shortDesc = companyObject.description.slice(0, 360) + ' ...';

  return companyObject;
}

const searchByCriteria = async (initialValue, queryOptions) => {
  const finvizResponse = await fetch(`https://finviz.com/screener.ashx?v=111&f=${queryOptions}&r=${initialValue}`);
  const finvizHtml = await finvizResponse.text();
  const finvizDOM = new JSDOM(finvizHtml);

  if(finvizDOM.window.document.getElementsByClassName('screener-link-primary').length === 0) {
    return { 
      stockData: { error: 'no results found' }, totalResultCount: 0 }
  }

  const tickers = Array.from(finvizDOM.window.document.getElementsByClassName('screener-link-primary'))
    .map(node => node.textContent)
    .join(',');

  let totalResultCount = Array.from(finvizDOM.window.document.getElementsByClassName('count-text'))[0]
    .textContent
    .split(' ')[1];
  totalResultCount = parseInt(totalResultCount);

  const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/profile/${tickers}?apikey=${process.env.REACT_APP_FMP_API_KEY}`);
  let stockData = await fmpResponse.json();

  // Excludes ETFs
  stockData = stockData.filter(company => (company.description != null && company.industry));

  if (stockData.length === 0) { 
    return { 
      stockData: { error: 'no results found' }, totalResultCount: 0 
    } 
  }
  
  stockData = stockData.map(company => formatStockData(company));
  
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
    let articles = await finnhubData.json();
    articles = articles.slice(0, 9);
    articles.forEach(article => {
      article.summary = article.summary.slice(0, 480) + '...'; // shorten description
      if (article.image === 'null' || !article.image) {
        article.image = 'https://stocksurfer-server.herokuapp.com/stocksurfer.png'
      }
    });
    return { articles: articles };
  } catch(err) {
    console.log(err);
  }
}

const getCompanyData = async (tickers) => {
  const fmpResponse = await fetch(`https://financialmodelingprep.com/api/v3/profile/${tickers}?apikey=${process.env.REACT_APP_FMP_API_KEY}`);
  let stockData = await fmpResponse.json();

  stockData = stockData.map(company => formatStockData(company));

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