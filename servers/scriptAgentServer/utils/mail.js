var nodemailer = require("nodemailer");
var fs = require('fs');
var path = require('path');
var utils = require('./utils.js');
var async    = require('async');

nodemailer.SMTP = {
  host: 'smtp3.hp.com',
  port: 25
};

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

var messageTempl = '<!DOCTYPE html><html><head>\
<style>\
body{font-size:14px;color:#222;}\
h1{font-size:18px;} h2{font-size:16px;} h3{font-size:15px;} h4{font-size:14px;font-weight:bold;}\
h2,h3,h4{display:inline;}\
.summary,.log{margin:10px;}\
.reportInfo {border: 1px solid #b1b1b1;min-height:200px;margin-bottom:5px;}\
label {font-weight:bold; padding:0 5px 0 5px;display:inline-block;}\
.reportInfo h2 {font-size:14px; text-transform:none;}\
.reportInfo > div {padding:5px;}\
.reportInfo > div > div {padding-left:10px;}\
.reportInfo h3 {font-size: 12px; font-weight:bold;display:block; padding-left:5px; padding-top:5px;}\
.reportInfo .testInfo > div {padding:0;}\
.reportInfo .testLog {padding-top:0;}\
.pass{color: green;font-weight:bold;}\
.fail{color: red;font-weight:bold;}\
.level {padding:10px 0 10px 20px;border-left:1px solid #eee;}\
.level .level{background-color:#fcfcfc;}\
.level .level .level{background-color:#f9f9f9;}\
.stats{margin-top:10px;} .stats label {padding:5px;} .stats span {padding:6px;border:1px solid gray;font-size:16px;}\
</style>\
</head><body><!--REPORT_BODY--></body></html>';

var composeReport = function (job, db, callback) {

  var testReports = '';
  var reportJson = {};
  async.each(job.quedTests, function(jobInfo, job_callback) {
    db.Tests.findOne({id:jobInfo.testId.toString()}, function(err, test) {
      utils._getJobReport(jobInfo.testId, jobInfo.runId, function(err, report) {
        var browsers = Object.keys(report);
        async.each(browsers, function(browser, brw_callback) {
          var server = report[browser].server || 'Unknown';
          var os = report[browser].OS || 'Unknown';
          if(!reportJson[server]) reportJson[server] = {pass:0, fail:0, sub:{}};
          if(!reportJson[server].sub[os]) reportJson[server].sub[os] = {pass:0, fail:0, sub:{}};
          if(!reportJson[server].sub[os].sub[browser]) reportJson[server].sub[os].sub[browser] = {pass:0, fail:0, sub:[]};
          
          if(checkTestResult(report[browser]) == true) {
            reportJson[server].pass += 1;
            reportJson[server].sub[os].pass += 1;
            reportJson[server].sub[os].sub[browser].pass += 1;
          }
          else {
            reportJson[server].fail += 1;
            reportJson[server].sub[os].fail += 1;
            reportJson[server].sub[os].sub[browser].fail += 1;
          }
          
          report[browser].testName = (test && test.names) || 'Unknown';
          reportJsonToHTML(browser, report[browser], function(htmlReport) {
            reportJson[server].sub[os].sub[browser].sub.push(htmlReport);
            
            brw_callback();
          });
        }, function(err) {
          job_callback();
        });
      });
    });
  }, function(err) {
    console.log(reportJson);
    
    var summary = '<div class="summary"><h1>Test Summary:</h1>';
    var testLog = '<div class="log"><h1>Test Logs:</h1>';
    var servers = Object.keys(reportJson);
    async.each(servers, function(server, svr_callback) {
      summary += '<div class="level"><div><h2>Test server: ' + server + '</h2> </div>';
      summary += '<div class="stats"><label>Tests run:</label> <span>' + (reportJson[server].pass + reportJson[server].fail) + '</span>'
                  + '&nbsp;<label>Passed:</label> <span class="pass">' + reportJson[server].pass + '</span>'
                  + '&nbsp;<label>Failed:</label> <span class="fail">' + reportJson[server].fail + '</span>'
                  + '</div>';
      testLog += '<div class="level"><div>Test server: <h2>' + server + '</h2> </div>';

      var OSs = Object.keys(reportJson[server].sub);
      async.each(OSs, function(OS, os_callback) {
        summary += '<div class="level"><div><h3>Operating System: ' + OS + '</h3> </div>';
        summary += '<div class="stats"><label>Tests run:</label> <span>' + (reportJson[server].sub[OS].pass + reportJson[server].sub[OS].fail) + '</span>'
                    + '&nbsp;<label>Passed:</label> <span class="pass">' + reportJson[server].sub[OS].pass + '</span>'
                    + '&nbsp;<label>Failed:</label> <span class="fail">' + reportJson[server].sub[OS].fail + '</span>'
                    + '</div>';
        testLog += '<div class="level"><div>Operating System: <h3>' + OS + '</h3></div>';

        var browsers = Object.keys(reportJson[server].sub[OS].sub);
        async.each(browsers, function(browser, brw_callback) {
          summary += '<div class="level"><div><h4>' + gBrowsers[browser] + '</h4> </div>';
          summary += '<div class="stats"><label>Tests run:</label> <span>' + (reportJson[server].sub[OS].sub[browser].pass + reportJson[server].sub[OS].sub[browser].fail) + '</span>'
                      + '&nbsp;<label>Passed:</label> <span class="pass">' + reportJson[server].sub[OS].sub[browser].pass + '</span>'
                      + '&nbsp;<label>Failed:</label> <span class="fail">' + reportJson[server].sub[OS].sub[browser].fail + '</span>'
                      + '</div></div>';
          testLog += '<div class="level"><div><h4>' + gBrowsers[browser] + '</h4> </div>';
          testLog += reportJson[server].sub[OS].sub[browser].sub.join(' ');
          testLog += '</div>';
          
          brw_callback();
        }, function(err) {
          summary += '</div>';
          testLog += '</div>';
          
          os_callback();
        });
      }, function(err) {
        summary += '</div>';
        testLog += '</div>';
        
        svr_callback();
      });
    }, function(err) {
      summary += '</div>';
      testLog += '</div>';
      
      testReports = summary + testLog;
      testReports = messageTempl.replace('<!--REPORT_BODY-->', testReports);
      callback("Automated test report: " +  job.name, testReports);
    });
  });
}

/*var emailsAndTests = function(runInfo, callback) {
  var subRunInfo = {};
  async.each(runInfo.quedTests, function(test, test_callback) {
    async.each(runInfo.quedJobs[test.job], function(email, email_callback){
      if(!subRunInfo[email]) subRunInfo[email] = [];
      subRunInfo[email].push(test);
      email_callback();
    }, function(err){
      test_callback();
    });
  }, function(err){
    callback(subRunInfo);
  });
}*/

var sendJobReport = function(runInfo, db, callback) {
  var jobs = Object.keys(runInfo.quedJobs);
  async.each(jobs, function(job, job_callback){
    composeReport(runInfo.quedJobs[job], db, function(subject, htmlBody) {
      sendMail(runInfo.quedJobs[job].subscribers, subject, htmlBody, [], function(err) {
        job_callback();
      });
    });
  }, function(err) {
    callback();
  });
}

var sendMail = function(mailList, subject, mailBody, images, callback) {
  var mailOptions = {
      from: "Test Automation System <loki-automation-test-noreply@hp.com>",
      to: mailList,
      subject: subject,
      html: mailBody,
      attachments: images
    };
  
  //fs.writeFile(process.env.HOME + '/testResults/report.html', mailBody, function(err) {});
  nodemailer.send_mail(mailOptions, function (error, success) {
    if(success) callback(null, {res:true});
    else callback(['Failed to send Email'])
  });
}

exports.sendMail = sendMail;
exports.sendJobReport = sendJobReport;

