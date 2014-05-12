/*-------------------------------------------------------------------------*
Manage user sign up and sign in details.
*-------------------------------------------------------------------------*/

//Handle enter
function handleEnter(event, callback) {
  var ifEnter = (event.keyCode == 13);
  if(ifEnter) callback();
}

// User Sign up page validations.

function pageValidation() {

  if ($('#names').val() == "") {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Enter Full Name!');
    return false;
  }
  if ($('#email').val() == "") {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Enter email id !');
    return false;
  }
  if ($('#password').val() == "") {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please enter password!');
    return false;
  }
  if ($('#repwd').val() == "") {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please re-Enter password!');
    return false;
  }
  if ($('#password').val() != $('#repwd').val()) {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Passwords do not match.!');
    return false;
  }
  return true;
}

// Save sign up details 

function saveSignup() {

  if (pageValidation()) {
    if (IsEmail($('#email').val()) == false) {
      $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Enter a valid email id !');
      return false;
    }
    var uid = Math.floor((Math.random() * 100) + 1);
    var data = {
      "id": uid,
      "email": $('#email').val(),
      "password": $('#password').val()
    };
    $.ajax({
      type: 'post',
      url: "/signUp",
      dataType: "json",
      data: data,
      success: function (response) {
        if(response.result == 'OK') {
          console.log("sign up succesfully!!");
          $("#errLabel_s").html('Signed up successfully!  Please sign in with your email id and password.');
          
          $('#names').val('');
          $('#email').val('');
          $('#password').val('')
          $('#repwd').val('')
          $('#emails').focus();
        }
        else {
          console.log(response.result);
          $("#errLabel_s").html(response.result);
        }
      }
    });
  }
}

// clear input fields

function clearsignup() {

  $('#names').val("");
  $('#email').val("");
  $('#password').val("");
}

// Save sign in details

function signin() {

  var data = {
    "email": $('#emails').val(),
    "password": $('#passwords').val()
  };
  $.ajax({
    type: "post",
    url: "/signIn",
    dataType: "json",
    data: data,
    success: function (value) {

      if (value.length == 0) $("#errLabel").html('Invalid username or password!!')
      else {
        var days = 0;
        if($('#rememberme').val() == 'remember') days = 365;
        createCookie('user_email', value[0].email, days);
        createCookie('user_id', value[0].id, days);

        $(location).attr('href', '/index.html');
      }
    },
  });
}

function signout() {
  eraseCookie('user_email');
  eraseCookie('user_id');
}

// method to validate inputed email id is valid or not.

function IsEmail(email) {
  var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
  return regex.test(email);
}

function forgotPassword() {
  if (IsEmail($('#email').val()) == false) {
    $("#errLabel").html('&nbsp;&nbsp;&nbsp;&nbsp; Please Enter a valid email id !');
    return false;
  }

  var data = {
    "email": $('#email').val(),
  };

  $.ajax({
    type: 'post',
    url: "/forgotPassword",
    dataType: "json",
    data: data,
    success: function (response) {
      if(Object.keys(response).length > 0) {
        $("#errLabel").html('New password is send to your mail');
        $('#emails').val("");
      }
      else {
        $("#errLabel").html('The email id you entered is not registered with the system');
      }
    }
  });
}
