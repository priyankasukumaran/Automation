/*-------------------------------------------------------------------------*
Manage Tests:Add,Edit,Delete and dipslay Test details
*-------------------------------------------------------------------------*/
var sessionname = sessionname != null ? readCookie("user_email") : "Guest";
var testsResult;

//Method to display added test details in the test UI page

function displayTests() {

  $('#testsTable').html('');
  var testlist = "<table class='tablestyle'><tr><th class='thstyle' style='width:175px'>Name</th><th class='thstyle' style='width:245px'>Test Script</th><th class='thstyle' style='width:230px'>Launch URL</th><th class='thstyle' style='width:250px'>CustomParamValues</th><th class='thstyle'></th><th class='thstyle'></th></tr>";

  $.ajax({
    type: 'GET',
    url: "/getTestList",
    dataType: "json",
    success: function (tests) {
      if (tests.length == 0) {
        $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; There are no scheduled tests')
        $("#testsTable").hide();
        $("#inputForm").fadeIn("slow");
      } else {
        $("#testsTable").show();
        var i = 0;
        testsResult = tests;
        tests.forEach(function (test) {
          var rowStyle = "";
          if (i % 2 != 0) rowStyle = "gridRow";
          testlist += '<tr id="tr' + i + '" class=' + rowStyle + '><td class="tdstyle">' + test.names + '</td><td class="tdstyle">' + test.script + '</td><td class="tdstyle">' + test.launch + '</td><td align="center" class="tdstyle">'

          if (test.params) {
            for(var key in test.params) {
              testlist += key + ' : ' + test.params[key] + '<br>'
            }
          }
          testlist += '</td><td class="tdstyle"> <img src="/images/edit.png" width="25px" height="25px" onclick="myfunc(this.id);" id="' + i + '"/> </td><td class="tdstyle"> <img src="/images/del.png" width="25px" height="25px" onclick="deleteTest(this.id);" id="' + test.id + '"/> </td></tr>';
          i++;
        });
        testlist += '</table>';
        $('#testsTable').html(testlist);
      }
    }
  });
}
// method to get the selected test's details to corresposding input fields by selecting edit icon
var oldtest = ""
function myfuncTests(id) {

  if (oldtest != "") $(oldtest).css('background-color', '');
  oldtest = '#tr' + id;
  $('#tr' + id).css('background-color', 'yellow');
  var editData = testsResult[id];
  $("#id").val(editData.id);
  $("#names").val(editData.names);
  $("#launch").val(editData.launch);
  $("#testscripts").val(editData.script);
  if (sessionname == "Guest") 
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp;You are not authoized to Edit!!');
  else {
    for(var i=1; i<5; i++) {
      $('#key' + i).val('');
      $('#value' + i).val('');
    }
    var i=1;
    for (var key in editData.params) {
      $('#key' + i).val(key);
      $('#value' + i).val(editData.params[key]);
      i++;
    }
  }
}
// Method to delete seleted test details by selecting delete 
function deleteTest(id) {

  var data = {
    "id": parseInt(id)
  }
  if (sessionname != "Guest") {
    $.post('/deleteTests', data, function (data) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Test Deleted Successfully !!')
      clearTests();
      displayTests();
    });
  } else $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp;You are not authoized to Delete!!');
}
//Method to handle page validation for test details enterd.
function testValidation() {

  if ($('#names').val() == "") {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Enter Name')
    return false;
  }

  if ($('#testscripts').val() == "") {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Choose Script')
    return false;
  }
  return true;
}
// Method to clear input fields
function clearTests() {

  $('#names').val("");
  $('#testscripts').val("");
  $('#id').val("");
  $('#launch').val("");
  for (var i = 1; i < 5; i++) {
    $('#key' + i).val('');
    $('#value' + i).val('');
  }
}
// Method to save and update testDetails inputed by clicking the save button
function saveTests() {

  if (testValidation()) {
    var data = {};
    var idval = ($('#id').val() != "") ? $('#id').val() : Math.floor((Math.random() * 100) + 1);
    var data = {
      "id": idval,
      "date": new Date(),
      "names": $('#names').val(),
      "script": $('#testscripts').val(),
      "launch": $('#launch').val() || '',
      "params": {}
    }

    for (var i = 1; i < 5; i++) {
      if ($('#key' + i).val() != '') {
        if (data.action) data.data.params[$('#key' + i).val()] = $('#value' + i).val();
        else data.params[$('#key' + i).val()] = $('#value' + i).val();
      }
    }

    $.post('/saveTests', data, function (data) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Test Saved Successfully !!')
      clearTests();
      $("#inputForm").fadeOut("slow");
      displayTests();
      $('#add').show()
    });
  }

}

