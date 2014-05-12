/*-------------------------------------------------------------------------*
Manage Vm Jobs : Add,Edit,Delete and display Vm Job details
*-------------------------------------------------------------------------*/

var elementIds  = [],
  vmpsResult    = [];

var toNfroVmps = function (id) {

  if ($('#' + id).is(':checked')) elementIds.push(id);
  else for (var i = 0; i < elementIds.length; i++) {
    if (elementIds[i] == id) elementIds.splice(i, 1);
  }

}
// clear input fields of Vm jobs
function clearVmps() {

  $('#id').val("");
  $('#name').val("");
  getServerList();
  $('#jobSel').val([]);
  $('#platforms').val([]);
  $('#subscribers').val([]);
  $('#tagname').val('');

  $('#edit').removeAttr("disabled");
}
//Delete vm jobs by selected corresponsing delete icon
function deleteVmps(id) {
  var data = {
    "id": parseInt(id)
  }
  if(!confirm('Are you sure you want to delete the job?'))
    return;

  if (sessionname != "Guest") {
    $.post('/deleteJobs', data, function (data) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Job Deleted Successfully !!');
      displayVmps();
      getServerList();
    });
  } else $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp;You are not authoized to Delete!!');
}

function editVmps_Jobs(jobsIn) {
}

var oldVm = "";
/* method to get the selected vm job details to corresposding
input fields by selecting edit icon and change the selected row color*/

function myfuncVmps(id) {

  $("#jobSel option").filter(function () {
    return $(this).text();
  }).prop('selected', false);
  if (oldVm != "") $(oldVm).css('background-color', '');
  oldVm = '#tr' + id;
  $('#tr' + id).css('background-color', 'yellow');
  elementIds = [];
  var editData = vmpsResult[id];
  selectValues(editData);
  if (sessionname == "Guest") $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp;You are not authorized to Edit!!');
  else editVmps_Jobs(editData.Tests);
}
// methods to display already added vm jobs in UI

function displayVmps(callback) {
  var job;
  $('#vmpsTable').html('');
  var joblist = "<table class='tablestyle'><tr><th class='thstyle' style='width:60px'>Job ID</th><th class='thstyle' style='width:150px'>Job Name</th><th class='thstyle' style='width:200px'>Platforms</th><th class='thstyle' style='width:200px'>Server</th><th class='thstyle' style='width:300px'>Jobs</th><th class='thstyle' style='width:80px'>Recurrence</th><th class='thstyle'></th><th class='thstyle'></th></tr>";
  //var mode="weekly"
  $.ajax({
    type: 'GET',
    url: "/getJobs",
    dataType: "json",
    success: function (jobs) {
      if (jobs.length == 0) {
        $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; There are no scheduled VMPS Jobs')
        $('#vmpsTable').hide();
        $("#inputForm").fadeIn("slow");
      } else {
        var i = 0;
        vmpsResult = jobs;
        jobs.forEach(function (job) {
          console.log(job);
         $('#vmpsTable').show();
          var rowStyle = "";
          if (i % 2 != 0) rowStyle = "gridRow";
          joblist += '<tr id="tr' + i + '" class=' + rowStyle + '><td class="tdstyle">' + job.id + '<td class="tdstyle">' + job.name + '</td><td class="tdstyle">' + job.platforms.join(', ') + '</td><td class="tdstyle">' + job.server + '</td><td align="center" class="tdstyle">';
          
          var Tests = returnJobs(job.Tests);
          if (Tests) {
            for(var j=0; j<Tests.length; j++) {
              var test = Tests[j];
              if(j>0) joblist += ', ';
              joblist += test.names;
            }
          }

          joblist += '</td><td class="tdstyle">'+ job.mode +'</td><td class="tdstyle"> <img onclick="myfunc(this.id);" id="' + i + '" src="/images/edit.png" width="25px" height="25px"/> </td><td class="tdstyle"> <img onclick="deleteVmps(this.id);" id="' + job.id + '" src="/images/del.png" width="25px" height="25px"/> </td></tr>';
          i++;
        });
        joblist += '</table>';
        $('#vmpsTable').html(joblist);
        if(callback) callback();
      }
    }
  });
}

function loadPlatforms() {
  $.getJSON('/getAllVMs', function (data) {
    var html = '';
    var VMSs = Object.keys(data);
    VMSs.forEach(function(VMS) {
      if(data[VMS].length > 0) {
        data[VMS].forEach(function (val) {
          for(var brc in gBrowsers) {
            if(val.CAPS.hasOwnProperty(brc))
              html += '<option value="' + val.OS + '-' + brc + '">' + val.OS + ' -&gt; '+gBrowsers[brc]+' ' + val.CAPS[brc] + '</option>';
          }
        });
      }
    });
    $('#platforms').html(html);
  });
}

function loadSubscribers() {
  $.ajax({
    type: 'GET',
    url: "/getSubscription",
    dataType: "json",
    success: function (emails) {
      var html = '';
      emails.forEach(function(info) {
        html += '<option value="'+info.mailid+'">'+info.mailid+'</option>';
      });
      $('#subscribers').html(html);
    }
  });
}

var curJobId=0;
function saveJob(unitData, callback) {
  $.ajax({
    type: "post",
    url: "/saveJob",
    dataType: "json",
    data: unitData,
    cache: false,
    success: function (value) {
      curJobId = value.jobId;
      console.log("Data saved succesfully");

      callback(value.jobId);
    }
  });
}

// Method to save and update vm jobs inputed by clicking the save button
function saveVmpsJobs() {

  var data = {};
  if ($('#name').val() == '') {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please enter job name')
    return false;
  }
  if ($('#platforms').val() == null) {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please select platform(s)')
    return false;
  }
  if ($('#gitTag').val() == '') {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please enter Git Tag name or SHA Id')
    return false;
  }
  if($('#jobSel').val() == null) {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Select any Jobs');
    return false;
  }
  $("#errLabel").html('');
  
  var unitData = {};

  if($('#id').val() != '') unitData['id'] = $('#id').val();
  unitData["name"] = $('#name').val();
  unitData["Tests"] = $('#jobSel').val();
  unitData["platforms"] = $('#platforms').val();
  unitData["subscribers"] = $('#subscribers').val();
  unitData["server"] = $('#server').val();
  unitData["tagname"] = $('#gitTag').val();
  unitData["test_type"] = "recurring";
  unitData["mode"] = $('input[type="radio"][name="case"]:checked').val();

  // For running the task
  $('#edit').attr("disabled", "disabled");

  saveJob(unitData, function(jobId) {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Job Created Successfully !!')
    $("#inputForm").fadeOut("slow");
    clearVmps();
    $('#add').show();
    $('#edit').removeAttr("disabled");
    
    displayVmps();
  });
}

// method to get the selected vm job details to corresposding input fields by selecting edit icon
function selectValues(editData) {

  //select drop down values by clicking edit
  $("#name").val(editData.name || '');
  $("#id").val(editData.id);
  $("#server").val(editData.server);
  $("#platforms").val(editData.platforms);
  $("#subscribers").val(editData.subscribers);
  $('#gitTag').val(editData.tagname);
  $("#jobSel").val(editData.Tests);
  
  // select mode radio button by clicking edit
  var radioSel = $("input[value='" + editData.mode + "']");
  if (radioSel != null) radioSel.prop("checked", true);
  
  $('#edit').removeAttr("disabled");
}
