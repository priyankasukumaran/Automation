
/**
 *  @fileOverview The interface to mongodb.
 */

var _                 = require('./underscore');

var Db                = require('mongodb').Db;
var Connection        = require('mongodb').Connection;
var Server            = require('mongodb').Server;
//var BSON            = require('mongodb').BSONNative;
var BSON              = require('mongodb').BSONPure;


/**
 *  Access to the node-mongo DB driver, but in a safe way.
 *
 *  The node-mongo driver does not use _try_ appropriately.  These "Safe..." objects protect
 *  you from that problem, but otherwise give you full access to it's collection and cursor
 *  objects.
 */
exports.DbAccess = function(name, host_, port_)
{
  var self = this;

  var host = host_ || process.env.SG_DB_HOST         || 'localhost';
  var port = port_ || Number(process.env.SG_DB_PORT) || 27017;

  var theDb = new Db(name, new Server(host, port, {safe:true})/*, {native_parser:true}*/);

  self.open = function(callback)
  {
    return theDb.open(function(err, db) {

      process.nextTick(function() {
        return callback(err, new mongodb(db));
      });
    });
  }

}

/**
 *  The DB object.
 */
var mongodb = function(db)
{
  var self = this;

  self.collection = function(name, callback)
  {
    return db.collection(name, function(err, collection) {

      process.nextTick(function() {
        return callback(err, new mongoCollection(collection));
      });
    });
  }

  self.base = db;
  self.close = function()
  {
    db.close();
  }

	self.getLastError = function(callback)
  {
    db.lastError(function() {
      var args = arguments;
      process.nextTick(function() {
        callback.apply(this, args);
      });
    });
  }
}

var mongoCollection = function(collection, watchedAttrs)
{
  var self = this;
  self.base = collection;

  //  addProtected(self, 'find');         // Various parameter patterns:
  // callback?
  // selector, callback?,
  // selector, fields, callback?
  // selector, options, callback?
  // selector, fields, options, callback?
  // selector, fields, skip, limit, callback?
  // selector, fields, skip, limit, timeout, callback?
  //
  // Options
  //  - **limit** {Number, default:0}, sets the limit of documents returned in the query.
  //  - **sort** {Array | Object}, set to sort the documents coming back from the query. Array of indexes, [['a', 1]] etc.
  //  - **fields** {Object}, the fields to return in the query. Object of fields to include or exclude (not both), {'a':1}
  //  - **skip** {Number, default:0}, set to skip N documents ahead in your query (useful for pagination).
  //  - **hint** {Object}, tell the query to use specific indexes in the query. Object of indexes to use, {'_id':1}
  //  - **explain** {Boolean, default:false}, explain the query instead of returning the data.
  //  - **snapshot** {Boolean, default:false}, snapshot query.
  //  - **timeout** {Boolean, default:false}, specify if the cursor can timeout.
  //  - **tailable** {Boolean, default:false}, specify if the cursor is tailable.
  //  - **batchSize** {Number, default:0}, set the batchSize for the getMoreCommand when iterating over the query results.
  //  - **returnKey** {Boolean, default:false}, only return the index key.
  //  - **maxScan** {Number}, Limit the number of items to scan.
  //  - **min** {Number}, Set index bounds.
  //  - **max** {Number}, Set index bounds.
  //  - **showDiskLoc** {Boolean, default:false}, Show disk location of results.
  //  - **comment** {String}, You can put a $comment field on a query to make looking in the profiler logs simpler.
  //  - **raw** {Boolean, default:false}, Return all BSON documents as Raw Buffer documents.
  //  - **read** {Boolean, default:false}, Tell the query to read from a secondary server.

  self.find = function()
  {
    //say(706, arguments);
    return new mongoCursor(collection.find.apply(collection, arguments));
  }

  addProtected(self, 'findOne');

  addProtected(self, 'insert');         // docs, options, callback
  addProtected(self, 'remove');         // selector, options, callback
  addProtected(self, 'rename');         // newName, callback
  addProtected(self, 'save');           // doc, options, callback
  addProtected(self, 'update');         // selector, document, options, callback
  addProtected(self, 'distinct');       // key, query, callback
  addProtected(self, 'count');          // query, callback
  addProtected(self, 'drop');           // callback
  addProtected(self, 'findAndModify');  // query, sort, doc, options, callback
  addProtected(self, 'findAndRemove');  // query, sort, options, callback
  addProtected(self, 'createIndex');    // fieldOrSpec, options, callback
  addProtected(self, 'ensureIndex');    // fieldOrSpec, options, callback
  addProtected(self, 'dropIndex');      // name, callback
  addProtected(self, 'reIndex');        // callback
  addProtected(self, 'mapReduce');      // map, reduce, options, callback
  addProtected(self, 'group');          // keys, condition, initial, reduce, finalize, command, callback
  addProtected(self, 'options');        // callback
  addProtected(self, 'isCapped');       // callback
  addProtected(self, 'indexExists');    // indexes, callback
  addProtected(self, 'geoNear');        // x, y, options, callback
  addProtected(self, 'indexes');        // callback
  addProtected(self, 'aggregate');      // pipeline, callback
  addProtected(self, 'stats');          // options, callback
  addProtected(self, 'geoHaystackSearch'); // x, y, options, callback
  addProtected(self, 'dropAllIndexes');    // callback
  addProtected(self, 'indexInformation');  // options, callback

}

var mongoCursor = function(cur)
{
  var self = this;

  self.base = cur;

  addProtected(self, 'rewind');         //
  addProtected(self, 'toArray');        // callback
  addProtected(self, 'each');           // callback
  addProtected(self, 'count');          // callback
  addProtected(self, 'sort');           // keyOrList, direction, callback
  addProtected(self, 'limit');          // limit, callback
  addProtected(self, 'skip');           // skip, callback
  addProtected(self, 'batchSize');      // batchSize, callback
  addProtected(self, 'nextObject');     // callback
  addProtected(self, 'explain');        // callback
  addProtected(self, 'stream');         //
  addProtected(self, 'close');          // callback
  addProtected(self, 'isClosed');       //
}

var addProtected = function(self, fname)
{
  self[fname] = function()
  {
    //say(705, fname, arguments);
    return protect(self.base, fname, arguments);
  }

}

/**
 *  This is the function that protects you from the node-mongo driver's bad use
 *  of _try_.  Every callback that you pass to it is now broken out of it's call
 *  stack by using process.nextTick().
 */
var protect = function(obj, fname, argus)
{
  //say(704, arguments);

  if (!(fname in obj)) {
    //say(900, fname, 'not in ', obj);
    return;
  }

  var initialArgs = _.initial(argus);
  var callback    = _.last(argus);

  return obj[fname].apply(obj, initialArgs.concat([function(err /*, ...*/) {
    if (err) {
      //say(901, err, fname, initialArgs);
    }

    if (callback) {
      var origCbArgs = arguments;

      // Calling the callback here on nextTick is what breaks us out.  But doing so
      // loses our current call stack, which makes debugging hard. So you can avoid
      // the breakout to get a call stack.
      if (process.env.SG_DB_IMMEDIATE_CALLBACK) {
        return callback.apply(this, origCbArgs);
      }
      else {
        process.nextTick(function() {
          return callback.apply(this, origCbArgs);
        });
      }
    }
  }]));
}



/**/
