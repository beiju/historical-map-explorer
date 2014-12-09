define(['jquery', 'lodash', 'Firebase', 'FirebaseAuth', 'RectDrawer', 'PolyDrawer', 'DataService', 'LayerManager', 'MapManager', 'Downloader', 'jquery-ui', 'bootstrap'], 
		function($, _, Firebase, FirebaseAuth, RectDrawer, PolyDrawer, DataService, LayerManager, MapManager, Downloader) {
	"use strict";
	
	/// CONSTANTS
	var DEFAULT_MAP = 'debarbari';
	var FIREBASE_URL = 'https://vpc.firebaseio.com/cartography';
	
	/// EXTERNAL LIBRARIES
	var fb = new Firebase(FIREBASE_URL);
	var fbAuth = new FirebaseAuth(fb);
	
	/// CORE FUNCTIONALITY
	var dataService = new DataService(fb, fbAuth, DEFAULT_MAP);
	var mapManager = new MapManager(dataService);
	var layerManager = new LayerManager(dataService, mapManager);
	mapManager.onSwitch(function() { layerManager.reload(); });

	/// EXTRA FUNCTIONALITY
	var downloader = new Downloader();
	var rectDrawer = new RectDrawer();
	var polyDrawer = new PolyDrawer();
	
	
	/* 
	 * Load up the autocomplete bar with all the names
	 */
	function initializeSearch() {
		var autocompleteNames = [];
		
		fb.child('features').on('child_added', function (snapshot) {
			var feature = snapshot.val();
			feature.id = snapshot.name();
			dataService.push(feature);
			autocompleteNames.push(feature.properties.name);
		});
		
		$(document).ready(function(){
			// The autocomplete plugin accesses its source by reference, so when a new
			// value is added to autocompleteNames the plugin will pick it up
			$(".search").autocomplete({ source: autocompleteNames });
			$(".search").on("autocompleteselect", function (event, ui) {
				var landmark = dataService.findData(ui.item.value);
				map.setView(landmark.properties.center, 8 /* LOL IGNORE ZOOM (TODO: why?) */, { animate: true });
			});
		});
	}
	
	/* 
	 * Show the login form
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
				console.log("Login attempt started");
				callback($('#email').val(), $('#password').val());
				//$('#password').off('keyup');
			}
		});
	
		$('#login-form').css('display', 'block');
		$('#login-text').hide();
	}
		
	// Kick off the loading
	initializeSearch();
	layerManager.initMenu();
	mapManager.initMenu();

	// jQuery init
	$(document).ready(function() {
		
		mapManager.initMap();
		
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
		$('#new-map-button').click(mapManager.addNewMap);
		$('#new-feature-submit').click(polyDrawer.submitFeature);
		$('#new-feature-discard').click(polyDrawer.discardFeature);

		$('#clone-button').click(layerManager.clonePoly);
		
		$('#map').on('click', '.clone', function() {
			layerManager.cloneModal();
		}).on('click', '.delete', function() {
			layerManager.deletePoly();
		});

		$('#plus-sign').click(function () {
			$('#info-modal').modal('show');
		});

		// Tooltips
		$('#dlbutton').tooltip({ placement: 'bottom' });
		$('#select').tooltip({ placement: 'bottom' });
		$('#drawmode').tooltip({ placement: 'bottom' });
		$('#plus-sign').tooltip({ placement: 'bottom' });
		$('#layers').tooltip({ placement: 'bottom' });
		$('#maps').tooltip({ placement: 'bottom' });
		$('#layer-dropdown').on('show.bs.dropdown', function () {
			try {
				$('#layers').tooltip("hide");
			} catch (e) {
				$('#layers').tooltip("option", "disabled", true);
			}
		});
		$('#map-dropdown').on('show.bs.dropdown', function () {
			try {
				$('#maps').tooltip("hide");
			} catch (e) {
				$('#maps').tooltip("option", "disabled", true);
			}
		});
	});
	
	return true;
});