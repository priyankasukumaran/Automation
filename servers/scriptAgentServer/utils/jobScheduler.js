
var schedule    = require('node-schedule');
var http        = require('http');
var utils       = require('./utils.js');
var common      = require('./common.js');
var vmUtils     = require('./vmUtils.js');
var jobHdlr     = require('./jobHandler.js');
var async       = require('async');
var reportUtil  = require('./mail.js');
var gitUtils    = require('./gitUtils.js');

var jobSchedule = function(mode, db) {
  var self = this;

  var scheduleTimes = {daily:[01, 00], weekly:[05, 0]}; //daily 1:00AM , weekly 5:00 AM, Sunday
  self.init = function() {
    scheduleRecurringJob();
  }

  var scheduleRecurringJob = function() {
    var rule = {hour: scheduleTimes[mode][0], minute:scheduleTimes[mode][1]};
    if(mode == 'weekly') rule.dayOfWeek = 0; // 0 = Sunday

    self.job = schedule.scheduleJob(rule, function () {
      runScheduledJobs(mode, db);
    });
  };

  self.init();
}

var runScheduledJobs = function(mode, db) {
  db.Jobs.find({mode:mode}, function(err, result){
    result.toArray(function(err, jobs){
      runJobs(jobs, mode, db);
    });
  });
}

common.getScriptPath({}, function(scriptPath){
  console.log(scriptPath);
});

var triggerJob = function(cxt, callback) {
  if(!cxt.query.jobid) return callback(["Invalid Request"]);
  
  var jobId = parseInt(cxt.query.jobid);
  cxt.db.Jobs.findOne({id:jobId}, function(err, job) {
    if(err || !job) return callback(["Invalid job id"]);
    
    if(cxt.query.server)
      job.server = cxt.query.server; //Override server
    
    runJobs([job], 'triggered', cxt.db);
    callback(null, {res:true});
  });
}

var runStr = '{"quedJobs":{"4":{"_id":"53446c1db766d2196af59c2d","Tests":["97","50","55","77","14","49","3","42","36","48"],"creationTime":"2014-04-08T21:41:30.801Z","id":4,"mode":"none","name":"Run all","platforms":["Win7-IE","Win7-GC","Win7-FF"],"server":"http://integration.twosmiles.com","subscribers":["shaibujan.thankappan@hp.com"],"tagname":"HEAD","test_type":"recurring","quedTests":[{"testId":14,"runId":1396994931365,"job":4},{"testId":77,"runId":1396994931368,"job":4},{"testId":36,"runId":1396994931369,"job":4},{"testId":55,"runId":1396994931370,"job":4},{"testId":42,"runId":1396994931371,"job":4},{"testId":50,"runId":1396994931372,"job":4},{"testId":3,"runId":1396994931373,"job":4},{"testId":97,"runId":1396994931374,"job":4},{"testId":49,"runId":1396994931374,"job":4},{"testId":48,"runId":1396994931375,"job":4}]}},"quedTests":[{"testId":14,"runId":1396994931365,"job":4},{"testId":77,"runId":1396994931368,"job":4},{"testId":36,"runId":1396994931369,"job":4},{"testId":55,"runId":1396994931370,"job":4},{"testId":42,"runId":1396994931371,"job":4},{"testId":50,"runId":1396994931372,"job":4},{"testId":3,"runId":1396994931373,"job":4},{"testId":97,"runId":1396994931374,"job":4},{"testId":49,"runId":1396994931374,"job":4},{"testId":48,"runId":1396994931375,"job":4}],"mode":"triggered"}';
var runJobs = function(jobs, mode, db) {
  /*reportUtil.sendJobReport(JSON.parse(runStr), db, function() {
    console.log('====== REPORTING DONE =======');
  });
  return;*/
  var runInfo = {quedJobs:{}, quedTests:[], mode:mode};
  async.each(jobs, function(job, job_callback) {
    console.log('Running Job: ', job);
    if(job.Tests.length == 0) return job_callback();
    
    job.quedTests = [];
    gitUtils.initScriptDir({tag:job.tagname || 'HEAD'}, function(err, reply) {
      vmUtils.getVMsWithCaps(job.platforms, function(VMCaps) {
        var VMs = Object.keys(VMCaps);
        console.log(VMs);
        if(VMs.length == 0) return job_callback();
        
        async.each(VMs, function(VM, vm_callback){
          vmUtils.launchVm(VM, function(err, res){
            // TODO: remove VMs with error.
            vm_callback();
          });
        }, function(err){
          runInfo.quedJobs[job.id] = job;
          
          async.each(job.Tests, function(testid, test_callback) {
            db.Tests.findOne({id:testid}, function(err, test){
              if(err || !test) return test_callback();
              
              async.each(VMs, function(VM, vm_callback){
                var ujob = {Tests:[test]};
                ujob.id = parseInt(testid);
                ujob.creationTime = new Date();
                ujob.runId = Math.floor((1+Math.random()) * 0x10000000);
                ujob.os = VM;
                ujob.browser = VMCaps[VM];
                ujob.server = job.server;
                ujob.tag = job.tagname || 'HEAD';
                
                runInfo.quedJobs[job.id].quedTests.push({testId:ujob.id, runId:ujob.runId, job:job.id});
                runInfo.quedTests.push({testId:ujob.id, runId:ujob.runId, job:job.id});
                console.log('Unit Job: ', ujob);
                
                jobHdlr.queueJob(ujob, db.JobQ, function(err, res) {
                  vm_callback();
                });
              }, function(err) {
                test_callback();
              });
            });
          }, function(err){
            job_callback();
          });
        });
      });
    });
  }, function(err){
    //wait & email
    waitForJobsDone(runInfo.quedTests, {}, db, function(err){
      console.log('====== JOBS DONE =======');
      reportUtil.sendJobReport(runInfo, db, function(){
        console.log('====== REPORTING DONE =======');
      });
    });
  });
}

var waitForJobsDone = function(quedTests, waitInfo, db, callback) {
  if(!waitInfo.start) waitInfo.start = new Date();
  else {
    var maxWaitTm = Math.max(quedTests.length * 5 * 60000, 60 * 60000); // allow max 10 minutes per job (?)
    if(((new Date()).getTime() - waitInfo.start.getTime()) > maxWaitTm)
      return callback({error:"Timed out"});
  }
  
  setTimeout(function(){
    var ids=[], runs=[];
    async.each(quedTests, function(info, qinfo_callback){
      ids.push(info.testId);
      runs.push(info.runId);
      qinfo_callback();
    }, function(err){
      db.TestStatus.count({id:{$in:ids}, runId:{$in:runs}, status:"done"}, function(err, count) {
        console.log('Jobs Done: ', count, ' of ', quedTests.length);
        if(!err && count == quedTests.length)
          callback();
        else
          waitForJobsDone(quedTests, waitInfo, db, callback);
      });
    });
  }, 30000);
}

var dailySchedule = null, weeklySchedule = null;
var init = function(dbCollections) {
  dailySchedule = new jobSchedule('daily', dbCollections);
  weeklySchedule = new jobSchedule('weekly', dbCollections);
}

//export from module
exports.init = init;
exports.triggerJob = triggerJob;

