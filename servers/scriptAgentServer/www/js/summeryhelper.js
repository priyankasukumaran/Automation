// get recent test scripts....
function recentTestscripts() {

  $('#recentTestscripts').html('');
  var html = '<table width="580px" class="sumTable">';
  $.ajax({
    type: "GET",
    url: "/getrecentTestScripts",
    success: function (result) {
      result = result.reverse();
      result.forEach(function (value) {
        var strdate = value.date;
        var script = value.script
        html += '<tr class="sumTr">';
        html += '<td style="width:500px">' + script + '</td>';
        html += '<td style="width:80px; color:silver">' + timeSince(strdate) + '  ago</td>';
        html += '</tr>';
      });
      html += '</table>';
      $('#recentTestscripts').append(html);
    }
  });
}

function getTestSummery() {
   
   displayTestsHistory();
   displayLatestNews();
   recentTestscripts()
}

function displayTestsHistory() {
  $('#recentTest').html('');
  var html = '<table width="580px" class="sumTable">';
  var testresult;

  $.ajax({
    type: 'GET',
    url: "/RescentTests",
    dataType: "json",
    success: function (tests) {

      if(tests){
        tests.forEach(function (data) {
          var report = data.report;
          var testDetails = data.testdetails;
          for (var browser in report) {
            
            var data = report[browser].result || '';
            data = data.replace(/\n/g, '<br />');
            testresult = data.indexOf('Test Passed') > -1 ? '<b><font color="green">Passed</b>' : '<b><font color="red">Failed</b>'
            html += '<tr class="sumTr">';
            html += '<td style="width:400px">' + testDetails.names + '</td>';
            html += '<td style="width:100px; color:silver">' + timeSince(report[browser].endTm) + 'ago</td>';
            html += '<td style="width:80px;color:green">' + testresult + '</td>';
            html += '</tr>';
          }
        });
        html += '</table>';
        $('#recentTest').html(html);
      }
    }
  });
}

function displayLatestNews() {

  $('#recentNews').html('');
  var html = '<table width="385px" class="sumTable">';
  $.ajax({
    type: 'GET',
    url: "/RescentNews",
    dataType: "json",
    success: function (news) {
      var objNews = JSON.parse(news);
      if(objNews) {
        var keys = Object.keys(objNews).reverse();
        for(i=0; i< keys.length; i++) {
          html += '<tr class="sumTr" >';
          html += '<td style="width:385px";class="curved-border-bottom">' + objNews[keys[i]].news + '</td>';
          html += '</tr>';
        }
        html += '</table>';
        $('#recentNews').html(html);
      }
    }
  });
}

function timeSince(date) {

    var seconds = Math.floor((new Date() - date) / 1000);

    var interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + " years";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + " months";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " days";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " hours";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}


