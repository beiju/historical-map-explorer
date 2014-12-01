define(['dataUtilities', 'jquery', 'Firebase', 'FirebaseAuth', 'RectDrawer', 'PolyDrawer', 'LayerManager', 'Downloader', 'Leaflet', 'jquery-ui', 'LeafletDraw', 'LeafletMiniMap'], 
		function(dataUtilities, $, Firebase, FirebaseAuth, RectDrawer, PolyDrawer, LayerManager, Downloader, L) {
	"use strict";
	
	var map,
	    DATA = [],
	    fb = new Firebase('https://vpc.firebaseio.com/debarbari');
	
	// Remove if possible!!!!
	var fbAuth;
	var rectDrawer;
	var polyDrawer;
	var layerManager;
	var downloader;
	var loggedIn = false;
		
	/* Load up the autocomplete bar with all the names
	 */
	function initializeSearch() {
	  fb.child('vpc/features').on('child_added', function (snapshot) {
	    DATA.push(snapshot.val());
	    var names = dataUtilities.getAutoCompleteNames([DATA]);
	    $(".search").autocomplete({ source: names });
	  });
	  $(".search").on("autocompleteselect", function (event, ui) {
	    var landmark = dataUtilities.findData(DATA, ui.item.value);
	    map.setView(landmark.properties.center, 8 /* LOL IGNORE ZOOM */, { animate: true });
	  });
	}
	
	/* Create a menu item for each layer
	 */
	function initializeLayers() {
	  fb.child('vpc/layers').on('child_added', function (snapshot) {
	    var data = snapshot.val();
	    var newOption = '<li role="presentation"><a role="menuitem" id="'+data.id+'-layer" href="#">'+data.name+'</a></li>';
	
	    if (data.parent) {
	      var strippedParentName = data.parent.replace(/\s/g, '');
	      if ($('#'+strippedParentName+'-menu').length === 0) {
	        var newGroup = ' <li class="dropdown-submenu"><a href="#">'+data.parent+'</a><ul id="'+strippedParentName+'-menu" class="dropdown-menu"></ul></li>';
	        $('#new-layer-parent-other').before('<option value="'+data.parent+'">'+data.parent+'</option>');
	
	        if (loggedIn) {
	          $('#new-layer-menu').before(newGroup);
	        }
	        else {
	          $('layers-menu').append(newGroup);
	        }
	      }
	      $('#'+strippedParentName+'-menu').append(newOption);
	    }
	    else {
	      if (loggedIn) {
	        $('#new-layer-menu').before(newOption);
	      }
	      else {
	        $('.layers-menu').append(newOption);
	      }
	    }
	
	    $('#' + data.id + '-layer').click(layerManager.toggleLayer.bind(this, data.id, data.color));
	    $('.layers-select').append('<option value="'+data.id+'">'+data.name+'</option>');
	  });
	}
	
	/* Show the login form
	 */
	function showLoginForm(type) {
	  var callback;
	  if (type === "login") {
	    callback = fbAuth.login;
	  }
	  else {
	    alert("Not working yet. Check back soon!");
	    return;
	
	    //Uncomment this when it's needed:
	    //callback = fbAuth.signup;
	  }
	
	  $('#password').on('keyup', function(e) {
	    if (e.keyCode === 13) {
	      callback($('#email').val(), $('#password').val());
	      $('#password').off('keyup');
	    }
	  });
	
	  $('#login-form').css('display', 'block');
	  $('#login-text').hide();
	}
	
	
	// Move these if possible
	fbAuth = new FirebaseAuth(fb);
	rectDrawer = new RectDrawer();
	polyDrawer = new PolyDrawer();
	layerManager = new LayerManager();
	downloader = new Downloader();
		
	// jQuery init
	$(document).ready(function() {
		// Get data from Firebase
		initializeSearch();
		initializeLayers();

		// Register handlers
		$("#dlbutton").click(function () {
			var link = document.createElement("a");
			link.href = downloader.getData();
			link.download = "explorer.png";
			var theEvent = document.createEvent("MouseEvent");

			// Here we create and dispatch a "realistic" event
			// to fool browsers' built-in popup blockers
			theEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
			link.dispatchEvent(theEvent);
		});

		$("#select").click(rectDrawer.initialize.bind(rectDrawer, downloader.downloadSection));

		$('#drawmode').click(polyDrawer.startPolyMode);

		$('#login-link').click(function () {
			showLoginForm('login');
		});
		$('#signup-link').click(function () {
			showLoginForm('signup');
		});
		$('#logout-link').click(fbAuth.logout);

		$('#new-layer-button').click(layerManager.addNewLayer);
		$('#new-feature-submit').click(polyDrawer.submitFeature);
		$('#new-feature-discard').click(polyDrawer.discardFeature);

		$('#clone-button').click(layerManager.clonePoly);

		$('#plus-sign').click(function () {
			$('#info-modal').modal('show');
		});

		// Tooltips
		$('#dlbutton').tooltip({ placement: 'bottom' });
		$('#select').tooltip({ placement: 'bottom' });
		$('#layers').tooltip({ placement: 'bottom' });
		$('#drawmode').tooltip({ placement: 'bottom' });
		$('#plus-sign').tooltip({ placement: 'bottom' });

		// Initialize leaflet map
		map = L.map('map', { center: [-73, 294/*22973.5*/], zoom: 3, attributionControl: false });
		new L.Control.Attribution({ prefix: false, position: 'bottomleft' }).addAttribution('<a href="http://veniceprojectcenter.org"><img src="img/vpc-small.png"></img></a>').addTo(map);
		L.tileLayer('http://debarbari.veniceprojectcenter.org/tiles2/{z}/{x}/{y}.png', {minZoom: 2, maxZoom: 8, tms: true}).addTo(map);

		var tms2 = L.tileLayer('http://debarbari.veniceprojectcenter.org/tiles2/{z}/{x}/{y}.png', {minZoom: 1, maxZoom: 1, tms: true});
		var miniMap = new L.Control.MiniMap(tms2, { toggleDisplay: true }).addTo(map);

		// Add zoom out button
		var ViewAllControl = L.Control.extend({
			options: {
					position: 'topleft'
			},

			onAdd: function (map) {
				// Create the control container with a particular class name
				var container = L.DomUtil.create('div', 'leaflet-bar');

				var link = L.DomUtil.create('a', '', container);
				link.href = "#";

				// Add a click handler
				$(link).click(function() {
					map.setZoom(1);
				});

				var img = L.DomUtil.create('img', 'fullscreen-link', link);
				img.src = "img/fullscreen.png";
				img.style.width = '14px';
				img.style.height = '14px';

				return container;
			}
		});

		map.addControl(new ViewAllControl());
	});
	
	return function init() {
		console.log('initted');
		console.log(dataUtilities)
	};
});