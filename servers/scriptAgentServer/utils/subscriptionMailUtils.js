var fs = require('fs');

var readConfig = function(callback) {
  fs.readFile(__dirname + '/subscriptionConfig.json', function (err, data) {
    if(!err)
      callback(data)
  });
}

var writeConfig = function(data, callback) {
  fs.writeFile(__dirname + '/subscriptionConfig.json', data, function (err, data) {
    if(!err)
      callback(data)
  });
}


var getMailList = function(context) {
  var dataObj;
  var query = context.query;
  console.log(query)
  readConfig(function (err, data) {
    var configData = JSON.parse(data).panini;
    console.log(configData)
    if (!err)
      return context.sendJson(configData[query.server].testingMode.mailList, 404);
    else
      return context.sendJson([], 404);
  });
}

var getServers = function(context) {
  readConfig(function (err, data) {
    var configData = JSON.parse(data).panini;
    var servers = [];
    for(var key in configData)
      servers.push(key)
    return context.sendJson(servers, 404);
  });
}

var addMailList = function(context) {
  var query = context.query;
  readConfig(function (err, data) {
    var configData = JSON.parse(data).panini;
    configData[query.server].testingMode.mailList.push(query.mail)
    writeConfig(JSON.stringify({"panini": configData}), function (err) {
      if (!err)
      return context.sendJson(['done'], 404);
      else
      return context.sendJson(err, 404);
    });
  });
}

var removeMailList = function(context) {
  var query = context.query;
  readConfig(function (err, data) {
    var configData = JSON.parse(data).panini;
    var count = 0
    query.mail.split(',').forEach(function (mail) {
      var index = configData[query.server].testingMode.mailList.indexOf(mail);
      configData[query.server].testingMode.mailList.splice(index, 1);
      count++;
      if (count == query.mail.split(',').length) {
        writeConfig(JSON.stringify({"panini": configData}), function (err) {
          console.log(err)
          if (!err)
            return context.sendJson(['done'], 404);
          else
            return context.sendJson(err, 404);
        });
      }
    });
  });
}

exports.removeMailList = removeMailList;
exports.addMailList = addMailList;
exports.getServers = getServers;
exports.getMailList = getMailList;
