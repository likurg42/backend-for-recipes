const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');

/* Set up express up */
const app = express(); // http magic in background

// MongodDB Atlas Driver
const recipes = "mongodb+srv://nitar:qwas123qwe@cluster0-aeadb.gcp.mongodb.net/recipes?retryWrites=true&w=majority";
const todos = "mongodb+srv://nitar:qwas123qwe@cluster0-aeadb.gcp.mongodb.net/todos?retryWrites=true&w=majority";



/* Connect to mongodb */
// mongoose.connect('mongodb://localhost:27017/ninjago', {useNewUrlParser: true});
// mongoose.Promise = global.Promise; // legacy for mongoose <= 4

mongoose.connect(recipes, {useNewUrlParser: true});
mongoose.connect(todos, {useNewUrlParser: true});

// User folder "publuc" for html requests using index.html
app.use(express.static('public'));

app.use(bodyParser.json());

/* Initialize routes */
app.use('/api', require('./routes/api')); // app will use our routes

// Enable CORS
app.use(cors({origin: '*'}));

/* Error handling middleware */
app.use((err, req, res, next) => {
  // if (err) throw err;
  console.log(err);
  res.status(422).send(err);
})

// listen for requests 
app.listen(process.env.PORT || 4007, () => { // process.env.port - heroku port
  console.log('now listening for requests');
}); 