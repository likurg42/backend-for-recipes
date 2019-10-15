const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const logger = require('morgan');
const apiRouter = require('./routes/api');
const indexRouter = require('./routes/index');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config(); // eslint-disable-line global-require
}

const app = express();

// mongodb
const recipes = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-aeadb.gcp.mongodb.net/recipes?retryWrites=true&w=majority`;
mongoose.connect(recipes, { useNewUrlParser: true });

// view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// middleware
app.use(compression());
app.use(logger('dev'));
app.use(cookieParser());
app.use(cors());

// public
app.use(express.static('public'));

// routers
app.use('/api', apiRouter);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res) => {
    // errors in development
    res.locals.message = err.message;
    console.error('app.js error', err.message);
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
