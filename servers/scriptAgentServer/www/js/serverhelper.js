/*-------------------------------------------------------------------------*
Manage server details:Save/Update/Delete  and display server details
*-------------------------------------------------------------------------*/

var serverResult = [];
var sessionname = sessionname != null ? readCookie("user_email") : "Guest";

// Diaplay server details in server UI

function displayServers() {
  $('#serverTable').html('');
  var serverList = "<table class='tablestyle'><tr><th class='thstyle' style='width:300px'>Server URL</th><th class='thstyle'></th><th class='thstyle'></th></tr>";
  var i = 0;
  serverResult.forEach(function (server) {
    serverList += '<tr id="tr' + i + '" ><td align="center" class="tdstyle">' + server.url + '</td><td align="center" class="tdstyle"> <img src="/images/edit.png" onclick="myfuncServer(this.id);" id="' + i + '" width="25px" height="25px"/> </td><td align="center" class="tdstyle"> <img src="/images/del.png" onclick="deleteServers(this.id);" id="' + server.id + '"  width="25px" height="25px"/> </td></tr>';
    i++;
  });
  serverList += '</table>';
  $('#serverTable').html(serverList);
}

function getServers() {
  $.get('/getServers', function (data) {
    var servers = JSON.parse(JSON.stringify(data));
    serverResult = servers;
    if (serverResult.length == 0) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; There are no Servers in List');
      $("#serverTable").hide();
      $("#inputForm").fadeIn("slow");
    } else displayServers();
  });
}

/* method to get the selected server details to corresposding input fields by selecting edit icon
and change the selected row color */

var oldSer = "";
function myfuncServer(index) {

  if (oldSer != "") $(oldSer).css('background-color', '');
  oldSer = '#tr' + index;
  $('#tr' + index).css('background-color', 'yellow');
  $("#inputForm").fadeIn("slow");
  var server = serverResult[index];
  $('#server').val(server.url);
  $('#serverId').val(server.id);
  if (sessionname == "Guest") $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp;You are not authoized to Edit!!');
}

// Delete server details by clicking he delete icon.

function deleteServers(id) {
  var data = {
    "id": parseInt(id)
  }
  if (sessionname != "Guest") {
    $.post('/deleteServers', data, function (data) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; URL Deleted succesfully!!');
      clearServer();
      $("#inputForm").fadeOut("slow");
      getServers();
      $("#add").show();

    });
  } else $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp;You are not authoized to Delete!!');
}

// Server input field validation.

function ServerValidation() {

  if ($('#server').val() == "") {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Enter valid Server URL');
    return false;
  }
  return true;
}
// clear input fields.

function clearServer() {

  $('#server').val("");
  $('#serverId').val("");
}

// save server details by clicking the save button

function saveServer() {


if (ServerValidation()) {
var data = {};
 var idval = ($('#serverId').val() != "") ? $('#serverId').val() : Math.floor((Math.random() * 100) + 1);
data = {
        "url": $('#server').val(),
        "id":idval
       };
      $.post('/saveServers', data, function (data) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Server Saved successfully!!');
      clearServer();
      $("#inputForm").fadeOut("slow");
      getServers();
      displayServers();
      $("#serverTable").show();
      $("#add").show();
    });
}

  
}
