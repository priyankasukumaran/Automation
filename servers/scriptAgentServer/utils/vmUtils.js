var mkdirp = require('mkdirp');
var fs     = require('fs');
var utils  = require('./common.js');
var spawn  = require('child_process').spawn;
var http   = require('http');
var _      = require('../libs/underscore.js');
var async  = require('async');
var jobHdlr  = require('./jobHandler.js');

var availableVMs = null;
var _getVMsList = function (result_callback) {
  if(availableVMs != null) return result_callback(availableVMs);

  availableVMs = {};
  utils.loadJson(process.env.HOME + '/config/automation/vmservers.json', function(VMSs) {
    if(!VMSs) return result_callback(availableVMs);
    
    async.each(VMSs, function(VMS, callback) {

      console.log('http://' + VMS.host + '/vm/osList');
      utils.getJson('http://' + VMS.host + '/vm/osList', {connectTimeout:5}, function(err, VMs) {
        console.log(err, VMs);
        if(err) availableVMs[VMS.name] = [];
        else availableVMs[VMS.name] = VMs;

        callback();
      });
    },
    function(err) {
      if(availableVMs == null) availableVMs = {};
      result_callback(availableVMs);
    });
  });
}

var getVMsList = function (context) {
  _getVMsList(function(VMs){
    context.sendJson(VMs);
  })
}

var getVm = function (context, statuscollection,value) {
  var value = value == '0' ?  context.req.connection.remoteAddress : value;
  statuscollection.insert({
    data: value}, function (err, result) {
      if(value == '0')
        return context.sendJson(result, 404);
      else
        return result;
  });
}

var getVMServers = function(callback) {
  utils.loadJson(process.env.HOME + '/config/automation/vmservers.json', function(VMSs) {
    callback(VMSs);
  });
}

var getVMStatus = function(vm, callback) {
  jobHdlr.checkPollingStatus(vm, function(reply){
    callback(reply);
  });
}

var getVMsWithCaps = function(caps, callback) {
  var osCaps = {};
  async.each(caps, function(cap, caps_callabck){
    if(cap.indexOf('-') < 0) return caps_callabck();
    var parts =  cap.split('-');
    if(!osCaps[parts[0]]) osCaps[parts[0]] = [];
    osCaps[parts[0]].push(parts[1]);
    
    caps_callabck();
  }, function(err){
    console.log(osCaps);
    _getVMsList(function(VMSs){
      var capVMs = {};
      //console.log('VMSs', VMSs);
      var vmNames = Object.keys(VMSs);
      async.each(vmNames, function(vmName, vms_callback) {
        var VMS = VMSs[vmName];
        //console.log('VMS', VMS);
        async.each(VMS, function(VM, vm_callback) {
          //console.log('VM', VM, osCaps[VM.OS]);
          if(osCaps[VM.OS] && osCaps[VM.OS].length > 0) {
            async.each(osCaps[VM.OS], function(browser, it_callback){
              if(!browser) return it_callback();
              
              //console.log('----', VM.CAPS, browser, '----');
              if(VM.CAPS[browser]) {
                var vmPath = vmName + '/' + VM.ID;
                if(!capVMs[vmPath]) capVMs[vmPath] = [];
                if(capVMs[vmPath].indexOf(browser) < 0) capVMs[vmPath].push(browser);
                
                osCaps[VM.OS][osCaps[VM.OS].indexOf(browser)] = null;
              }
              
              it_callback();
            }, function(err){
              vm_callback();
            });
          }
          else vm_callback();
        }, function(err) {
          vms_callback();
        });
      },function(err) {
        callback(capVMs);
      });
    });
  });
}

var launchVm = function(os, callback) {
  if(os.indexOf('/') < 0) return callback(['invalid os']);
  var parts =  os.split('/');
  var destVMS = parts[0];
  var destVm = parts[1];

  getVMServers(function(vms) {
    async.each(vms, function(VMS, each_callback) {
      if(VMS.name == destVMS) {
        var url = 'http://' + VMS.host + '/vm/start?os=' + destVm;
        utils.getJson(url, function(err, data) {
          if(err || !data.res) console.log('Could not start VM', err);
          else console.log('Started VM', data);
          
          each_callback();
        });            
      }
      else each_callback();
    }, function(err){
      return callback(null, {res:true});
    });
  });
};

var getVMInfo = function(vmPath, callback) {
  if(vmPath.indexOf('/') < 0) return callback(['invalid VM']);
  var parts =  vmPath.split('/');
  var destVMS = parts[0];
  var destVm = parts[1];

  _getVMsList(function(VMSs){
    if(!VMSs[destVMS]) callback(['Unknown VM Server']);
    
    var capVM = {};
    var VMS = VMSs[destVMS];
    async.each(VMS, function(VM, vm_callback) {
      if(VM.ID == destVm) {
        capVM = VM;
      }
      vm_callback();
    }, function(err) {
      callback(null, capVM);
    });
  });
}

//exports
exports.getVMsList = getVMsList;
exports._getVMsList = _getVMsList;
exports.getVm = getVm;
exports.launchVm = launchVm;
exports.getVMServers = getVMServers;
exports.getVMsWithCaps = getVMsWithCaps;
exports.getVMInfo = getVMInfo;
