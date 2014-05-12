var utils       = require('./common.js');
var mails       = require('./mail.js');

// Method for getTests(Testutils) and getVmps(vmpsutils)

var getItems = function (collection, context) {
  var record = context.query;
  var filter = (record.jobid) ? {
    id: record.jobid
  } : {};
  collection.find(filter, function (err, data) {
    if (err) return context.sendJson(err, 404);
    data.toArray(function (err, results) {
      context.sendJson(results);
    });
  });
}

//method for deleteServer(serverutils) deleteTests(testutils) and deleteVmps(vmpsutils)

var deleteItems = function (collection, context) {
  var record = utils.httpBody(context.req);
  console.log(record);
  var filter = (record.id) ? { id: record.id } : {};
  if (record) {
    collection.remove(filter, function (err, data) {
      return context.sendJson([], 404)
    });
  }
}

//method for saving and adding---(saveSubscription,signUp,addServers,addTests)

var addItems = function (collection, context, shedule, statuscollection) {
  var record = utils.httpBody(context.req);
  if(!record.params) record.params = {};
  collection.update({
    id: record.id
  }, {
    $set: record
  }, {
    upsert: true
  }, function (err, result) {
    if (err) return context.sendJson([], 404);
    context.sendJson({result:'OK'});
  });
}

//sign in
var signin = function (signupCollection, context) {

  var record = utils.httpBody(context.req);
  signupCollection.find({
    email: record.email,
    password: record.password
  }, function (err, result) {
    result.toArray(function (err, output) {
      if (!err) return context.sendJson(output, 200);
    });
  });

}

// for getting weekly daily modes from Jobs collection.

var getMode = function (collection, context) {
  var record = context.query;
  console.log(record);
  collection.find(record, function (err, data) {
    data.toArray(function (err, results) {
      console.log(results);
      if (!err) return context.sendJson(results, 200);
    });
  });
}

var queryCollection = function (collection, context, callback) {
  var filter = utils.httpBody(context.req);
  collection.find(filter, function (err, data) {
    data.toArray(function (err, results) {
      if (!err) callback(results);
    });
  });
}

//generic method to push data into DB
var put = function(collection, record, callback) {
  collection.insert(record, function(err, result) {
    if (!err)
      callback([], 200);
    else
      callback(err, 404);
  });
}

//generic method to read data from DB
var get = function(collection, filter, callback) {
  collection.find(filter, function(err, result) {
    if(err)
      callback(err, 404);
    result.toArray(function (err, output) {
      if (!err)
        callback(output, 200);
      else
        callback(err, 404);
    });
  });
}

//generic method to push data into DB
var update = function(collection, options, record, callback) {
  collection.update(options, {$set: record}, function(err, result) {
    if (!err)
      callback([], 200);
    else
      callback(err, 404);
  });
}

//methods
exports.signin = signin;
exports.addItems = addItems;
exports.getItems = getItems;
exports.deleteItems = deleteItems;
exports.getMode = getMode;
exports.queryCollection = queryCollection;
exports.update = update;
exports.put = put;
exports.get = get;
//exports.getReport = getReport;
