var mkdirp = require('mkdirp');
var fs     = require('fs');
var path     = require('path');
var common  = require('./common.js');
var spawn  = require('child_process').spawn;
var exec  = require('child_process').exec;
var say = common.say; 

var cloneGitRepo = function(gitUrl, tagPath, callback) {
  console.log('git clone ' + gitUrl);
  exec('git clone ' + gitUrl, {cwd:tagPath}, function(err, stdout, stderr) {
    say(stdout, stderr);
    callback(err, {});
  });
}

var checkoutTag = function(gitPath, tagName, callback) {
  console.log('git checkout -f ' + tagName);
  exec('git checkout -f ' + tagName, {cwd:gitPath}, function(err, stdout, stderr) {
    say(stdout, stderr);
    callback(err, {});
  });
}

var gitPullRepo = function(gitPath, callback) {
  console.log('git pull');
  exec('git pull', {cwd:gitPath}, function(err, stdout, stderr) {
    say(stdout, stderr);
    callback(err, {stdout:stdout, stderr:stderr});
  });
}

var initScriptDir = function(opt, callback) {
  common.getScriptPath(opt, function(scriptPath, exists) {
    if(exists) return gitPullRepo(scriptPath, callback);
    
    common.getScriptSourceInfo(opt, function(scriptInfo){
      if(!scriptInfo.scriptPath || !scriptInfo.repoPath)
        return gitPullRepo(scriptPath, callback);

      console.log(scriptInfo);
      mkdirp(scriptInfo.tagPath, function(err) {
        cloneGitRepo(scriptInfo.gitRepo, scriptInfo.tagPath, function(err, reply) {
          if(err) return callback(err, {});
          
          checkoutTag(scriptInfo.repoPath, opt.tag || 'HEAD', function(err, reply) {
            return gitPullRepo(scriptInfo.repoPath, callback);
          });
        });
      });
    });
  });
}

var getGitUpdates = function(context, callback) {
  common.getScriptSourceInfo({}, function(scriptInfo){
    var repoPath = scriptInfo.repoPath || './';
    gitPullRepo(repoPath, function(err, reply){
      if(err) return callback(err);
      if(reply.stderr && reply.stderr.length > 10) return callback(null, {res:false});
      
      callback(null, {res:true});
    });
  });
}

exports.initScriptDir = initScriptDir;
exports.getGitUpdates = getGitUpdates;
