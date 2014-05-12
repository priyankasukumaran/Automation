var fs = require('fs');
var http = require('http');
var exec = require('child_process').execFile;
var preRequests = require('./preRequisites.js');
var EventEmitter = require("events").EventEmitter;

//Begin Synchronized Array
function SyncArray(array) { this.array = array; };
require("util").inherits(SyncArray, EventEmitter);

SyncArray.prototype.forEach = function(callback, finishedCallback) {
	var self = this;
  
	this.on("nextElement", function(index, callback, finishedCallback) {
		self.next(++index, callback, finishedCallback);
	});
	
	this.on("finished", function() {
	});
	
	self.next(0, callback, finishedCallback);
};

SyncArray.prototype.next = function(index, callback, finishedCallback) {
	var self = this;
	var obj = index < self.array.length ? self.array[index] : null;
	if (obj) {
		callback(obj, index, self.array, function() {
			self.emit("nextElement", index, callback, finishedCallback);
		});
	}
	else {
		finishedCallback();
		self.emit("finished");
	}
};
//End Synchronized Array


// start helper
var reqProcessor = function (options, callback) {
  //make http requests
  var req = http.request(options, function (res) {
    var result = '';
    //handle response
    res.on('data', function (data) {
      result += data.toString();
    });
    res.on('end', function () {
      if(result.length == 0) result = '[]';
      console.log('HTTP request result:' + result);
      if(callback) callback(result.toString());
      callback = null;
    });
  });
  req.on('error', function (e) {
    console.log('HTTP request error:' + e.message);
    if(callback) callback('[]');
    callback = null;
  });
  req.end('');
};

// prepare params from job details for initiating testing
var prepareTest = function (jobDetails, callback) {
  if(jobDetails.length == 0) return callback();
  
  var syncJobs = new SyncArray(jobDetails);
  syncJobs.forEach(function(jobDetail, i, array, finishedJob) {
    var testIds = {jobId: jobDetail.id, runId: jobDetail.runId || 0};
    var syncTests = new SyncArray(jobDetail.Tests);
    var syncBrowser = new SyncArray(jobDetail.browser);
    sendJobStatus(testIds, 'progress', function(reply) {
    
      syncTests.forEach(function(tests, i, array, finishedTest) {
      
        syncBrowser.forEach(function(browser, i, array, finishedBrowser) {
        
          sendJobStatus(testIds, 'progress', function(reply) {
          
            var input = 'browser=' + browser + "&test=" + tests.script + "&os=" + encodeURIComponent(jobDetail.os) 
                + "&testServer=" + encodeURIComponent(jobDetail.server + tests.launch) + "&jobid=" + jobDetail.id + "&runId=" + (jobDetail.runId || '0')
                + "&params=" + encodeURIComponent(JSON.stringify(tests.params || {}));
            setTimeout(function() {
              runTest(input, function() {
                console.log('Done test-------' + input);
                finishedBrowser();
              });
            }, 5000);
          }); //send job status
        }, function() {
          console.log('finished');
          finishedTest();
        }); // syncBrowser end
      }, function() {
        sendJobStatus(testIds, 'done', function(reply) {
          finishedJob();
        });
      }); // syncTests end
    }); // job Status
  }, function() {
    console.log('Jobs finished');
    callback();
  }); // syncJobs end
};

var server, portNo, vmServer, vmName;
var sendJobStatus = function(testIds, status, callback) {
  var runTest = {
    host: server,
    path: '/setJobStatus?jobid=' + testIds.jobId + '&runId=' + testIds.runId + '&status=' + status,
    port: portNo,
    method: 'GET'
  };
  //make http call for start test
  reqProcessor(runTest, function (data) {
    console.log("Debug: Test Result = ");
    console.log(data);
    callback(data);
  });
};

// run test
var runTest = function (input, callback) {

  var runTest = {
    host: server,
    path: '/runTest?' + input,
    port: portNo,
    method: 'GET'
  };
  //make http call for start test
  reqProcessor(runTest, function (data) {
    console.log("Debug: Test Result = ");
    console.log(data);
    callback(data);
  });
};

var waitForJobs = function() {
  fetchJobDetails(function() {
    setTimeout(function(){waitForJobs();}, 2000);
  });
}

var loadServerInfo = function(callback) {
  server = 'loki-hp.dhcp.sdd.hp.com';
  portNo = '9080';
  
  var configPath = __dirname + "\\vm_config.json";
  fs.readFile(configPath, 'utf8', function (err, data) {
    var vmConfig = {};
    if(!err) vmConfig = JSON.parse(data);
    
    vmServer = vmConfig.VMServer || '';
    if(vmConfig.ScriptServer) {
      server = vmConfig.ScriptServer.hostname;
      portNo = vmConfig.ScriptServer.port;
    }
    
    callback();
  });
}

// end helper
var main = function () {
  vmName = process.argv[2] || 'VM-WIN7-64';
  
  process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log(err);
  });
  
  var flag = false;
  loadServerInfo(function() {
    console.log([vmName, server, portNo]);
    
    preRequests.doPreRequisites(function (status, err) {
      if (err) {
        console.log('Error::' + err);
        return;
      } else {
        console.log(status);
        //console.log(process.argv[2]);
        // fetch job   
        if(flag == false) {      
          flag = true;
          waitForJobs();
        }
      } //else
    }); //preRequests
  });
}; // End main

var fetchJobDetails = function (callback) {
  var options = {
    host: server,
    path: '/getQJobs?os=' + encodeURIComponent(vmName) + '&vms=' + encodeURIComponent(vmServer) + '&rand=' + (new Date().getTime()), //TODO: get it dynamically
    port: portNo,
    method: 'GET'
  };
  reqProcessor(options, function (jobDetails) {
    jobDetails = JSON.parse(jobDetails);
    if(jobDetails.length == 0 || (jobDetails[0].runId || 0) == 0) return callback();
    
    console.log('Debug:::::::::::::::::::::::::::::');
    console.log(jobDetails);
    prepareTest(jobDetails, function () {
      console.log('Done-------');
      callback();
    });
  }); // reqProcessor	
}

main();