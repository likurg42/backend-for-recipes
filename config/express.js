require('dotenv').config(); // eslint-disable-line global-require

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
// const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
// const morgan = require('morgan');

// const env = process.env.NODE_ENV;

/**
 * Expose
 */

module.exports = (app) => {
    // mongodb
    const recipes = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-aeadb.gcp.mongodb.net/recipes?retryWrites=true&w=majority`;
    mongoose.connect(recipes, { useNewUrlParser: true });

    // Compression, place before static
    app.use(
        compression({
            threshold: 512,
        }),
    );

    // public
    app.use(express.static('public'));

    // view engine
    app.set('view engine', 'pug');
    app.set('views', path.join(__dirname, '../app/views'));

    // Log During Development and Production && Don't log during tests
    // let log;
    // if (env !== 'test') {
    //     app.use(morgan(log));
    // }

    // bodyParser should be above methodOverride
    app.use(
        express.urlencoded({
            extended: true,
        }),
    );
    app.use(express.json());

    app.use(cookieParser());
    app.use(cors());

    // // catch 404 and forward to error handler
    // app.use((req, res, next) => {
    //     next(createError(404));
    // });

    // // error handler
    // app.use((err, req, res) => {
    //     // errors in development
    //     res.locals.message = err.message;
    //     console.error('app.js error', err.message);
    //     res.locals.error = req.app.get('env') === 'development' ? err : {};

    //     // render error page
    //     res.status(err.status || 500);
    //     res.render('error');
    // });
};
