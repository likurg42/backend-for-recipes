const api = require('../app/controllers/api');
const index = require('../app/controllers/index');

/**
 * Expose
 */

module.exports = (app) => {
    app.use('/', index);
    app.use('/api', api);

    /**
     * Error Handling
     */
};
