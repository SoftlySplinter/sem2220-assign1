var Conference = Conference || {};

Conference.controller = (function ($, dataContext, document) {
  "use strict";

  var position = null;
  var mapDisplayed = false;
  var currentMapWidth = 0;
  var currentMapHeight = 0;
  var sessionsListSelector = "#sessions-list-content";
  var noSessionsCachedMsg = "<div>Your sessions list is empty.</div>";
  var databaseNotInitialisedMsg = "<div>Your browser does not support local " +
                                  "databases.</div>";

  var TECHNICAL_SESSION = "Technical",
    SESSIONS_LIST_PAGE_ID = "sessions",
    SESSION_PAGE_ID = "session",
    TALKS_PAGE_ID = "talks",
    MAP_PAGE = "map";

  var curSession = -1;
  var curEvent = -1;

  // This changes the behaviour of the anchor <a> link
  // so that when we click an anchor link we change page without
  // updating the browser's history stack (changeHash: false).
  // We also don't want the usual page transition effect but
  // rather to have no transition (i.e. tabbed behaviour)
  var initialisePage = function (event) {
    change_page_back_history();
  };

  var onPageChange = function (event, data) {
    // Find the id of the page
    var toPageId = data.toPage.attr("id");

    // If we're about to display the map tab (page) then
    // if not already displayed then display, else if
    // displayed and window dimensions changed then redisplay
    // with new dimensions
    switch (toPageId) {
      case SESSIONS_LIST_PAGE_ID:
        dataContext.processSessionsList(renderSessionsList);
        break;
      case SESSION_PAGE_ID:
        dataContext.processSession(renderSession, curSession);
        break;
      case TALKS_PAGE_ID:
        dataContext.processTalksList(renderTalksList, curEvent);
        break;
      case MAP_PAGE:
        if (!mapDisplayed || 
            (currentMapWidth != get_map_width() || 
             currentMapHeight != get_map_height())) {
          deal_with_geolocation();
        }
        break;
    }

    // Reset things
    curSession = -1;
    curEvent = -1;
  };

  var renderSession = function(sqlResult) {
    var session = $("#session-content");
    session.empty();
    if(sqlResult.length <= 0) {
      session.append("<div>No Events for this session</div>");
    } else {
      toListView("events-listview", 
                 queryListToArray(sqlResult).map(getEventHTML),
                 session);
    }
  };

  var renderSessionsList = function (sessionsList) {
    // o Obtain a reference to #sessions-list-content element
    var sessions = $(sessionsListSelector);
    sessions.empty();

    // o If the sessionsList is empty append a div with an error message to the
    //   page
    if(sessionsList.length <= 0) {
      sessions.append('<div>No Sessions Found.</div>');
    } else {
      toListView("session-listview",
                 queryListToArray(sessionsList).map(getSessionHTML),
                 sessions);
    }
  };

  var renderTalksList = function(talksList) {
    var talks = $('#talks-content');
    talks.empty();
    if(talksList.length <= 0) {
      talksList.append('<div>No Talks Found.</div>');
    } else {
      toListView("talks-listview",
                 queryListToArray(talksList).map(getTalkHTML),
                 talks);
    }
  }

  var toListView = function(id, items, toplevel) {
    // o Create the <ul> element using jQuery commands and append to the 
    //   sessions section
    var listviewElems = $('<ul>');
    listviewElems.attr({'id': id, 
                        'data-role':'listview',
                        'data-filter': 'true'});
    listviewElems.appendTo(toplevel);
    listviewElems.listview();

    // o Loop through all the session items to add them to the list.
    items.forEach( function(html) {
      var li = $('<li>');
      html.appendTo(li);
      li.appendTo(listviewElems);
    });

    // o You will need to refresh JQM by calling listview function
    listviewElems.listview('refresh');
  }

  var queryListToArray = function(queryList) {
    var arr = [];
    for(var i = 0; i < queryList.length; i++) {
      arr[i] = queryList.item(i);
    }
    return arr;
  }

  var getHTML = function(href, cls, clickCallback, title, subtitle, detail) {
    // HTML Soup, but in a slightly nice way.
    var a = $('<a>');
    a.attr({'href': href});
    a.click(clickCallback);

    var sessionListItem = $('<div>');
    sessionListItem.attr({'class': cls});

    var title = $('<h3>').append(title);
    var details = $('<div>');

    var type = $('<h6>').append(subtitle);
    var time = $('<h6>').append(detail);

    type.appendTo(details);
    time.appendTo(details);

    title.appendTo(sessionListItem);
    details.appendTo(sessionListItem);

    sessionListItem.appendTo(a);

    return a;
  }

  var getSessionHTML = function(sessionObj) {
    var timestring = sessionObj.day + ", " +
                     sessionObj.starttime + " - " + sessionObj.endtime;
    return getHTML('#session', 
                   'session-list-item', 
                   function() {
                     curSession = sessionObj._id; 
                   }, 
                   sessionObj.title, 
                   sessionObj.type, 
                   timestring);
  }

  var getEventHTML = function(eventObj) {
    return getHTML('#talks',
                   'session-list-item',
                   function() {
                     curEvent = eventObj._id;
                   },
                   eventObj.title,
                   eventObj.session,
                   eventObj.venue);
  }

  var getTalkHTML = function(talkObj) {
    return getHTML('#talk',
                   'talk-list-item',
                   function() {},
                   talkObj.title,
                   talkObj.speaker,
                   "");
  }

  var noDataDisplay = function (event, data) {
    var view = $(sessionsListSelector);
    view.empty();
    $(databaseNotInitialisedMsg).appendTo(view);
  }

  var change_page_back_history = function () {
    $('a[data-role="tab"]').each(function () {
      var anchor = $(this);
      anchor.bind("click", function () {
        if(anchor.attr("href") !== undefined) { 
          $.mobile.changePage(anchor.attr("href"), { // Go to the URL
            transition: "none",
            changeHash: false
          });
          return false;
        }
      });
    });
  };


  var deal_with_geolocation = function () {
    var phoneGapApp = (document.URL.indexOf('http://') === -1 && 
                       document.URL.indexOf('https://') === -1 );
    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
      /* Running on a mobile. Will have to add to this list for other 
       * mobiles. 
       *
       * We need the above because the deviceready event is a phonegap 
       * event and if we have access to PhoneGap we want to wait until it
       * is ready before initialising geolocation services.
       */
      if (phoneGapApp) {
        //alert('Running as PhoneGapp app');
        document.addEventListener("deviceready", initiate_geolocation, 
                                  false);
      }
      else {
        initiate_geolocation(); // Directly from the mobile browser
      }
    } else {
      initiate_geolocation(); // Directly from the browser
    }
  };

  var initiate_geolocation = function () {
    // Do we have built-in support for geolocation (either native browser 
    // or phonegap)?
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(handle_geolocation_query, 
                                               handle_errors);
    }
    else {
      // We don't so let's try a polyfill
      yqlgeo.get('visitor', normalize_yql_response);
    }
  };

  var handle_errors = function (error) {
    var errorString = "";
    switch (error.code) {
      case error.PERMISSION_DENIED: 
        errorString = "This app doesn't have permission to access " +
                      "your location."+
                      "<br /><br />" +
                      "<i>Please enable location services to access " +
                      "this feature.</i>";
        break;
      case error.POSITION_UNAVAILABLE:
        errorString = "This app currently can't access your location.";
        break;
      case error.TIMEOUT:
        errorString = "This app currently can't access your location." +
                      "<br/><br />" + 
                      "<i>Please try again later</i>";
        break;
      default:
        errorString += "Unknown error.";
        break;
    }
    $('#map-error-popup-text').empty().append(errorString);
    $('#map-error-popup').popup().popup('open');
  };

  var normalize_yql_response = function (response) {
    if (response.error) {
      var error = { code: 0 };
      handle_errors(error);
      return;
    }

    position = {
      coords: {
        latitude: response.place.centroid.latitude,
        longitude: response.place.centroid.longitude
      },
      address: {
        city: response.place.locality2.content,
        region: response.place.admin1.content,
        country: response.place.country.content
      }
    };

    handle_geolocation_query(position);
  };

  var get_map_height = function () {
    return $(window).height() - ($('#maptitle').height() + 
                                 $('#mapfooter').height());
  }

  var get_map_width = function () {
    return $(window).width();
  }

  var handle_geolocation_query = function (pos) {
    position = pos;

    var the_height = Math.round(get_map_height());
    var the_width = get_map_width();

    var image_url = "http://maps.google.com/maps/api/staticmap?" + 
                    "sensor=true" +
                    "&center=" + position.coords.latitude + "," +
                    position.coords.longitude + 
                    "&zoom=14" +
                    "&size=" + the_width + "x" + the_height +
                    "&markers=color:blue|" +
                    position.coords.latitude + ',' + 
                    position.coords.longitude;

    $('#map-img').remove();

    jQuery('<img/>', {
      id: 'map-img',
      src: image_url,
      title: 'Google map of my location'
    }).appendTo('#mapPos');

    mapDisplayed = true;
  };

  var init = function () {
    // The pagechange event is fired every time we switch pages or display 
    // a page for the first time.
    var d = $(document);
    var databaseInitialised = dataContext.init();
    if (!databaseInitialised) {
      d.bind("pagechange", noDataDisplay);
    }
    d.bind("pagechange", onPageChange);
    // The pageinit event is fired when jQM loads a new page for the first 
    // time into the Document Object Model (DOM). When this happens we want
    // the initialisePage function to be called.
    d.bind("pageinit", initialisePage);
  };


  // Provides a hash of functions that we return to external code so that 
  // they  know which functions they can call. In this case just init.
  var pub = {
    init: init
  };

  return pub;
}(jQuery, Conference.dataContext, document));

// Called when jQuery Mobile is loaded and ready to use.
$(document).bind("mobileinit", function () {
  Conference.controller.init();
});
