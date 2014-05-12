var _             = require('../libs/underscore');
var http          = require('http');
var fs            = require('fs');
var exec          = require('child_process').exec;
var spawn         = require('child_process').spawn;
var querystring   = require('qs');
var mkdirp        = require('mkdirp');
var mustache      = require('mustache');
var url           = require('url');
var path          = require('path');

var say = console.log;
exports.say = say;


// set the master page as template
var template = "";
fs.readFile('www/index.html', function (err, data) {
	if (!err) template = data.toString();
});

var buildPage = function(path, callback) {

	if (path.indexOf('.html') > 0)
		var useMasterPage = true;

	// read the page and build responce
	fs.readFile(path, function (err, data) {
		if (!err) {
			var responce = data;
			var contentHolder = {
				content: data,
			};

			if(template && useMasterPage == true) {
				responce = mustache.to_html(template, contentHolder);
				callback(responce);
			}
			else {
				callback(responce);
			}
		} else {
		  callback(null);
		}
	});
};

var parseCookies = function(req)
{
  if (!req) return {};

  if ('headers' in req)
    headers = req.headers;

  var ret = {};
  if (headers) {
    var cookie = headers.cookie;
    if (cookie) {
      var cookies = cookie.split(';');
      _.each(cookies, function(c) {
        var parts = c.split('=');
        if (parts && parts.length >= 2) {
          var key = parts[0].replace(/ /g, ''), value = parts[1].replace(/ /g, '');
          ret[key] = value;
        }
      });
    }
  }
  return ret;
};

var getTemporaryPath = function(jobId, callback) {
  var path = '/tmp/loki/' + jobId + '/';
  
  var cmdLine = "mkdir -p '" + path + "'";
  exec(cmdLine, function(err, stdout, stderr) {
    callback(path);
  });
}

var downloadFile = function(url, filename, callback) {
  var curlCommandLine = "curl -kL --user panini:Dunn! '" + url + "' -o " + filename;
  //console.log(curlCommandLine);
  exec(curlCommandLine, function(err, stdout, stderr) {
    if (err) {return callback({error:err});}
    return callback(null, filename);
  });
}

exports.loadJson = function(path, callback) {
  fs.readFile(path, function (err, data) {
    if (err) return callback();
    callback(JSON.parse(data));
  });
}

exports.getJson = function() {
  var args = Array.prototype.slice.call(arguments);
  var requrl = args.shift();
  var callback = args.pop();
  var opt = (args.length > 0)?args.pop():{};
  
  var sw = '-sk';
  if(!opt['useproxy']) {
    sw += ' --noproxy ' + url.parse(requrl)['hostname'];
  }
  sw += (opt['connectTimeout'])? ' --connect-timeout '+opt['connectTimeout']:'';
  
  var curlCommandLine = "curl " + sw + " '" + requrl + "'";
  console.log(curlCommandLine);
  return exec(curlCommandLine, function(err, stdout, stderr) {
    var reply = null;
    var err = null;
    try {
      console.log(stdout);
      reply = JSON.parse(stdout);
    }catch(e){
      err = e;
    }

    return callback(err, reply);
  });
  return;

  http.get(url, function(res) {

    var data = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk) { data += chunk.toString(); });
    res.on('end', function() {
      var output = {};
      var err = null;
      try {
        output = JSON.parse(data);
      }catch(e){
        err = e;
      }
      callback(err, output);
    })
  }).on('error', function(err_) {

    console.log(err_, url);
    callback({error:err_});
  });
}

var each = function(collection, fn, finalCallback)
{
  var keys = _.isArray(collection) ? _.range(collection.length) : _.keys(collection);
  var errs = [];

  var i = 0;
  var doOne = function()
  {
    if (keys.length > 0 && i < keys.length) {
      var item = collection[keys[i]];
      fn(item, function(err) {
        errs.push(err);
        if (err && err.step === 'break') {return doFinal();}

        i++;
        return doOne();
      }, keys[i], collection);
    }
    else {
      return doFinal();
    }
  };

  var doFinal = function()
  {
    var finalIndex = keys[i] || i;
    finalCallback(errs, finalIndex, i, keys);
  }

  return doOne();
}

var IsEmpty = function() {
	for(var i=0; i < arguments.length; i++) {
		if(!arguments[i] || arguments[i] === '') return true;
	}

	return false;
}

/**
 *  Returns an object from an HTTP body, or the passed-in body.
 */
exports.httpBody = function(req, body_, chunksName_)
{
  if (body_ && typeof body_ === 'object')
    return body_;

  var body = body_;
  if (typeof body !== 'string') {
    if (!body) {
      var chunksName = chunksName_ || 'chunks';
      body = req[chunksName];
    }

    if (_.isArray(body)) {
      body = body.join('');
    }
  }

  // Body should be a string by this point.
  // @todo:"assert that it is a string"

  // We need to decode it appropriately - JSON or form-encoded
  //sys.puts(sys.inspect(req.headers));
  var contentType = req.headers['content-type'] || 'guess';
//  if (contentType === 'guess') {
    // @todo:"make this more robust.  dont do this fall-thru processing"
    try {
      body = JSON.parse(body);
    } catch(e) {
      body = querystring.parse(body);
    }
    return body;
//  }
};

var inject = function(arr, name, values)
{
  var last = values.length - 1;

  var i = 0;
  return _.map(_.toArray(arr), function(x) {

    x2 = _.clone(x);
    x2[name] = values[i];

    i = (i < last ? i + 1 : last);

    return x2;
  });
}

var tempPath = process.env['HOME'] + '/testResults/';
var getTempDir =  function(machine, callback) {
	var reportDir = tempPath + machine +'/';

	mkdirp(reportDir, function(err) {
		callback(err, reportDir);
	});
}

var scriptPaths = {};
var loadScriptPath = function(opt, callback) {
  var product = opt.product || 'panini';
  var tag = opt.tag || 'HEAD';
  
  if(scriptPaths[product + '_' + tag]) {
    return callback(scriptPaths[product + '_' + tag]);
  }
  
  var localTagPath = path.dirname(path.dirname(path.dirname(__dirname)));
  var localScriptPath = localTagPath + '/autoscripts/products/' + product;
  scriptPaths[product + '_' + tag] = { tagPath: localTagPath, scriptPath: localScriptPath };
  scriptPaths[product + '_' + tag].gitRepo = localTagPath;

  fs.readFile(localScriptPath + '/external.json', function(err, data) {
    var extInfo = {};
    if(!err && data) extInfo = JSON.parse(data);
    if(extInfo.scriptDir && extInfo.gitRipo && extInfo.repoName) {
      scriptPaths[product + '_' + tag].tagPath = process.env['HOME'] + '/testScripts/' + tag;
      scriptPaths[product + '_' + tag].repoPath = scriptPaths[product + '_' + tag].tagPath + '/' + extInfo.repoName;
      scriptPaths[product + '_' + tag].scriptPath = scriptPaths[product + '_' + tag].repoPath + '/' + extInfo.scriptDir;
      scriptPaths[product + '_' + tag].gitRepo = extInfo.gitRipo;
    }
    
    callback(scriptPaths[product + '_' + tag]);
  });
};

var getScriptPath = function(opt, callback) {
  loadScriptPath(opt, function(scriptInfo) {
    (fs.exists || path.exists)(scriptInfo.scriptPath, function(exists){
      callback(scriptInfo.scriptPath, exists);
    });
  });
};

var getScriptSourceInfo =  function(opt, callback) {
  loadScriptPath(opt, function(scriptInfo) {
    callback(scriptInfo);
  });
};

exports.parseCookies      = parseCookies;
exports.getTemporaryPath  = getTemporaryPath;
exports.downloadFile      = downloadFile;
exports.each              = each;
exports.IsEmpty           = IsEmpty;
exports.inject            = inject;
exports.getTempDir				= getTempDir;
exports.buildPage					= buildPage;
exports.getScriptPath     = getScriptPath;
exports.getScriptSourceInfo= getScriptSourceInfo;
