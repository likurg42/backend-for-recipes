const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

/* Set up express up */
const app = express(); // http magic in background

// MongodDB Atlas Driver
const recipes = "mongodb+srv://nitar:qwas123qwe@cluster0-aeadb.gcp.mongodb.net/recipes?retryWrites=true&w=majority";



// Connect to mongodb


mongoose.connect(recipes, {useNewUrlParser: true});

// User folder "publuc" for html requests using index.html
app.use(express.static('public'));

app.use(bodyParser.json());

// Enable CORS
app.use(cors({origin: '*'}));

app.get('/api', (req,res) => {
  res.sendFile(path.join(__dirname + '/public/index.html'));
})

/* Initialize routes */
app.use('/api', require('./routes/api')); // app will use our routes




/* Error handling middleware */
app.use((err, req, res, next) => {
  // if (err) throw err;
  console.log(err);
  res.status(422).send(err);
})

// listen for requests 
app.listen(process.env.PORT || 8080, () => { // process.env.port - heroku port
  console.log('now listening for requests');
}); 