/*-------------------------------------------------------------------------*
Methods to handle run unit test ,send mail reports,write test reports to file,and 
get the path of test script details 

* DEPENDENCIES
*  - common.js
*  - mkdirp.js
*  - fs.js
*  - child_process.js
*  - mail.js
*-------------------------------------------------------------------------*/

var mkdirp = require('mkdirp');
var fs     = require('fs');
var path     = require('path');
var utils  = require('./common.js');
var spawn  = require('child_process').spawn;
var mails  = require('./mail.js');
var http   = require('http');
var _      = require('../libs/underscore.js');
var async  = require('async');
var vmUtils= require('./vmUtils.js');
var exec   = require('child_process').exec;

/**
Methods write test reports to file
@params
reportPath    -Path of unit test report
requestedTests-Unit test details
callback
*/
var gBrowsers = {IE:"Internet Explorer", GC:"Google Chrome", FF:"Firefox", SAF:"Safari"}

var reportJsonToHTML = function(browser, report, callback) {
  var html = '<div class="reportInfo">\n<div class="testInfo">';
  html += '<div><label><b>Test name:</b> </label><span>' + (report.testName || 'Unknown')  + '</span></div>';
  html += '<div><label><b>Operating System:</b> </label><span>' + (report.OS || 'Unknown')  + '</span></div>';
  html += '<div><label><b>Browser:</b> </label><span>' + gBrowsers[browser] + ' ' + (report.browserVer || '')  + '</span></div>';
  html += '<div><label><b>Launch URL:</b> </label><span>' + (report.launchUrl || '/')  + '</span></div>';
  html += '</div>\n';

  html += '<div class="testLog">';
  var data = report.result || '';
  data = data.replace(/\n/g, '<br />');
  data = data.replace(/Passed/g, '<span class="pass">Passed</span>');
  data = data.replace(/Failed/g, '<span class="fail">Failed</span>');
  html += '<h3>Log:</h3><div>' + data + '</div>';
  var error = report.error || '';
  if(error.length > 0) {
    error = error.replace(/\n/g, '<br />');
    html += '<h3>Errors:</h3><div>' + error + '</div>';
  }
  if(report['screenshot'])
    html += '<h3>Images:</h3><div><a target="_blank" href="' + report.screenshot + '">Error screenshot</a></div>';
  html += '</div>\n';
  html += '</div>\n';
  
  callback(html);
}

var checkTestResult = function(report) {
  return (report.result.length > ("test passed".length)
      && report.result.indexOf("\nTest Passed\n") >= 0);
}
var writeReport = function (reportPath, key, report, stat, statusCollection, callback) {

  fs.readFile(reportPath, function(err, data) {
    console.log(JSON.stringify(report));

    var newReport = {};
    if(!err && data) {
      try {
        newReport = JSON.parse(data);
      } catch(e){}
    }
    newReport[key] = report;
    fs.writeFile(reportPath, JSON.stringify(newReport), function (err) {
      //if (err) //say(err);
      saveTestStatus(stat.id, stat, statusCollection, function (err) {
        callback(err);
      });
    });
  });
}

var setJobStatus = function(statusCollection, cxt) {
  var query = cxt.query;
  if(!query.jobid || !query.runId) return cxt.sendJson({}, 404);

  var jobId = parseInt(query.jobid);
  var runId = parseInt(query.runId);
  var vmIp = cxt.req.connection.remoteAddress || '';
  var stat = query.status || 'progress';
  var teststat = {id:jobId, runId:runId, vmip:vmIp, counter:0, status:stat};

  saveTestStatus(jobId, teststat, statusCollection, function (err) {
    cxt.sendJson({reply:'OK'}, 200);
  });
};

/*
Methods to run Vm tests and unit tests.
@params
context
*/
var runTest = function (context, statuscollection, subscription) {
  console.log('context.query.................................................');
  console.log(context.query);
  var query = context.query;
  var jobId = parseInt(query.jobid);
  var runId = parseInt(query.runId || '0');
  var browserCode = (query.browser || 'FF');
  var browser = 'browser=' + (query.browser || 'FF');
  var os = query.os;
  var destip = 'remoteAddress=' + (query.destip || context.req.connection.remoteAddress)  + ':' + (query.destport || '4444');
  var testServer = 'testServer=' + (query.testServer || 'http://panini:Dunn!@integration.twosmiles.com');
  var scriptDir = context.scriptPath + '/products/' + (query.product || 'panini') + '/';
  var params = query.params && JSON.parse(query.params) || {};
  var cusParams = [];
  for (var k in params) cusParams.push(k + '=' + params[k]);

  var vmIp = context.req.connection.remoteAddress || '';
  var testName = browserCode;
  
  var webServer = query.testServer;
  var launchUrl = '/';
  if(query.testServer.indexOf('/', 9) > 0) {
    webServer = query.testServer.substring(0, query.testServer.indexOf('/', 9));
    launchUrl = query.testServer.substr(query.testServer.indexOf('/', 9));
  }

  var teststat = {id:jobId, runId:runId, vmip:vmIp, status:'progress'};
  var report = {
      server:webServer, launchUrl:launchUrl, params:cusParams, OS:'', startTm: new Date().getTime(),
      result:"", error:""
    };

  utils.getScriptPath({tag:(query.tag || 'HEAD')}, function(scriptPath) {
    var scriptFilePath = scriptPath + '/' + query.test + '.rb';
    
    vmUtils.getVMInfo(os, function(err, VMInfo) {
      if(!err && VMInfo.OS) {
        report.OS = VMInfo.OS;
        report.browserVer = VMInfo.CAPS[browserCode] || '';
      }
      
      utils.getTempDir(jobId + '/' + runId, function (err, reportDir) {

        var reportFile = reportDir + "report.json";
        writeReport(reportFile, browserCode, report, teststat, statuscollection, function (err) {
    
          var scriptArgs = [scriptFilePath, browser, destip, testServer,
                          'reportDir='+reportDir, 'testName='+testName].concat(cusParams);
          var ruby = spawn('ruby', scriptArgs, {cwd: scriptPath});
          ruby.stdout.on('data', function (chunk) {
            report.result += chunk.toString();
            
            ruby.stdout.pause();
            report.endTm = new Date().getTime();
            writeReport(reportFile, browserCode, report, teststat, statuscollection, function (err) {
              ruby.stdout.resume();
            });
          });
    
          ruby.stderr.on('data', function (chunk) {
            report.error += chunk.toString();
          });

          ruby.on('exit', function (code) {
            report.endTm = new Date().getTime();
            writeReport(reportFile, browserCode, report, teststat, statuscollection, function (err) { //done
              context.sendJson(report, 200);
            }); //writeTempFile
          }); //end exit
        }); //write
      }); //.getTempDir
    });
  });
}

/*
Methods to get path of test script details.
@params
context
*/
var getTestScripts = function (context) {

  utils.getScriptPath({}, function(scriptPath) {
    scriptPath += '/';
    var scriptsWithGroup = {};
    fs.readdir(scriptPath, function(err, subfolder) {
      if(err) return context.sendJson({}, 200);
      var scripts = [];
      for (var j = 0; j < subfolder.length; j++) {
        var scriptsInFolder = [];
        if(fs.lstatSync(scriptPath + subfolder[j]).isDirectory()) {//TODO:change the path variable
          fs.readdirSync(scriptPath + subfolder[j]).forEach(function(file) { //TODO:change the path variable
            if (file.substr(file.length - 3) == '.rb')
            scriptsInFolder.push(file);
          });
          scriptsWithGroup[subfolder[j]] = scriptsInFolder;
        } else {
          if (subfolder[j].substr(subfolder[j].length - 3) == '.rb')
            scripts.push(subfolder[j]);
        }
      }
      scriptsWithGroup["0"] = scripts;
      if(scriptsWithGroup.common)
        delete scriptsWithGroup.common;
      context.sendJson(scriptsWithGroup, 200);
    });
  });
}

/* Method to get recently added test scripts */

var getrecentTestScripts = function (context) {
  var result = [];
  utils.getScriptPath({}, function (scriptPath) {
    console.log(scriptPath)
    scriptPath += '/';
    var command = ' cd ' + scriptPath + ' &&  find -type f -printf %T+\\\\t%p\\\\n | sort -n'
    exec(command, function (error, stdout, stderr) {
      var sortedfiles = stdout.split("\n");
      var getlatest = sortedfiles.slice(-10);
      for (var i = 0; i < getlatest.length - 1; i++) {
        var scriptWithdate = getlatest[i].split("./");
        var timestamp = Number(new Date(scriptWithdate[0].replace("+", " ")));
        result.push({
          date: timestamp,
          script: scriptWithdate[1]
        });
      }
      if (error !== null) {
        console.log('exec error: ' + error);
      }
      console.log(result)
      context.sendJson(result, 200);
    });
  });
}

var saveTestStatus = function (jobid, report, statuscollection, callback) {
  report.counter = (new Date()).getTime();
  statuscollection.update({id:jobid, runId:report.runId}, report, {upsert: true}, function (err, result) {
    callback(err);
  });
}

var _getJobStatus = function(jobId, runId, statusCollection, callback) {
  statusCollection.findOne({id:jobId, runId:runId}, function(err, result){
    if(err || !result) return callback(err, {});
    callback(null, result);
  });
}

var getJobStatus = function(statusCollection, context) {
  var query = context.query;
  if(!query.jobid || !query.runId) return context.sendJson({}, 404);

  var jobId = parseInt(query.jobid);
  var runId = parseInt(query.runId);
  _getJobStatus(jobId, runId, statusCollection, function(err, result) {
    context.sendJson(result, 200);
  });
}

var _getJobReport = function(jobId, runId, callback) {
  utils.getTempDir(jobId + '/' + runId, function (err, reportDir) {
    
    var host = process.env.TEST_SCRIPT_SERVER || 'loki-hp.dhcp.sdd.hp.com';
    
    var reportFile = reportDir + "report.json";
    fs.readFile(reportFile, function(err, data) {
      if(err || !data) return callback(null, {});
      
      var report = JSON.parse(data);
      var tests = Object.keys(report);
      async.each(tests, function(test, test_callback){
        var imgPath = reportDir + test + ".png";
        (fs.exists || path.exists)(imgPath, function(exists){
          if(exists) report[test].screenshot = 'http://' + host + '/getReportImg?jobid=' + jobId + '&runId=' + runId + '&img=' + test + ".png";
          test_callback();
        });
      }, function(err){
        callback(null, report);
      });
    });
  });
}

var getJobReport = function(cxt, callback) {
  var query = cxt.query;
  if(!query.jobid || !query.runId) return callback(['Invalid request']);

  _getJobReport(query.jobid, query.runId, callback);
};

var getReportImg = function(cxt, callback) {
  var query = cxt.query;
  if(!query.jobid || !query.runId || !query.img) return callback(['Invalid request']);

  var jobId = query.jobid;
  var runId = query.runId;
  var img = query.img;
  utils.getTempDir(jobId + '/' + runId, function (err, reportDir) {
    fs.readFile(reportDir + img, function(err, data) {
      if(err || !data) return callback(['File does not exist']);
      
      cxt.sendResponse(data, 200, {'Content-Type': "image/png", 'Content-Disposition': 'inline; filename=' + jobId + '-' + img});
    });
  });
}




var getRescentTests = function(cxt, callback) {
  var sortby = cxt.query.sortby || 'creationTime';
  console.log(sortby);
  var resultingJson = [];
  var order =  cxt.query.order || 'desc';
  cxt.db.TestStatus.find({}, {"sort":[[sortby, order]]}, function(err, result) {
    if(result) {
      if(err) return callback(err);
      result.toArray(function (err, res) {
        var TESTs = res.slice(-10);
        var cnt = 0;
        async.each(TESTs, function (TEST, test_callback) {
          cnt++;
          //if(cnt == 10) cxt.sendResponse(html, 200, {"Content-Type":"text/plain"}); TODO:do only for top 10 tests
          //_getJobReport(91, 1398075922764, function(err, report) {
          if(TEST) {
            _getJobReport(TEST.id, TEST.runId, function (err, report) {
                //cxt.db.Tests.findOne({"id": "27"}, function (err, testDetails) { //fetch test details
                cxt.db.Tests.findOne({"id":TEST.id.toString()}, function(err, testDetails) { //fetch test details
                  if(report && testDetails) {
                   resultingJson.push({ report: report, testdetails: testDetails })
                   test_callback();
                  }
                });
            });
          }
        }, function (err) {
          cxt.sendJson(resultingJson, 200);
        }); //async end
      }); //result toarray end
    }//Error handling
  });
}
var getNewsReport = function(cxt, callback) {
  var file = path.dirname(__dirname) + "/news.json";
  fs.readFile(file, 'utf8', function(err, data) {
    cxt.sendJson(data, 200);
  });
}
//methods exposed
exports.getTestScripts = getTestScripts;
exports.runTest = runTest;
exports.setJobStatus = setJobStatus;
exports.getJobStatus = getJobStatus;
exports.getJobReport = getJobReport;
exports._getJobReport= _getJobReport;
exports.getReportImg = getReportImg;
exports.getrecentTestScripts = getrecentTestScripts;
exports.getRescentTests = getRescentTests;
exports.getNewsReport = getNewsReport;

