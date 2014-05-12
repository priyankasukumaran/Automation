/*-------------------------------------------------------------------------*
Manage Unit Tests : Save unit test history details and Run unit test
*-------------------------------------------------------------------------*/
var seljobs = [];
var jobsResult;
var interval, inter, vmstart, teststart;

// Method to populate job names in dropdownlist

function getJobNames(callback) {
  $("#spinner1").show();
  var html = '';
  $.get('/getTests', function (jobs) {
    seljobs = jobs;
    var i = 0;
    var grTests = {};
    jobs.forEach(function (job) {
      var grp = "0";
      if(job.script.indexOf('/')>0) {
        var parts = job.script.split('/');
        grp = parts[0];
      }
      if(!grTests.hasOwnProperty(grp)) grTests[grp] = [];
      grTests[grp].push(job);
    });
    
    var defVal = -1;
    if(!$('#jobSel').attr('multiple')) defVal = readCookie('default_test');
    
    for(var grp in grTests) {
      if(grp != '0') html += '<optgroup label="'+grp+'">';
      for(var i=0; i<grTests[grp].length; i++) {
        html += '<option '+ ((defVal == grTests[grp][i].id) ?'selected="selected"':'') +' value="' + grTests[grp][i].id + '">' + (grp != '0'?'&nbsp;&nbsp;':'') + grTests[grp][i].names + '</option>'
      }
      if(grp != '0') html += '</optgroup>';
    }
    $('#jobSel').html(html);
    $("#spinner1").hide();
    
    if(callback) callback();
  });
}

function unitValidation() {

  if ($('#browser').val() == null) {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Select browser')
    return false;
  }
  $("#errLabel").hide();
  return true;
}
// Method to save unit test history details/show test status and run test by clicking the run unit test button

var curJobId = 0;
var curRunId = 0;
function createUnitTest(unitData, callback) {
  $.ajax({
    type: "post",
    url: "/createUnitTest",
    dataType: "json",
    data: unitData,
    cache: false,
    success: function (value) {
      curJobId = value.jobId;
      console.log("Data saved succesfully");

      callback(value);
    }
  });
}

function runTest() {
  var start = 0,
    statip = 0,
    stat = 0;
  if (unitValidation()) {
    var date = getDateTime(new Date());
    var unitData = {};
    var selectedJob = $("#jobSel").val();

    unitData["Tests"] = returnJobs([selectedJob]);
    unitData["os"] = $('#os').val();
    unitData["browser"] = $('#browser').val();
    unitData["server"] = $('#server').val();
    unitData["test_type"] = "unit";
    
    createCookie('default_server', unitData["server"], 365);
    createCookie('default_test', selectedJob, 365);
    
    var params = {};
    for (var i = 1; i < 5; i++) {
      if ($('#key' + i).val() != '') params[$('#key' + i).val()] = $('#value' + i).val();
    }
    unitData["Tests"][0].params = params;

    // For running the task
    $('#edit').attr("disabled", "disabled");
    $('#testResult').hide();
    $('#spinner').show();
    $('#spinner').html('<img src="./images/spinner.gif" /> In progress . . .<br /><br />');

    createUnitTest(unitData, function(job) {
      curJobId = job.jobId;
      curRunId = job.runId;
      
      // SHow test result status in table format
      var lastCounter = 0;
      interval = setInterval(function () {
        getJobStatus(function(reply) {
          if(reply.status && reply.counter && reply.counter != lastCounter) {
            lastCounter = reply.counter;
            getJobReport(reply, function() {
              if(reply.status == 'done') clearInterval(interval);
            });
          }
        });
      }, 3000);
    });
  }
}

function getJobStatus(callback) {
  $.ajax({
    url: '/getJobStatus?jobid=' + curJobId + '&runId=' + curRunId,
    cache: false
  }).done(function (data) {
    callback(data);
  });
}

function getJobReport(stat, callback) {

  $('#testResult').show();

  var testReports = '';
  var inner = "";
  $.ajax({
    url: '/getJobReport?jobid=' + curJobId + '&runId=' + curRunId,
    cache: false
  }).done(function (report) {
    if(report) {
      var html = '<label><b>Machine IP: <span>' + (stat.vmip || '')  + '</span></b></label><br/><div class="reportInfo">';
      for(var browser in report) {
        html += '<div>';
        html += '<h2> Testing on ' + (report[browser].OS || '') + ' ' + gBrowsers[browser] + ' ' + (report[browser].browserVer || '') + ':</h2>';
        var data = report[browser].result || '';
        data = data.replace(/\n/g, '<br />');
        data = data.replace(/Passed/g, '<span class="pass">Passed</span>');
        data = data.replace(/Failed/g, '<span class="fail">Failed</span>');
        html += '<div>' + data;
        if(report[browser].hasOwnProperty('startTm') && report[browser].hasOwnProperty('endTm')) {
          html += '<span class="time">' + ((report[browser].endTm - report[browser].startTm)/1000) + ' seconds</span>';
        }
        html += '</div>';
        
        var error = report[browser].error || '';
        if(error.length > 0) {
          error = error.replace(/\n/g, '<br />');
          html += '<h3>Errors:</h3><div>' + error + '</div>';
        }
        if(report[browser].hasOwnProperty('screenshot'))
          html += '<h3>Images:</h3><div><a target="_blank" href="' + report[browser].screenshot + '">Error screenshot</a></div>';
        html += '</div>';
      }
      html += '</div>';

      $('#reportDiv').html(html);
    }
    //
    if (stat.status == 'done') {
      $('#spinner').hide();
      $('#edit').removeAttr("disabled");
      
      callback();
    }
  }).fail(function () {
    $('#edit').removeAttr("disabled");
  });
}

var returnJobs = function (ids) {
  var rtnJobs = [];
  ids.forEach(function (id) {
    seljobs.forEach(function(test){
      if(id == test.id) rtnJobs.push(test);
    });
  });
  return rtnJobs;
}

function deleteReport(id) {

  var data = {
    "id": id
  }
  $.post('/deleteReport', function (data) {});
}
// method to get the date format as 2013-11-27 10:39:36

function getDateTime(d) {

  var month = d.getMonth() + 1;
  var day = d.getDate();
  var hour = d.getHours();
  var minute = d.getMinutes();
  var second = d.getSeconds();
  var dateformat = d.getFullYear() + '-' + (('' + month).length < 2 ? '0' : '') + month + '-' + (('' + day).length < 2 ? '0' : '') + day + ' ' + (('' + hour).length < 2 ? '0' : '') + hour + ':' + (('' + minute).length < 2 ? '0' : '') + minute + ':' + (('' + second).length < 2 ? '0' : '') + second;
  return dateformat;
}
