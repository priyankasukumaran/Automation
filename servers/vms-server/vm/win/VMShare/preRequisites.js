//TODO:change file name prereq - preRequisites.js, preRequisites.json
var fs   = require('fs');
var spawn = require("child_process").execFile;

//TODO: change the name of exec variable

/* TODO:

1. try to change the config data as mentioned below
2. create a base folder Resources and put all the tools there

*/

var config = {
  basePath   :"Z:\\VMShare\\Resources",
  firefox    :"\\Firefox\\Firefox_Setup.cmd",
  chrome     :"\\Chrome\\ChromeSetup.cmd",
  java       :"\\Java\\Install.cmd",
  resolution :"\\ModifyScreenResln\\ModifyScreenRes.cmd",
  iesetting  :"\\EnableInternetMode\\EnableIEMode.cmd",
  selenium   :"Z:\\VMShare\\Resources\\LaunchServer\\LaunchServer.cmd"
};

var doPreRequisites = function(callback) {
console.log(config.basePath + config.firefox);

  //InstallPrereq(config.basePath +config.firefox, "firefox", function(next) {
    //InstallPrereq(config.basePath + config.chrome, "chrome", function(next) {
    // InstallPrereq(config.basePath + config.java, "java", function(next) {
       // InstallPrereq(config.basePath + config.resolution, "resolution", function(next) {
          //InstallPrereq(config.basePath + config.iesetting, "iesetting", function(next) {
            InstallPrereq(config.selenium, "selenium", function(next) {
                console.log('Inside Prereq');
              setTimeout((function() {
            callback('done');
          }), 20000); 

            }); // selenium end
         // }); // iesetting end
       // }); // resolution end
      //}); // java end
    //}); // chrome end
  //}); // firefox end
}

function InstallPrereq(req, msg, callback) {
  
  if(msg=='selenium')
    callback('next');
     
  spawn(req, function(err, data) {
    if(err != null) {
      console.log(err);
      console.log("-----------------------------------------");
    }
    else 
      console.log("Succesfully Installed.." + msg + "..");
		callback('next')
  });
}

//methods exposed
exports.doPreRequisites = doPreRequisites;
