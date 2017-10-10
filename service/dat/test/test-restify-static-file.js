'use strict';

const restify = require('restify');
let server = restify.createServer();

server.get(/\/static\/?.*/, restify.serveStatic({
    directory: __dirname,
}));

server.listen(4999, () => {
    console.log('%s listening at %s', server.name, server.url);
});
