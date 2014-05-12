var fs              = require('fs');
var common          = require('./utils/common.js');
var utils           = require('./utils/utils.js');
var helper          = require('./utils/helper.js')
var mailListManager = require('./utils/subscriptionMailUtils.js'); //TODO change file name
var httpServer      = require('./framework/httpServer.js');
var reqContext      = require('./framework/context.js');
var _               = require('./libs/underscore.js');
var dbUtils         = require('./libs/dbUtils.js');
var mongo           = require('./libs/mongodb.js');
var exec            = require('child_process').exec;
var path            = require('path');
var jobsHdlr        = require('./utils/jobHandler.js');
var vmUtils         = require('./utils/vmUtils.js');
var gitUtils        = require('./utils/gitUtils.js');
var jobScheduler    = require('./utils/jobScheduler.js');
var scriptAgentBL   = require('./utils/scriptAgentBL.js');

var say = common.say;
var connectParams = {
  dbName: 'automation',
  collections: ['Tests', 'Jobs', 'JobQ', 'Servers', 'Signups', 'Histories', 'Subscriptions', 'TestStatus'] //TODO: !! changed colelction names
};

function main() {
  process.setMaxListeners(0);
  
  var port = process.argv[2] || 9080;
  new scriptAgentServer(port);
}

var scriptAgentServer = function (port) {

  var self = this;
  dbUtils.dbConnect(mongo, connectParams, function (err, connection) {
    //initializing collections
    testsCollection = connection.collections.Tests;
    jobsCollection = connection.collections.Jobs;
    jobQCollection =  connection.collections.JobQ;
    serverCollection = connection.collections.Servers;
    signupCollection = connection.collections.Signups;
    historyCollection = connection.collections.Histories; 
    subscription = connection.collections.Subscriptions; 
    statuscollection = connection.collections.TestStatus; 
    //run server
    
    var context;
    self.run = function () {
      self.createGlobals(function (err, globals) {
        say('Script Agent Server running on port: ' + port);
        
        initScriptServer(connection.collections, globals.scriptPath);

        var server = httpServer.create({
          port: port,
          timeout: 1200000
        }, function (req, res) {
          context = reqContext.create(req, res, globals);
          self.requestHandler(context, function (err) {
            // end response if not handled yet
            console.log('...Not handled ....');
            context.finish();
          });
        });
      });
    }

    self.requestHandler = function (context, callback) {
      
      var genericReturn = function(err, result) {
        if (err) context.sendJson(err, 404);
        else context.sendJson(result);
      };

      switch (context.pathname) {
        //Test
      case '/RescentNews':
        utils.getNewsReport(context, genericReturn);
        break;
      case '/RescentTests':
        utils.getRescentTests(context, genericReturn);
        break;
      case '/getTests':
        helper.getItems(testsCollection, context);
        break;
      case '/getTestList':
        helper.get(testsCollection, {}, genericReturn);
        break;
      case '/saveTests':
        helper.addItems(testsCollection, context, 0, statuscollection);
        break;
      case '/deleteTests':
        helper.deleteItems(testsCollection, context);
        break;

      //Unit tests
      case '/createUnitTest':
        jobsHdlr.createTestRun(context, genericReturn);
        break;

        //Job
      case '/saveJob':
        jobsHdlr.saveJob(jobsCollection, context);
        break;
      case '/getQJobs':
        jobsHdlr.getQJobs(context, genericReturn);
        break;
      case '/getJobs':
        jobsHdlr.getJobs(context, genericReturn);
        break;
      case '/deleteJobs':
        helper.deleteItems(jobsCollection, context);
        break;
      case '/triggerJob':
        jobScheduler.triggerJob(context, genericReturn);
        break;

        //Server
      case '/getServers':
        helper.getItems(serverCollection, context);
        break;
      case '/saveServers':
        helper.addItems(serverCollection, context, 0, statuscollection);
        break;
      case '/deleteServers':
        helper.deleteItems(serverCollection, context);
        break;

        //Signup
      case '/signUp':
        scriptAgentBL.signupUser(context);
        break;
      case '/signIn':
        helper.signin(signupCollection, context);
        break;

      case '/changePassword':
        scriptAgentBL.updatePassword(signupCollection, context);
        break;
      case '/forgotPassword':
        scriptAgentBL.resetPassword(signupCollection, context);
        break;

      case '/getmailList':
        mailListManager.getMailList(context);
        break;
      case '/addMailList':
        mailListManager.addMailList(context);
        break;
      case '/removeMailList':
        mailListManager.removeMailList(context);
        break;

      case '/runTest':
        utils.runTest(context, statuscollection, subscription);
        break;

      case '/getOpSystem':
        utils.getfrmVmServer(context, 1);
        break;

      case '/getAllVMs':
        vmUtils.getVMsList(context);
        break;

      case '/getServer':
        //TODO: check where is it using
        mailListManager.getServers(context);
        break;

      case '/getTestScripts':
        utils.getTestScripts(context)
        break;
        
      case '/getrecentTestScripts':
        utils.getrecentTestScripts(context)
        break;

      case '/testHistory':
        helper.addItems(jobsCollection, context, 2, statuscollection);
        break;

      case '/getSummery':
        //helper.getItems(historyCollection, context);
        genericReturn(null, []);
        break;

      case '/saveSubscription':
        helper.addItems(subscription, context, 0, statuscollection);
        break;
      case '/getSubscription':
        helper.getItems(subscription, context);
        break;
      case '/deleteSubscription':
        helper.deleteItems(subscription, context);
        break;
     case '/getModes':
        helper.getMode(jobsCollection, context);
        break;
        
     case '/getReports':
        helper.getItems(statuscollection, context);
        break;
     case '/deleteReport':
        helper.deleteItems(statuscollection, context);
        break;
        
     case '/getUpdates':
       gitUtils.getGitUpdates(context, genericReturn);
       break;

    case '/getVMstatus':
        helper.getItems( statuscollection, context) ;
        break;
     case '/setJobStatus':
        utils.setJobStatus( statuscollection, context);
        break;
     case '/getJobStatus':
        utils.getJobStatus( statuscollection, context);
        break;
     case '/getJobReport':
        utils.getJobReport(context, genericReturn);
        break;
     case '/getReportImg':
       utils.getReportImg(context, genericReturn);
       break;

     case '/getWebDriver':
        fs.readFile('/var/www/WebDriverServer.zip', function (err, data) {
          if (err) return context.sendJson(err, 404);
          var headers = {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename=WebDriverServer.zip'
          };
          context.sendResponse(data, 200, headers);
        });
        break;

    default:
        if (context.pathname == '/index.html' || context.pathname == '/') context.pathname = '/home.html';

        var path = __dirname + '/www' + context.pathname;

        // set the appropriate mime type
        var mime = 'text/html';
        if (context.pathname.indexOf('.gif') > 0) mime = "image/gif";
        if (context.pathname.indexOf('.png') > 0) mime = "image/png";
        if (context.pathname.indexOf('.css') > 0) mime = "text/css";
        if(context.pathname.indexOf('.js') > 0) mime= "application/javascript";
        if (context.pathname.indexOf('.ttf') > 0) mime = "font/ttf";

        var headers = {
          'Content-Type': mime
        };

        // send the html data
        common.buildPage(path, function (data) {
          if(!data) return context.sendJson({error:404}, 404);
          context.sendResponse(data, 200, headers);
        });
        break;
      }
    }

    self.createGlobals = function (callback) {
      var results = {
        scriptPath: path.dirname(path.dirname(__dirname)) + '/autoscripts',
        db: connection.collections
      };
      callback(null, results);
    }

    self.run();
  });
}

var initScriptServer = function(db, scriptPath) {
  say('Initiating job scheduler');
  jobScheduler.init(db);
  
  var capyPath = scriptPath + '/common/capy';
  process.env['CAPYSCRIPT_PATH'] = capyPath;

  gitUtils.initScriptDir({}, function(err){
    if(err) say(err);
  });
}


if (__filename === process.argv[1]) main();
