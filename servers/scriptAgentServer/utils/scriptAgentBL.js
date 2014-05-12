var utils  = require('./common.js');
var helper  = require('./helper.js');
var nodemailer = require("nodemailer");


// method which holds BL of Change password
var updatePassword = function(collection, context) {
  var input = utils.httpBody(context.req);
  if(input.id)
    var options = {"id":input.id};

  helper.update(collection, options, input, function(res, code) {
    return context.sendJson(res, code);
  });

};


//mail settings
nodemailer.SMTP = {
  host: 'smtp3.hp.com',
  port: 25
}

var resetPassword =  function(signupCollection, context) {
  helper.queryCollection(signupCollection, context, function(results) {
    if(results) {
      var newPassord = Math.random().toString(36).slice(-8);
      var mailOptions = {
        from: "Test Automation System <loki-automation-test-noreply@hp.com>",
        to: results[0].email,
        subject: "New password",
        html: "Your new password is " + newPassord, //generating new password 
      }

      var options = {"id":results[0].id};

      var input = {"password":newPassord};
      helper.update(signupCollection, options, input, function(res, code) {
        nodemailer.sendMail(mailOptions, function(res) {
        });
        return context.sendJson(results, 404);
      });

    } //end if
  }); // end helper.queryCollection
}

var signupUser = function(cxt) {
  var record = utils.httpBody(cxt.req);
  if(!record.email) return cxt.sendJson({result:'Invalid input'});

  cxt.db.Signups.findOne({email:record.email}, function(err, user) {
    if(user && user.email) return cxt.sendJson({result:'You have already signed up.'});
    
    record.signupTime = new Date();
    cxt.db.Signups.insert(record, function(err, user){
      if(err) return cxt.sendJson({result:'Signup failed.'});
      cxt.sendJson({result:'OK'});
    });
  });
}

exports.updatePassword = updatePassword;
exports.resetPassword  = resetPassword;
exports.signupUser = signupUser;
