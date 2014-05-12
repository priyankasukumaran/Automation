var fs              = require('fs');
var common          = require('../scriptAgentServer/utils/common.js');
var utils           = require('../scriptAgentServer/utils/utils.js');
var httpServer      = require('../scriptAgentServer/framework/httpServer.js');
var reqContext      = require('../scriptAgentServer/framework/context.js');
var _               = require('../scriptAgentServer/libs/underscore.js');
var exec            = require('child_process').exec;
var path            = require('path');

var say = common.say;
var vmConfig = {};

function main() {
  var port = process.argv[2] || 9090;
  new vmServer(port);
}

var vmServer = function (port) {
  var self = this;
  
  var context;
  self.run = function () {
    say('VM Server running on port: ' + port);
	
    var configPath = path.resolve('C:\\VMShare\\vm_config.json');

    fs.readFile(configPath, 'utf8', function (err, data) {
      if(!err) vmConfig = JSON.parse(data);

      var server = httpServer.create({
        port: port,
        timeout: 300000
      }, function (req, res) {
        context = reqContext.create(req, res, {});
        self.requestHandler(context, function (err) {
          // end response if not handled yet
          context.finish();
        });
      });
    });

    self.requestHandler = function (context, callback) {
      switch (context.pathname) {
      case '/vm/start':
        {
          var os = context.query['os'] || 'VM-WIN7-64';
          setupVm(os, function(err, reply) {
            if(err) return context.sendJson(err, 404);
            context.sendJson(reply, 200);
          });
        }
        break;
      case '/vm/osList':
        {
          context.sendJson(vmConfig.VMs, 200);
        }
        break;
      default:
        context.sendJson({}, 404);
      }
    };
  };
  
  self.run();
};

// filter job id's for same Os
var filterOsDetails = function (newData) {
  for (var i = 0; i < newData.length; i++) {
    var value = osFilter.filter(function (e) {
      return e.os === newData[i].os;
    });
    if (value.length) {
      value[0].id.push(newData[i].id);
    } else {
      osFilter.push({ os: newData[i].os, id: [newData[i].id], mode: newData[i].mode });
    }
  }
}

var listVms = function(callback) {
  exec("vmrun.exe list", function (err, data) {
    if(err) return callback(err);
    callback(null, data);
  });
}

var isVmUp = function(osName, callback) {
  listVms(function(err, data) {
    if(err) return callback(err);
    
    var path = vmConfig.VMInfo[osName].path;
    callback(null, {res:(data.toLowerCase().indexOf(path.toLowerCase()))>=0});
  });
}

var checkAutomationInVM = function(osName, callback) {
  var command = 'vmrun.exe -gu ' + vmConfig.VMInfo[osName].user + ' -gp ' + vmConfig.VMInfo[osName].password + 
		' listProcessesInGuest "' + vmConfig.VMInfo[osName].path + '"';
  exec(command, function (err, data) {
    //console.log(err, data);
    if(err) return callback(err);
    var res = (data.match(/cmd=node/i) && data.match(/cmd=java/i))?true:false;
    callback(null, {res:res});
  });
}

var initAutomation = function(osName, retries, callback) {
  var command = 'vmrun.exe -gu ' + vmConfig.VMInfo[osName].user + ' -gp ' + vmConfig.VMInfo[osName].password + 
		' runProgramInGuest "' + vmConfig.VMInfo[osName].path + '" -activeWindow -interactive C:\\automation\\startup.bat ' + osName;
  exec(command, function (err, data) {
    if(err) {
      console.log(err);
      if(retries == 0) callback(err);
      else setTimeout(function(){ initAutomation(osName, (retries-1), callback); }, 20000);
      return;
    }
    
    console.log("Run startup script");
    console.log(data);
    callback(null, {res:true});
  });
}

var startVm = function (osName, callback) {
  var command = 'vmrun.exe start "' + vmConfig.VMInfo[osName].path + '"';
  exec(command, function (err, data) {
	if(err) return callback(err);
    console.log(data);

    console.log("VMWare STARTED !!!!!!!!");
    callback(null, {res:true});
  });
}

var setupVm = function (osName, callback) {
  if(!vmConfig.VMInfo[osName]) return callback({error:'Invalid VM ID'});
  if(vmConfig.VMInfo[osName]['type'] && vmConfig.VMInfo[osName]['type'] == 'PC')
    return callback(null, {});

  say(['start', vmConfig.VMInfo[osName].path]);
  
  (function(vmup_callback){
    isVmUp(osName, function(err, result) {
      if(err || !result || !result.res) {
      
        startVm(osName, function(err, result) {
          if(err || !result || !result.res) return vmup_callback(err);
          
          vmup_callback(null, true, {res:true});
        });
      }
      else {
        console.log(osName + " is already running");
        vmup_callback(null, false, {res:true});
      }
    });
  })(function(err, justLaunched, result) {
    if(err || !result || !result.res) return callback(err);
    
    checkAutomationInVM(osName, function(err, result) {
      if(result && result.res) {
        say('Automation is already running in VM');
        return callback(null, result);
      }
      
      initAutomation(osName, justLaunched?10:0, callback);
    });
  });
}

if (__filename === process.argv[1]) main();
