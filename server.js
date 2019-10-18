const express = require('express');
const mongoose = require('mongoose');
// const fs = require('fs');
// const { join } = require('path');
const config = require('./config');

// const models = join(__dirname, 'app/models');

const app = express();

const connectToMongoDB = () => {
    const options = {
        useUnifiedTopology: true,
        keepAlive: 1,
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: true,
    };
    console.log(config.db);
    mongoose.connect(config.db, options);
    return mongoose.connection;
};

require('./config/express')(app);
require('./config/routes')(app);

module.exports = {
    connectToMongoDB,
    app,
};
