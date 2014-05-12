/*-------------------------------------------------------------------------*
Set Job Scheduling in VM Jobs.

* DEPENDENCIES
*  - node-schedule.js
*  - http.js
*-------------------------------------------------------------------------*/

var http     = require('http');
var utils    = require('./utils.js');
var common   = require('./common.js');
var vmUtils = require('./vmUtils.js');
var async  = require('async');

var saveJob = function(jobsCollection, context, callback) {
  var job = common.httpBody(context.req);
  if(!job.Tests || !job.platforms || !job.server || !job.name)
    return context.sendJson([], 404);
  var jobId = parseInt(job.id || 0);

  var upsertJob = function(jobId) {
    job.id = jobId;
    job.creationTime = new Date();

    jobsCollection.update({id: jobId}, {$set: job}, {upsert: true, safe: true}, function (err, result) {
      if(err) {
        console.log(err);
        return context.sendJson(err, 404);
      }
      context.sendJson({jobId:jobId}, 200);
    });
  };

  if(jobId == 0) { // add new
    jobsCollection.findOne({},{"sort":[['id','desc']]}, function(err, result){
      if(!err && result) jobId = result.id || 0;
      jobId++;

      upsertJob(jobId);
    });
  } else {
    upsertJob(jobId);
  }
};

var createTestRun = function(context, callback) {
  var job = common.httpBody(context.req);
  if(!job.Tests || job.Tests.length==0 || !job.os || !job.server || !job.browser)
    return callback({});
  
  job.id = (job.Tests[0].id || 0);
  job.creationTime = new Date();
  job.runId = job.creationTime.getTime(); 
  
  queueJob(job, context.db.JobQ, function(err, res) {
    vmUtils.launchVm(job.os, function(err, res) {
      callback(err, {jobId:job.id, runId:job.runId});  
    });
  });
}

var qInsert = {};
var qCheck  = {};
var checkQChanged = function(os) {
  var res = true;
  if(!qInsert[os]) {
    qInsert[os] = (new Date()).getTime();
  } else {
    res = (qInsert[os] > qCheck[os]);
  }
  
  qCheck[os] = (new Date()).getTime() - 1000;
  return res;
}

var checkPollingStatus = function(vmName, callback, nowait/*=null*/) {
  console.log(qCheck, vmName, ((new Date()).getTime() - qCheck[vmName]));
  if(qCheck[vmName]) {
    
    var recentPolling = ((new Date()).getTime() - qCheck[vmName]) <= 3000;
    if(nowait || recentPolling)
      return callback({res:recentPolling});
    
    return setTimeout(function(){ checkPollingStatus(vmName, callback, true); }, 3000);
  }
  
  callback({res:false});
}

var queueJob = function(job, JobQ, callback){
  JobQ.insert(job, {safe: true}, function (err, result) {
    if(err) console.log(err);
    
    qInsert[job.os] = (new Date()).getTime(); // update last insert time
    
    console.log(result, 'Job queued');
    callback(null, {res:true});
  });
};

var getQJobs = function(context, callback) {
  if(!context.query.os || !context.query.vms)
    return callback(['Invalid request']);
  
  var os = context.query.os;
  var vms = context.query.vms;
  var vmName = vms+'/'+os;
  
  var pollTm = 120 * 1000;
  var startTm = new Date().getTime();
  
  var checkQueue = function() {
    if(context.req._clientClosed)
      return callback(null, []);
    
    if(!checkQChanged(vmName)) {
      if((new Date().getTime() - startTm) > pollTm)
        return callback(null, []);
      else {
        return setTimeout(function() { checkQueue(); }, 1000);
      }
    }
    else {
      context.db.JobQ.findAndRemove({os:vmName}, function(err, job) { //TODO: Filter
        if(err || !job) {
          if((new Date().getTime() - startTm) > pollTm)
            return callback(err, []);
          else {
            return setTimeout(function() { checkQueue(); }, 1000);
          }
        }
        
        qInsert[vmName] = (new Date()).getTime() + 1000;
        console.log(job);
        callback(null, [job]);
      });
    }
  };
  
  checkQueue();
}

var getJobs = function(cxt, callback) {
  var sortby = cxt.query.sortby || 'creationTime';
  var order =  cxt.query.order || 'desc';
  
  cxt.db.Jobs.find({},{"sort":[[sortby,order]]}, function(err, result){
    if(err) return callback(err);
    result.toArray(callback);
  });
}

exports.saveJob = saveJob;
exports.createTestRun = createTestRun;
exports.queueJob = queueJob;
exports.getQJobs = getQJobs;
exports.getJobs = getJobs;
exports.checkPollingStatus = checkPollingStatus;

