
/*-------------------------------------------------------------------------*
Manage subscription details:
*-------------------------------------------------------------------------*/

var sessionname = sessionname != null ? readCookie("user_email") : "Guest";
var subResult = [];

//Save subscription details

function saveSubscription() {

  if (subValidation()) {
  var data = {};
 var idval = ($('#subId').val() != "") ? $('#subId').val() : Math.floor((Math.random() * 100) + 1);
  
 
   data = {
       "id":idval,
      "project": $('#project').val(),
      "server": $('#server').val(),
      "mailid": $('#emailid').val(),
      "mode": $('input[name="mode"]:checked').val()
      
    }

    $.post('/saveSubscription', data, function (data) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Subscription Saved Successfully !!');
      clearSubscription();
      $("#inputForm").fadeOut("slow");
      $("#subscriptionTable").show();
      getSuscription();
      displaySubscription();
      $("#add").show();
    });

  }

}
// clear input fields in subscription UI

function clearSubscription() {
  $("input[name='mode']").prop("checked", false);
  $('#project').val("");
  $('#emailid').val("");
}

// input field page validation in subscription UI

function subValidation() {
  if ($('#project').val() == "") {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Enter Project!!');
    return false;
  }
  if (!$('input[name="mode"]:checked').length) {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please select mode!!');
    return false;
  }
  var data = $('#emailid').val();
  var arr = data.split(',');

  for (var i = 0, length = arr.length; i < length; i++) {

    if (IsEmail(arr[i]) == false) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Enter a valid Mail id!!');
      return false;
    }
  }


  return true;
}




function displaySubscription() {

  $('#subscriptionTable').html('');
  // var sublist = "<table class='tablestyle'><tr><th class='thstyle' style='width:300px'>Server</th><th class='thstyle'></th><th class='thstyle'></th></tr>";
  var sublist = "<table class='tablestyle'><tr><th class='thstyle' style='width:175px'>Server</th><th class='thstyle' style='width:245px'>Email</th><th class='thstyle' style='width:230px'>Mode</th><th  class='thstyle'></th><th class='thstyle'></th></tr>";
  var i = 0;
  subResult.forEach(function (sub) {

    sublist += '<tr id="tr' + i + '" ><td class="tdstyle">' + sub.server + '</td><td class="tdstyle">' + sub.mailid + '</td><td class="tdstyle">' + sub.mode + '</td><td align="center" class="tdstyle"> <img src="/images/edit.png" onclick="myfuncSub(this.id);" id="' + i + '" width="25px" height="25px"/> </td><td align="center" class="tdstyle"> <img src="/images/del.png" onclick="deleteSub(this.id);" id="' + sub.id + '"  width="25px" height="25px"/> </td></tr>';
    i++;
  });
  sublist += '</table>';
  $('#subscriptionTable').html(sublist);
}


function getSuscription() {
  $.get('/getSubscription', function (data) {
    var subs = JSON.parse(JSON.stringify(data));
    subResult = subs;
    if (subResult.length == 0) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; There are no Servers in List');
      $("#subscriptionTable").hide();
      $("#inputForm").fadeIn("slow");
    } else displaySubscription();
  });
}

var oldSer = "";
function myfuncSub(index) {

  if (oldSer != "") $(oldSer).css('background-color', '');
  oldSer = '#tr' + index;
  $('#tr' + index).css('background-color', 'yellow');
  $("#inputForm").fadeIn("slow");
  var subscrib = subResult[index];

  $('#emailid').val(subscrib.mailid);
  $('#subId').val(subscrib.id);
  $('#server').val(subscrib.server)
  var radioSel = $("input[value='" + subscrib.mode + "']");
  if (radioSel != null) radioSel.prop("checked", true);
  if (sessionname == "Guest") $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp;You are not authoized to Edit!!');
}


function deleteSub(id) {

  var data = {
    "id": parseInt(id)
  }
  if (sessionname != "Guest") {
    $.post('/deleteSubscription', data, function (data) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Subscription Deleted succesfully!!');
      clearSubscription();
      $("#inputForm").fadeOut("slow");
      getSuscription();
      $("#add").show();
    });
  } else $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp;You are not authoized to Delete!!');
}
