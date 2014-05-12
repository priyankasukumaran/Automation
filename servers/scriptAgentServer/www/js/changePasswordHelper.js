function changePassword() {
  if(validate() == false) {
    $("#errLabel").html('password do not match with confirm password')
    return;
  }

  var userID = readCookie("user_id");
  var data = {
    "id": userID,
    "password": $("#password").val()
  };

  $.ajax({
    type: 'post',
    url: "/changePassword",
    dataType: "json",
    data: data,
    success: function (response) {
      $("#errLabel").html('Password changed successfully')
      $('#password').val("");
      $('#repwd').val("");
    }
  });
}


function validate() {
  if($("#password").val() == $("#repwd").val())
    return true

  // If validation have probelm
  return false;

}
