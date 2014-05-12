/*-------------------------------------------------------------------------*
Manage Automation pages UI:
*-------------------------------------------------------------------------*/

var pageCurr    = "";
var sessionname = 'Guest';

var gBrowsers = {IE:"Internet Explorer", GC:"Google Chrome", FF:"Firefox", SAF:"Safari"}

/* Load test scripts in the dropdown list of test UI */

function loadTestScript() {
  $.ajax({
    type: "GET",
    url: "/getTestScripts",
    success: function (result) {
      var html = "<option value=''>Select</option>";
      for (var folder in result) {
        var sub= "";
        var value = (folder != "0") ? folder + "/" : "";
        $.each(result[folder], function (index, scriptName) {
          scriptName = scriptName.substr(0, scriptName.lastIndexOf('.'));
          sub += '<option value="' + value + scriptName + '">' + ((folder != "0")?'&nbsp;&nbsp;&nbsp;&nbsp;':'') + scriptName + '</option>';
        })
        // folder = 0 indicates ungrouped scripts
        html = (folder != "0") ? html + "<optgroup label='" + folder + "'>" + sub + "</optgroup>" : html + sub;
      }
      $('#testscripts').html(html);
      $("#spinner").hide();
    }
   
  });
}


function getUpdates() {
  $("#spinner").show();
  $.ajax({
    type: 'GET',
    url: "/getUpdates",
    dataType: "json",
    success: function (data) {
      loadTestScript();
      if(data.res == false){
        //alert('An error occured while pulling latest code')
      }
      $("#spinner").hide();
    }
  });
}

function getTestUpdates() {
  $("#spinner").show();
  $.ajax({
    type: 'GET',
    url: "/getUpdates",
    dataType: "json",
    success: function (data) {
      getJobNames();
      if(data.res == false){
        //alert('An error occured while pulling latest code')
      }
      $("#spinner").hide();
    }
  });
}

/* Get server details from servercollection and load to
 dropdown lists of unit tests and Vm tests UI*/

function getServerList() {

  $.getJSON('/getServers', function (data) {
    var html = '';
    var defVal = readCookie('default_server');
    data = data.reverse();
    data.forEach(function (n) {
      html += '<option '+ ((defVal == n.url) ?'selected="selected"':'') +' value="' + n.url + '">' + n.url + '</option>';
    });
    $('#server').html(html);
  });
}

/* Fetch operating system details from VMcontroller tool and 
populate in dropdown lists of Vm tests and unit test UI.
*/

function getOsList() {

  $.getJSON('/getAllVMs', function (data) {
    var html = '';
    var VMSs = Object.keys(data);
    VMSs.forEach(function(VMS) {
      if(data[VMS].length > 0) {
        html += '<optgroup label="' + VMS + '">';
        data[VMS].forEach(function (val) {
          html += '<option value="' + VMS + '/' + val.ID + '">&nbsp;&nbsp;' + val.ID + '</option>';
        });
        html += '</optgroup>';
      }
    });
    $('#os').html(html);
  });
}

function dispCustomParams() {
  var selectedJob = $("#jobSel").val();
  if(selectedJob == '' || selectedJob == 0 || $('#key1').length==0)
    return;

  for(var idx=1; idx<=4; idx++){
    $('#key'+idx).val('');
    $('#value'+idx).val('');
  }
  
  var selTest = returnJobs([selectedJob]);
  if(selTest.length > 0) {
    var idx = 1;
    for(var key in selTest[0]['params']) {
      $('#key'+idx).val(key);
      $('#value'+idx).val(selTest[0]['params'][key]);
      idx++;
    }
  }
}

/* Clear all input fields of UI's'in page load*/

function clearForm() {

  switch (pageCurr) {
  case "tests.html":
    clearTests(id);
    break;
  case "jobs.html":
    clearVmps();
    break;
  case "unittest.html":
    break;
  case "servers.html":
    clearServer();
    break;
  case "subscription.html":
    clearSubscription();
    break;
  default:
  }
}

/* Method to apply html effects in automation UI based on signed user or guest*/

function initialPageLoad() {
  sessionname = readCookie("user_email");
  sessionname     = sessionname != null ? sessionname : "Guest";

  switch (pageCurr) {
  case "tests.html":
    $("#testparams").fadeIn("slow");
    if (sessionname != "Guest") {
      loadTestScript();
      $('#sign').hide();
      $("#sub").show();
      $("#signout").show();
      $("#spinner").hide();
    } else {
      $('#testtbl').hide();
      $('#sign').show();
      $('#add').hide();
      $("#sub").hide();
      $("#signout").hide();
      $("#spinner").hide();
    };
    displayTests();
    break;
  case "jobs.html":
    if (sessionname != "Guest") {
      $('#sign').hide();
      $("#sub").show();
      $("#signout").show();
    } else {
      $('#vmpstbl').hide();
      $('#sign').show();
      $('#add').hide();
      $("#sub").hide();
      $("#signout").hide();
    }
    getJobNames(function(){
      displayVmps();
    });
    getOsList();
    getServerList();
    loadSubscribers();
    loadPlatforms();
    break;
  case "unittest.html":
    $("#inputForm").fadeIn("slow");
    getServerList();
    getJobNames();
    getOsList();
    $('#edit').removeAttr("disabled");
    $("#spinner").hide();
    $("#reportTab").hide();
    $("#vmipdiv").hide();
    $("#vmstart").hide();
    $("#spinner1").hide();


    if (sessionname != "Guest") {;
      $("#sub").show();
      $("#signout").show();
    } else {

      $("#sub").hide();
      $("#signout").hide();
    };
    break;
  case "servers.html":
    if (sessionname != "Guest") {
      $('#sign').hide();
      $("#sub").show();
      $("#signout").show();
    } else {
      $('#servertble').hide();
      $('#sign').show();
      $('#add').hide();
      $("#sub").hide();
      $("#signout").hide();
    }
    displayServers();
    getServers();
    break;
  case "changePassword.html":
      $('#servertble').hide();
      $('#sign').show();
      $('#add').hide();
      $("#sub").hide();
      $("#signout").hide();
    break;
  case "index.html":
    getTestSummery();
    if (sessionname == 'Guest') {
      $("#sub").hide();
      $("#signout").hide();
      $("#changePassword").hide();
      $("#test").hide();
      $("#job").hide();
      $("#serversPage").hide();
    }
    break;

  case "subscription.html":
    getSuscription();
    displaySubscription();
    getServerList();
    break;
  default:
  }
}
/* method to get the selected tests/vmps/unittest/server details to 
corresposding input fields by selecting edit icon */

function myfunc(id) {

  $("#inputForm").fadeIn("slow");
  switch (pageCurr) {
  case "tests.html":
    myfuncTests(id);
    break;
  case "jobs.html":
    myfuncVmps(id);
    break;
  case "unittest.html":
    myfuncUnit(id);
    break;
  case "servers.html":
    myfuncServer(id);
    break;
  case "subscription.html":
    myfuncSub(id);
    break;
  default:
  }
}
/*method to save/edit tests,vmtests,unit test history and server details by clicking the save button/run test
in the UI and apply html effects based on that.*/

function load(page) {

  sessionHandle();
  pageCurr = page;
  $("#inputForm").hide();
  $("#testparams").hide();
  $("#cancel").hide();
  $("Custom Param Values").hide();
  $("#hide").click(function () {
    $('#add').show()
    clearForm();
    $("#inputForm").fadeOut("slow");
  });

  $("#add").click(function () {
    $('#add').hide()
    clearForm();
    $("#inputForm").fadeIn("slow");
  });
  
  $("#cust").click(function () {
    $('#cust').hide()
    $("#cancel").show();
    $("#testparams").fadeIn("slow");
  });
  
  $("#cancel").click(function () {
    $('#cust').show()
    $("#cancel").hide();
    $("#testparams").hide();
  });

  $("#edit").click(function () {

    switch (page) {
    case "tests.html":
      saveTests();
      break;
    case "jobs.html":
      saveVmpsJobs();
      break;
    case "unittest.html":
      runTest();
      break;
    case "servers.html":
      saveServer();
      break;
    case "subscription.html":
      saveSubscription();
      break;
    case "changePassword.html":
      changePassword();
      break;
    default:
    }
  });

  $("#jobSel").change(function() {
    dispCustomParams();
  });
  
  $("#add").click(function() {
    loadTestScript();
  });
  $("#hide").click(function(){
    loadTestScript();
  });

  $("#getUpdates").click(function(){
    getUpdates();
  });

  $("#updateTests").click(function(){
    getTestUpdates();
  });

  initialPageLoad(page);
}

/*Apply html effects in header menu based on signed user or guest.*/

function sessionHandle() {

  var sectnname = readCookie('user_email');
  sectnname = sectnname != null ? sectnname : "Guest";
  if (sectnname == "Guest") {
    $("#sub").hide();
    $("#signout").hide();
    $("#changePassword").hide();
    $("#test").hide();
    $("#job").hide();
    $("#serversPage").hide();
   } else {
    $("#sub").show();
    $("#signout").show();
    $("#home").show();
    $("#changePassword").show();
    $("#test").show();
    $("#job").show();
    $("#serversPage").show();
   }
}

function createCookie(name,value,days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime()+(days*24*60*60*1000));
    expires = "; expires="+date.toGMTString();
  }
  document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

function eraseCookie(name) {
  createCookie(name,"",-1);
}
