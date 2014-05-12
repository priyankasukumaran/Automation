/*-------------------------------------------------------------------------*
Manage Unit Tests : Save unit test history details and Run unit test
*-------------------------------------------------------------------------*/
var seljobs = [];
var jobsResult;
var sessionname = sessionname != null ? sessionStorage.getItem("name") : "Guest";
var ids = sessionStorage.getItem("userid");
if (ids == null) ids = 0;
var interval;
// Method to populate job names in dropdownlist

function getJobNames() {

  var html = '';
  $.get('/getTests', function (jobs) {
    seljobs = jobs;
    var i = 0
    jobs.forEach(function (n) {
      html += '<option value="' + i + '">' + n.names + '</option>';
      i++;
    });
    $('#jobSel').html(html);
  });
}
function unitValidation() {

  if ($('#browser').val() == null) {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Select browser')
    return false;
  }
  return true;
}
// Method to save unit test history details and run test by clicking the run unit test button

function runTest() {


if(unitValidation()){
    var date = getDateTime(new Date());
    var unitData = {};
    var selectedJob = $("#jobSel").val();

    unitData["id"] = Math.floor((Math.random() * 100) + 1);  
    unitData["Tests"] = [seljobs[selectedJob]];
    unitData["os"] = $('#os').val();
    unitData["browser"] = $('#browser').val();
    unitData["server"] = $('#server').val();

var len =$('#browser').val().length; 

deleteReport(seljobs[$('#jobSel').val()].id);

    // For running the task
				$('#edit').attr("disabled", "disabled");
    $.ajax({
      type: "post",
      url: "/testHistory",
      dataType: "json",
      data: unitData,
      success: function (value) {
        console.log("Data saved succesfully");
      }
    });
    $('#testResult').show();
    $('#testResult').html('<img src="./images/spinner.gif" /> Running the test...');
 interval =  setInterval(function() {  getTestStatus(len); }, 10000);
}

}

function getTestStatus(len) {
$('#testResult').html('<img src="./images/spinner.gif" /> Running the test...');
   $('#testResult').show();
    $.ajax({
      url: '/getReport',
      cache: false
    }).done(function (html) {
if(html != ""){
      var htm = "";
     var getbrowser=[];
      $.each(html, function (i, data) {
        getbrowser.push(data.status.browser)
        htm += "Test  - " + data.status.test + "<br />";
        htm += "Operating System - " + data.status.os + "<br />";
        htm += data.status.browser + "<br />";
        htm += data.status.report + "<br /><br />";
      });

      $("#testResult").html("<br/><br/>");
      $("#testResult").html("<p>" + htm + "</p>");
      $('#edit').removeAttr("disabled");
       if(len ===getbrowser.length){
        clearInterval(interval);
       }
}

    }).fail(function () {
      $("#testResult").html("Failed to run the test");
      $('#edit').removeAttr("disabled");
    });
}

var returnJobs = function (ids) {

alert(ids);
  var rtnJobs = [];
  ids.forEach(function (id) {
    seljobs.forEach(function(test){
      if(id == test.id) rtnJobs.push(seljobs[id]);
    });
  });
//alert(rtnJobs);
  return rtnJobs;
}
function deleteReport(id){

  var data = {
    "id": id
  }
    $.post('/deleteReport', data, function (data) {     
    });
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
