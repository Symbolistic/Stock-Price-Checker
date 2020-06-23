/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
const fetch = require("node-fetch");
const mongoose = require('mongoose');


const Schema = mongoose.Schema;

const stockSchema = new Schema({
  stocks: String,
  likes: [{type: String}]
});

const Stock = mongoose.model("Stock", stockSchema);

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});
mongoose.connect(CONNECTION_STRING, {useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true }, () => {
  console.log("Connection to MongoDB: Succesful")
});



async function getStocks(stock1, stock2) {
  // If both parameters were given, we get both of the stocks inputted by the user
  if (stock1 && stock2) {
    const fetchResponse1 = await fetch(`https://repeated-alpaca.glitch.me/v1/stock/${stock1}/quote`);
    const fetchResponseData1 = await fetchResponse1.json();
    
    const fetchResponse2 = await fetch(`https://repeated-alpaca.glitch.me/v1/stock/${stock2}/quote`);
    const fetchResponseData2 = await fetchResponse2.json();
    
    
    return [
            // First set of data
            {symbol: fetchResponseData1.symbol,        
             price: fetchResponseData1.latestPrice.toFixed(2),
            },
           
            // Second set of data
            {symbol: fetchResponseData2.symbol,        
             price: fetchResponseData2.latestPrice.toFixed(2),
            }
           ];
    
  } else { // If only one parameter was given, we grab that 1 stock 
    const fetchResponse = await fetch(`https://repeated-alpaca.glitch.me/v1/stock/${stock1}/quote`);
    const fetchResponseData = await fetchResponse.json();

    return {
             symbol: fetchResponseData.symbol,        
             price: fetchResponseData.latestPrice.toFixed(2),
    };
  }
}


module.exports = function (app) {
  

  app.route('/api/stock-prices')
    .get(async function (req, res){
      const requestedStock = req.query.stock;
      const like = req.query.like;
    
      console.log(req.query)
    
      // If the type is string, that means it is only 1 stock
      if (typeof requestedStock === 'string') {
        
        const stock = await getStocks(requestedStock);
        if (like) { // If like is checked off, run code, this adds the IP to the like array for the stock
          Stock.findOneAndUpdate({stocks: stock.symbol}, {$addToSet: {likes: req.ip} }, {new:true, upsert: true}, (err, data) => {
            if (err) console.log("Error: " + err); // Used findOneAndUpdate and upsert to ADD stock if it isn't in DB
            
            res.json({stockData: 
                    {
                      stock: stock.symbol,        
                      price: stock.price,
                      likes: data.likes.length
                   }}) 
          })
        } else { // If like isn't checked, do this, basically just display the data
          Stock.findOneAndUpdate({stocks: stock.symbol}, {$set: {stocks: stock.symbol}}, {new: true, upsert: true }, (err, data) => {
            if (err) console.log("Error: " + err); // Used findOneAndUpdate and upsert to ADD stock if it isn't in DB
            
            res.json({stockData: 
                    {
                      stock: stock.symbol,        
                      price: stock.price,
                      likes: data.likes.length ? data.likes.length : 0
                   }}) 
          })
        }      
      } else { // If its not a string it will be an array of 2 stocks to compare       
        const stock = await getStocks(requestedStock[0], requestedStock[1]);
        let stockLikes1 = []; // Stores all the likes for the first requested stock to compare
        let stockLikes2 = []; // Stores all the likes for the second requested stock to compare
        let rel_likes = []; // Related IP Address likes between both stocks will go here
        
        if (like) {
          
          const stockData1 = await Stock.findOneAndUpdate({stocks: stock[0].symbol}, {$addToSet: {likes: req.ip} }, {new:true, upsert: true})
          stockLikes1 =  Array.isArray(stockData1.likes) ? stockData1.likes.map(val => val) : [];

          
          const stockData2 = await Stock.findOneAndUpdate({stocks: stock[1].symbol}, {$addToSet: {likes: req.ip} }, {new:true, upsert: true})
          stockLikes2 =  Array.isArray(stockData2.likes) ? stockData2.likes.map(val => val) : [];

          
            rel_likes = stockLikes1.filter(ipAddress => stockLikes2.includes(ipAddress))
          
            res.json({stockData: [
                  {
                    stock: stock[0].symbol,        
                    price: stock[0].price,
                    rel_likes: rel_likes.length // This just shows how many related IP's were found
                  },
          
                  {
                    stock: stock[1].symbol,        
                    price: stock[1].price,
                    rel_likes: rel_likes.length // This just shows how many related IP's were found
                  }
            ]})      
        } else {
          
          
          // Grab likes from the first stock, if that stock isn't in the Database yet, we add it, used await due to async issues
          const stockData1 = await Stock.findOneAndUpdate({stocks: stock[0].symbol}, {$set: {stocks: stock[0].symbol}}, {new: true, upsert: true });
          stockLikes1 =  Array.isArray(stockData1.likes) ? stockData1.likes.map(val => val) : [];
          // Grab likes from the second stock, if that stock isn't in the Database yet, we add it, used await because i was having async issues
          const stockData2 = await Stock.findOneAndUpdate({stocks: stock[1].symbol}, {$set: {stocks: stock[1].symbol}}, {new: true, upsert: true });
          stockLikes2 =  Array.isArray(stockData2.likes) ? stockData2.likes.map(val => val) : [];
            
          
            rel_likes = stockLikes1.filter(ipAddress => stockLikes2.includes(ipAddress))
          
            res.json({stockData: [
                  {
                    stock: stock[0].symbol,        
                    price: stock[0].price,
                    rel_likes: rel_likes.length // This just shows how many related IP's were found
                  },
          
                  {
                    stock: stock[1].symbol,        
                    price: stock[1].price,
                    rel_likes: rel_likes.length // This just shows how many related IP's were found
                  }
            ]})            
        }
      }
  }); 
};
