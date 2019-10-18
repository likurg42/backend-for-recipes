const path = require('path');
const development = require('./env/development');
const production = require('./env/production');
const test = require('./env/test');

const defaults = {
    root: path.normalize(path.join(__dirname, '../')),
};

/**
 * Expose
 */
module.exports = {
    development: { ...development, ...defaults },
    production: { ...production, ...defaults },
    test: { ...test, ...defaults },
}[process.env.NODE_ENV || 'development'];
