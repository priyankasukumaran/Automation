
/**
 *  @fileOverview Utilities
 */

var _           = require('../libs/underscore');

var fs          = require('fs');
var path        = require('path');
var exec        = require('child_process').exec;
var spawn       = require('child_process').spawn;
var urlLib      = require('url');

var utils = {};

/* -------------------------------------------------- */
utils.__ = {};

/**
 *  Aggregate an Array of err objects into null or the Array.
 *
 *  If the err objects from a bunch of callbacks are all null, then the
 *  result of them all is a single null, not the array of nulls.
 */
var aggregateErrs = function(errs)
{
  var ret = _.compact(errs);
  if (ret.length === 0)
    ret = null;
  return ret;
}

/**
 *  Run each item in the collection through the function, then call the final callback.
 *
 *  The caller is NOT obligated to run through the entire collection.
 *
 *  This function is essentially "_.each" for async functions. However, passing a
 *  non-Array is not yet tested.
 *
 *  The fn callback signature is fn(item, nextFn, index, collection).
 *  The finalCallback signature is finalCallback(err, stoppedIndex, ordinalOfStoppedIndex, keysUsed)
 */
utils.__.each = function(collection, fn, finalCallback)
{
  // Build an array of the keys into their collection.  For Arrays, this will be the numeric indexes
  // (like [0,1,2,3]), for Objects, it will be the object's keys;
  var keys = _.isArray(collection) ? _.range(collection.length) : _.keys(collection);

  // Remember the err parameters of the fn callbacks
  var errs = [];

  // The index of the currently running function
  var i = 0;

  // Wrap the caller's fn in a function to 'recursively' call
  var doOne = function()
  {
    // Do we still have work to do?
    if (i >= keys.length) return doFinal();

    // Look up the item (double indexed)
    var item = collection[keys[i]];

    // Send it to the caller's fn callback
    fn(item, function(err) {

      // Remember the err
      errs.push(err);

      // If the err is really a control-flow command, do it
      if (err && err.step === 'break') return doFinal();

      // Do the next item
      i++;
      return doOne();

    }, keys[i], collection);
  };

  // Wrap the caller's finalCallback
  var doFinal = function()
  {
    var finalIndex = keys[i] || i;
    return finalCallback(aggregateErrs(errs), finalIndex, i, keys);
  }

  // Make sure there's actually some items to process.  If not, we still call the final callback.
  if (!keys.length) return doFinal();

  // Kick everything off
  return doOne();
};

/**
 * This is effectively __.each, but remembering the results
 */
utils.__.map = function(collection, fn, finalCallback)
{
  var results = [], errs = [];

  return __.each(collection,
    function(item, next, index, collection) {
      return fn(item, function(err, result) {
        errs.push(err);
        results.push(result);
        next(err);
      }, index, collection);
    },

    function() {
      return finalCallback(aggregateErrs(errs), results);
    }
  );
}

/**
 *  Run each item in the collection through the function in parallel, then call the final callback.
 *
 *  This function is essentially "_.each" for async functions, where we start all the fn callbacks together.
 *  However, passing a non-Array is not yet tested.
 *
 *  The signature is fn(item, nextFn, index, collection).
 *  The signature is finalCallback(err, stoppedIndex, ordinalOfStoppedIndex, keysUsed)
 */
utils.__.eachll = function(collection, fn, finalCallback)
{
  var isArray   = _.isArray(collection);
  var keys      = isArray ? _.range(collection.length) : _.keys(collection), numItems  = keys.length;

  var results   = isArray ? _.map(_.range(numItems), function(x) {return null;}) : {};
  var errors    = isArray ? _.map(_.range(numItems), function(x) {return null;}) : {};

  var done      = isArray ? []  : {};
  _.each(keys, function(k) {done[k] = null;});

  var doOne = function(i)
  {
    //tt.assertLt(i, numItems, 'index beyond scope in __.eachll');
    var item = collection[keys[i]];
    fn(item, function(err) {
      return oneDone(i, arguments);
    }, keys[i], collection);
  };

  var oneDone = function(i, argus)
  {
    //tt.assertNot(done[keys[i]], 'seeing a callback more than once in __.eachll -- item: ' + keys[i] + ' ' + i);

    done   [keys[i]] = true;
    errors [keys[i]] = argus[0];
    results[keys[i]] = argus.length === 2 ? argus[1] : _.rest(argus);

    if (_.all(done, _.identity)) {
      var err = _.any(errors) ? errors : null;
      doFinal(err, results);
    }
  }

  var doFinal = function(err, results)
  {
    finalCallback.apply(this, arguments);
  }

  if (numItems > 0) {
    _.each(_.range(numItems), function(i) {
      doOne(i);
    });
  }
  else {
    var err = _.any(errors) ? errors : null;
    doFinal(err, results);
  }

  return numItems;
};

var __ = utils.__;

// --------------------------------------
// exec utilities
// --------------------------------------

/**
 *  How verbose should you be?
 *
 *  Looks at the verbosity level in the options object first, then in the env.
 */
var executeVerbosity = function(options)
{
  if ('verbose' in options)
    return options.verbose;

  var envVerbose = process.env.SG_VERBOSE_EXECUTION;
  if (envVerbose)
    return Number(envVerbose);

  return 0;
}

/**
 *  Like exec and spawn, but takes the easiest parts of both, like
 *  taking the command line as an array
 *
 *  options:
 *    time -- should the execution be timed? (true for spawn-like executions, false otherwise)
 */
var execute = function(cmdLine, options, callback)
{
  var command, timeIt;

  // If the first param is a string, treat like exec
  if (_.isString(cmdLine)) {
    timeIt  = ('time' in options);
    command = (timeIt ? '/usr/bin/time ' : '') + cmdLine;

    if (executeVerbosity(options) > 0)
      console.log(command);

    return exec(command, function(err, stdout, stderr) {
      if (executeVerbosity(options) > 1) {
        if (stdout.length)
          console.log(stdout);
        if (stderr.length)
          console.error(stderr);
      }
      return callback.apply(this, arguments);
    });
  }

  // The first parameter is not a string, treat like spawn

  // Should we time the execution?
  timeIt = ('time' in options) ? options.time : true;
  var cmdArray = [timeIt ? '/usr/bin/time' : ''].concat(cmdLine);

  // Sanitize (flatten and de-falsy) the command line Array
  cmdArray = _.filter(_.flatten(cmdArray), _.identity);

  command = cmdArray.shift();

  return executeRaw(command, cmdArray, options, callback);
}
utils.execute = execute;

/**
 *  The same as execute, but the input parameters must already be right.
 */
var executeRaw = function(command, cmdLineOptions, options, callback)
{
  var proc = spawn(command, cmdLineOptions);

  if (executeVerbosity(options) > 0)
    console.log(command, cmdLineOptions.join(' '));

  var stdoutChunks = [], stderrChunks = [];

  proc.stdout.on('data', function(chunk) {
    stdoutChunks.push(chunk);
    if (executeVerbosity(options) > 1)
      console.log(chunk.toString());
  });

  proc.stderr.on('data', function(chunk) {
    stderrChunks.push(chunk);
    if (executeVerbosity(options) > 1)
      console.error(chunk.toString());
  });

  proc.on('exit', function(code) {
    var err = (code === 0) ? null : {exitCode:code};
    return callback(err, stdoutChunks.join(''), stderrChunks.join(''));
  });
}

// --------------------------------------
// DB utilities
// --------------------------------------

/**
 *  Connect to a DB and get the collections you want.
 *
 *  @param {Object} mongoMod -- The caller provides the mongo module object.
 *  @param {Object} params --
 */
utils.dbConnect = function(mongoMod, params, callback)
{
  // The final output of the function
  var ret = {};

  // Connect to the DB
  var dbAccess = new mongoMod.DbAccess(params.dbName);
  ret.dbAccess = dbAccess;

  return dbAccess.open(function(err, db) {
    if (err) return err;

    ret.db = db;

    __.map(params.collections,
      function(collectionName, next) {
        return db.collection(collectionName, function(err, c) {
          return next(err, {name:collectionName, collection:c});
        });
      },

      function done(err, collections) {

        // Package the collections as an object
        ret.collections = _.reduce(collections, function(m, c) {
          m[c.name] = c.collection;
          return m;
        }, {});

        return callback(err, ret);
      }
    );
  });
}

// --------------------------------------
// File and dir utilities
// --------------------------------------

/**
 *  mkdir -p -- creates the dir and any needed parents
 */
utils.mkdirP = function(dirname, callback)
{
  return fs.stat(dirname, function(err, stats) {
    // If the dir exists, no need to create it
    if (!err && stats.isDirectory()) return callback(null, dirname);

    // The dir doesn't exist -- create it
    return execute('mkdir -p ' + dirname, {}, function(err, stdout, stderr) {
      if (err) return callback(_.extend({stdout:stdout}, err));

      return callback(null, dirname);
    });
  });
}
var mkdirP = utils.mkdirP;

/**
 *  Build the full pathname to the subdir of the tmp folder, and make sure it exists.
 */
utils.tmpDir = function(subDir, callback)
{
  var fullPath = path.join(process.env.SG_TMP || '/tmp', subDir);

  // Ensure it exists, and callback
  return mkdirP(fullPath, callback);
}

/**
 *  Apply the JSON to an object.
 */
utils.applyJsonSync = function(json, obj)
{
  _.each(json, function(cmdObj) {
    _.each(cmdObj, function(args, cmd) {
      var fn = obj[cmd];
      if (_.isFunction(fn)) {
        fn.apply(this, args);
      }
      else {
        console.error('!!! not found: ', cmd, args);
      }
    });
  });

  return obj;
}

/**
 *  Download the file into the named dir, if necessary
 */
utils.downloadToDirIfNeeded = function(url_, dirname, callback)
{
  var url = urlLib.parse(url_);
  var urlDirname = path.dirname(url.pathname);
  var urlFilename = path.basename(url.pathname);

  var fileDirname = path.join(dirname, urlDirname);
  var filename = path.join(fileDirname, urlFilename);

  return mkdirP(fileDirname, function(err) {
    if (err) return callback.apply(this, arguments);

    return downloadIfNeeded(url_, filename, callback);
  });
}
var downloadToDirIfNeeded = utils.downloadToDirIfNeeded;

/**
 *  Download the file, if necessary
 */
utils.downloadIfNeeded = function(url, filename, callback)
{
  return fs.stat(filename, function(err, stats) {

    // If it exists, we're done.
    if (!err && stats.isFile()) return callback(null, filename);

    // Not there, fetch it
    return downloadFile(url, filename, callback);
  });
}
var downloadIfNeeded = utils.downloadIfNeeded;

/**
 *  Download a file to a dir
 */
utils.downloadToDir = function(url_, dirname, callback)
{
  var url = urlLib.parse(url_);
  var urlDirname = path.dirname(url.pathname);
  var urlFilename = path.basename(url.pathname);

  var fileDirname = path.join(dirname, urlDirname);
  var filename = path.join(fileDirname, urlFilename);

  mkdirP(fileDirname, function(err) {
    if (err) return callback.apply(this, arguments);

    downloadFile(url_, filename, callback);
  });
}
var downloadToDir = utils.downloadToDir;

/**
 *  Download a file
 */
utils.downloadFile = function(url, filename, callback)
{
  return execute(['curl', url, '-o', filename], {}, function(err, stdout, stderr) {
    if (err) return callback({error:err, stdout:stdout, stderr:stderr});

    return callback(null, filename);
  });
}
var downloadFile = utils.downloadFile;


/**
 *  Export all sub-objects of the lib.
 */
var exportify = function(lib, exportsObj_)
{
  var exportsObj = exportsObj_ || exports;
  for (var k in lib) {
    if (!(k in exportsObj)) {
      exportsObj[k] = lib[k];
    }
  };
};

exportify(utils);


/**/
