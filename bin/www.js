#!/usr/bin/env node

/**
 * Module dependencies.
 */

const app = require('../app')
    , debug = require('debug')('backend-for-recipes:server')
    , http = require('http');


/**
 * Get port from environment and store in exporess
 */
const port = normalizePort(process.env.PORT || '3000');
console.log('port', port);
app.set('port', port);


/**
 * Create HTTP Server
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onlistening);

/**
 * Normalize a port into a number, string, or false
 */

function normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) return val;

    if (port >= 0) return port;

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port

    // hande sprcific listen error with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires eleveated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP sever "listening" event.
 */

function onlistening() {
    const addr = server.address();
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on' + bind);
}