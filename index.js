const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');


/* Set up express up */
const app = express(); // http magic in background

// MongodDB Atlas Driver
const uri = "mongodb+srv://nitar:qwas123qwe@cluster0-aeadb.gcp.mongodb.net/recipes?retryWrites=true&w=majority";


/* Connect to mongodb */
// mongoose.connect('mongodb://localhost:27017/ninjago', {useNewUrlParser: true});
// mongoose.Promise = global.Promise; // legacy for mongoose <= 4

mongoose.connect(uri, {useNewUrlParser: true});

// User folder "publuc" for html requests linde index.html
app.use(express.static('public'));

app.use(bodyParser.json());

/* Initialize routes */
app.use('/api', require('./routes/api')); // app will use our routes

/* Error handling middleware */
app.use((err, req, res, next) => {
  // if (err) throw err;
  console.log(err);
  res.status(422).send(err);
})

// listen for requests 
app.listen(process.env.port || 4006, () => { // process.env.port - heroku port
  console.log('now listening for requests');
}); 