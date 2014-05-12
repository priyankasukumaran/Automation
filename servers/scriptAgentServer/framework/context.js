var querystring   = require('qs');
var url           = require('url');
var _             = require('../libs/underscore');
var utils         = require('../utils/common');
var say           = utils.say;

exports.create = function (req, res, globals) {

  return new requestContext(req, res, globals);
}

var requestContext =  function (req, res, globals) {

  var self = this;
  self.newcookies = [];

  self.init = function() {
    self.req = req;
    self.res = res;

    var urlObj = url.parse(req.url, true);
    var reqParts = (urlObj.pathname || '/').split(/\//);
    reqParts.shift(); //remove blank one

    self.pathname   = urlObj.pathname;
    self.urlbase    = reqParts.shift();
    self.urlextra   = reqParts.join('/');
    self.cookies    = utils.parseCookies(req);
    self.query 	    = urlObj.query;

    self.finished = false;

    //merge globals
    for (var prop in globals) {
      self[prop] = globals[prop];
    }
  }

  self.finish = function(err, res) {
    if(self.finished)
      say('Done: ' + self.req.url);
    else {
      self.res.writeHead(404, {"Content-Type": "application/json"});
      self.res.end(JSON.stringify({error:'404'}));

      say('Unhandled: ' + self.req.url);
    }
  }

  self.sendResponse =  function (data, code, headers) {

    if(self.finished === true) return;

    if(self.newcookies.length > 0) {
      self.res.setHeader('Set-Cookie', self.newcookies);
    }

    self.res.writeHead(code, headers);
    self.res.end(data);

    self.finished = true;
    self.finish();
  }

  self.sendJson = function (data, code) {
    code = code || 200;
    self.sendResponse(JSON.stringify(data), 200, {"Content-Type": "application/json"});
  }

  self.sendResult = function (err, reply) {
    if(err) return self.sendJson(err, 404);

    self.sendJson(reply);
  }

  self.redirect302 = function (url) {
    var headers = {'location' : url, 'Content-Type' : 'application/json'};
    self.sendResponse(JSON.stringify([]), 302, headers);
  }

  self.setCookie = function (key, value) {
    self.newcookies.push(key + '=' + value);
  }

  self.init();
}
