var sessionname = sessionname != null ? readCookie("user_email") : "Guest";
var testsResult;

function displayHistory() {

  $("#history").append('<div id="accordion">')

  $.ajax({
    url: '/testHistory',
    cache: false
  }).done(function (report) {
    if(report)
      $("#history").append(report)

     
  });

  
};
function expandRow() {

  $("#report tr:not(.odd)").hide();
  $("#report tr:first-child").show();
  $("#report tr.odd").click(function () {
    $(this).next("tr").toggle();
    $(this).find(".arrow").toggleClass("up");
  });
}
