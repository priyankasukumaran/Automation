var http          = require('http');
var utils         = require('../utils/common');
var say           = utils.say;

exports.create = function(options, callback)
{
  return new httpServer(options, callback);
}

var httpServer =  function(options, callback) {

  var self = this;

  var port    = options.port || '8180';
  var secure  = options.secure || false;
  var timeout = options.timeout || 30000;

  return http.createServer(function(req, res) {
    req.setMaxListeners(0);

    say("Request: " + req.url);

    req.connection.setTimeout(timeout);

    req.on('data', function(data) {
      if(!req.chunks) req.chunks = [];
      req.chunks.push(data.toString());
    });
		
    req.on('end', function() {
      callback(req, res);
    });
    
    req.connection.on('close', function() {
      req._clientClosed = true;
    });

  }).listen(port);
}
