window.onerror = function (errorMsg, url, lineNumber) {
    return true;
    //alert('Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber);
}

//==== PHONEGAP FUNCTIONALITY ====
var app = {
initialize: function() {
    this.bindEvents();
},
bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
},
onDeviceReady: function() {
	console.log('one')
    window.sa = new sa();
}
};

// ==== SA APP INSTANCE ====
function sa(){
	this.app_url = 'http://app.shevetahim.com/api.php';
	//this.app_url = 'http://45.79.131.79/shevet_ahim/backend/htdocs/api.php';
	
	// user
	this.session = {};
	this.session.signed_up = null;
	this.session.id = null;
	this.session.key = null;
	this.session.status = null;
	this.session.age = null;
	this.session.sex = null;
	this.session.has_children = null;
	this.session.push_notifications = null;
	this.session.inside = null;

	// app properties
	this.hebdate = null;
	this.position = {coords:{latitude: 8.97,longitude:-79.51}};
	this.requests = {};
	this.params = {};
	this.cfg = {};
	this.last_url = null;
	this.hatzalah_phone = null;
	this.dsi_phone = null;

	// lazy loading
	this.more_waiting = null;
	this.more_last_timestamp = null;
	this.more_interval_days = 30;
	this.more_last_load = moment().unix();
	this.more_attempts = 0;

	// feed cache
	this.feed = [];
	this.preloaded = false;

	// init
	this.init();
}

sa.prototype.init = function(){
	var self = this;

	async.series([
	    function (callback) {
	    	// remove loading overlay
	    	$('#sa-startup-mask').hide();
	    	
	    	// top bar for iOS
	    	self.resizePanels();

	    	// rotation stuff
	    	$(window).resize(function() {
	    		self.resizePanels();
	    	});

	    	// get current position
	    	if (navigator && navigator.geolocation && navigator.geolocation.getCurrentPosition) {
				navigator.geolocation.getCurrentPosition(function(position){
					self.setProp('position',position);
				},function(error){
				},{ enableHighAccuracy: true });
	    	}

			// initialize hebdate object and set position (default Panama City)
			self.setProp('hebdate',new Hebcal.HDate());
			self.hebdate.setLocation(self.position.coords.latitude,self.position.coords.longitude);

			callback();
		},
		function (callback) {
			// link parameters
			$(document).on('click','a',function(){
				if ($(this).parent('li').length)
					var raw = $(this).parent('li').attr('data-params');
				else
					var raw = $(this).attr('data-params');

				var data_string = decodeURIComponent(raw);
				var data = null;

				if (self.isJSON(data_string))
					data = JSON.parse(data_string);

				self.setProp('params',data);
			});

			// ui functionality
			$('#sa-hebdate-date').html(self.headerDate());
			$(document).on('click','#sa-signup',function(e) {
				self.signup(this);
				e.preventDefault();
			});
			$(document).on('click','#sa-login',function(e) {
				self.login(this);
				e.preventDefault();
			});
			$(document).on('click','#facebook-login-button',function(e) {
				e.preventDefault();
				self.facebookLogin(this);
			});
			$(document).on('click','.sa-close-popup',function(e){
				$(this).parents('.popup-full').find('.sa-items').html('');
			});
			$(document).on('click','#sa-settings-submit',function(e) {
				self.saveSettings(this);
				e.preventDefault();
			});
			$(document).on('click','#sa-password-submit',function(e) {
				self.savePassword(this);
				e.preventDefault();
			});
			$(document).on('click','#logout1,#logout2',function(){
				self.logout();
				$("body").pagecontainer("change","#logout");
			});
			$(document).on('click','.ui-input-btn',function(){
				$.mobile.loading('show');
			});

			$(document).on('click','.arrow',function(){
				$.mobile.loading('show');
				$('.ui-page-active').append($('#sa-loading-mask').clone().removeClass('dummy').css('display','block').attr('id',''));

				var page = $(this).attr('href');
				var left = $(this).hasClass('arrow-left');
				if (page == '#zmanim')
					self.loadZmanim();
				else if (page == '#shiurim')
					self.loadShiurim();
			});

			$(document).on('click','.sa-add-reminder',function(){
				var name = $('.ui-page-active').find('.calendar_name').val();
				var location = $('.ui-page-active').find('.calendar_location').val();
				var start = $('.ui-page-active').find('.calendar_start').val();
				var end = $('.ui-page-active').find('.calendar_end').val();
				self.addToCalendar(name,location,start,end);
			});

			$('#sa-top-nav').toolbar();
			$('#sa-bottom-nav').toolbar();
			$('#sa-form-errors').popup();
			$("#sa-form-errors .errors").listview();
			$('#sa-form-errors .submit-button').button().click(function(){
				$('#sa-form-errors').popup('close');
				$.mobile.loading('hide');
				$('.ui-page-active .sa-loading-mask').remove();
			});
			$('#sa-form-messages').popup();
			$("#sa-form-messages .messages").listview();
			$('#sa-form-messages .submit-button').button().click(function(){
				$('#sa-form-messages').popup('close');
				$.mobile.loading('hide');
				$('.ui-page-active .sa-loading-mask').remove();
			});
			$('#sa-form-announcements').popup();
			$('#sa-form-announcements #close-ann').button().click(function(){
				$('#sa-form-announcements').popup('close');
				$.mobile.loading('hide');
				$('.ui-page-active .sa-loading-mask').remove();
			});
			$('#sa-form-announcements #next').button().click(function(){
				self.displayAnnouncements();
			});
			$("#sa-menu").panel();
			
			self.setProp('preloaded',true);
			self.loadFeed(false,true);
			self.loadSettings();
			self.loadDateOverrides();
			self.loadTefilot();
			self.loadZmanim(true);

			// page load events
			$(document).on("pagecontainerbeforeshow",function(event,ui) {
				var page = ui.toPage.prop("id");
				if (page == 'news-feed') {
					if (!self.preloaded) {
						self.loadSettings();
						self.loadFeed(false);
					}
				}
				else if (page == 'events')
					self.loadEvents(true);
				else if (page == 'events-detail')
					self.displayDetail();
				else if (page == 'content')
					self.loadContent();
				else if (page == 'content-detail')
					self.displayDetail();
				else if (page == 'kids')
					self.loadEvents(true,null,true);
				else if (page == 'shiurim')
					self.loadShiurim();
				else if (page == 'zmanim')
					self.loadZmanim();
				else if (page == 'directory')
					self.loadDirectory('community');
				else if (page == 'directory-detail')
					self.displayDetail();
				else if (page == 'shlijim')
					self.loadShlijim();
				else if (page == 'shlijim-detail')
					self.displayShlijimDetail();
				else if (page == 'kashrut') {
					var selected = $('#' + page).find('.sa-tabs.ui-btn-active').attr('href');
					if (selected == '#karshrut-restaurants' || !selected)
						self.loadDirectory('restaurants');
					else if (selected == '#karshrut-products')
						self.loadProducts();
				}
				else if (page == 'kashrut-detail')
					self.displayDetail();
				else if (page == 'settings')
					self.displaySettings();
				else if (page == 'links')
					self.loadLinks();
				else if (page == 'logout') {
					self.logout();
					self.setProp(['session','inside'],false);
				}

				// set last url for back button
				self.setProp('last_url',ui.prevPage.prop("id"));
				ui.toPage.find('.sa-back-button').attr('href','#' + ui.prevPage.prop("id"));
			});
			
			$(document).on("pagebeforechange",function(event,ui) {
				if (ui && ui.toPage && ui.toPage.prop) {
					var page = ui.toPage.prop("id");
					if ((page == 'signup' || page == 'signup-waiting' || page == 'signup-rejected' || page == 'login') && self.session.inside) {
						event.preventDefault();
			            event.stopPropagation();
					}
				}
			});

			// resize external panel
			$(document).on("pagecontainershow",function(event,ui) {
				self.setProp('more_last_timestamp',null);
				self.setProp('more_last_load',moment().unix());
				self.setProp('more_attempts',0);
				$('#sa-menu').height($(document).height());
				self.resizePanels();
				self.externalLinks();

				$('#sa-menu').height($('#sa-menu').find('.ui-panel-inner').height());
			});
			
			// lightbox
			$('#sa-lightbox').popup();
			$(document).on("pagecreate",function() {
			    $("#sa-lightbox").on({
			        popupbeforeposition: function() {
			            var maxHeight = $(window).height() - 60 + "px";
			        }
			    });
			});
			$(document).on('click','.sa-show-lightbox',function(){
				$("#sa-lightbox").find('img').attr('src',$(this).find('img').attr('src'));
			});

			// tabs load events
			$(document).on('click','#karshrut-restaurants-tab',function(){
				self.loadDirectory('restaurants');
			});
			$(document).on('click','#karshrut-products-tab',function(){
				self.loadProducts();
			});

			// emergency
			$(document).on('click','#sa-contact-hatzalah,#sa-contact-dsi',function(){
				self.contactEmergency();
			});

			// timers
			setInterval(function() {
				self.updateHdate();
				self.loadTefilot();
				self.loadSettings();
			},30000);

			setInterval(function() {
		       self.loadMore();
			},2000);

			callback();
		},
		function (callback) {
			// get stored session
			this.session.signed_up = this.getItem('sa-signed-up');
			this.session.id = this.getItem('sa-session-id');
			this.session.key = this.getItem('sa-session-key');
			this.session.status = this.getItem('sa-session-status');
			this.session.age = this.getItem('sa-session-age');
			this.session.sex = this.getItem('sa-session-sex');
			this.session.has_children = this.getItem('sa-session-has-children');
			this.session.push_notifications = this.getItem('sa-session-push-notifications');

			// initialize appropriate state
			if (this.session.id && this.session.key && this.session.status == 'approved') {
				$("body").pagecontainer("change","#news-feed");
				$("#sa-top-nav").show();
				$("#sa-bottom-nav").show();
				
				if (!this.preloaded) {
					this.loadFeed(false);
					this.loadDateOverrides();
				}
				else
					this.preloaded = false;
				
				this.startTicker();
			}
			else if (this.session.id && this.session.key && this.session.status == 'pending') {
				$("body").pagecontainer("change","#signup-waiting");
				$("#sa-top-nav").hide();
				$("#sa-bottom-nav").hide();
			}
			else if (this.session.id && this.session.key && this.session.status == 'rejected') {
				$("body").pagecontainer("change","#signup-rejected");
				$("#sa-top-nav").hide();
				$("#sa-bottom-nav").hide();
			}
			else if (this.session.signed_up) {
				$("body").pagecontainer("change","#login");
				$("#sa-top-nav").hide();
				$("#sa-bottom-nav").hide();
			}
			else {
				$("body").pagecontainer("change","#signup");
				$("#sa-top-nav").hide();
				$("#sa-bottom-nav").hide();
			}

			if (this.session.has_children == 'Y')
				$('#sa-menu-kids').show().prev('.line').show();
			else
				$('#sa-menu-kids').hide().prev('.line').hide();

			callback();
		}.bind(this)
	]);
}

sa.prototype.signup = function(button){
    var self = this;
    var form = $(button).parents('form').serializeArray();
    var info = this.condenseForm(form);
    
    this.addRequest('User','signup',[info]);
    this.sendRequests(function(result){
                      if (result) {
                      if (result && typeof result.User.signup.results[0].errors != 'undefined') {
                      var errors = result.User.signup.results[0].errors;
                      var error_fields = result.User.signup.results[0].error_fields;
                      self.displayErrors(errors,error_fields,button);
                      }
                      else if (result && result.User.signup.results[0]) {
                      if (result.User.signup.results[0] == 'pending')
                      $("body").pagecontainer("change","#signup-waiting");
                      if (result.User.signup.results[0] == 'approved')
                      self.login(null,info);
                      
                      self.setItem('sa-signed-up',true);
                      }
                      }
                      else
                      self.displayErrors(['Su teléfono no tiene conexión al internet.']);
                      });
}

sa.prototype.login = function(button,info){
	var self = this;
	if (!info)
		info = this.condenseForm($(button).parents('form').serializeArray());
	else
		button = $('#sa-login');

	this.addRequest('User','login',[info]);
	this.sendRequests(function(result){
        var rr = JSON.stringify(result);
		if (result) {
			if (result && typeof result.User.login.results[0].errors != 'undefined') {
				var errors = result.User.login.results[0].errors;
				var error_fields = result.User.login.results[0].error_fields;
				self.displayErrors(errors,error_fields,button);
			}
			else if (result && result.User.login.results[0]) {
				self.setProp(['session','id'],result.User.login.results[0].session_id);
				self.setProp(['session','key'],result.User.login.results[0].session_key);
				self.setProp(['session','status'],result.User.login.results[0].status);
				self.setProp(['session','age'],result.User.login.results[0].age);
				self.setProp(['session','sex'],result.User.login.results[0].sex);
				self.setProp(['session','has_children'],result.User.login.results[0].has_children);
				self.setProp(['session','push_notifications'],result.User.login.results[0].push_notifications);

				self.setItem('sa-signed-up',true);
				self.setItem('sa-session-id',result.User.login.results[0].session_id);
				self.setItem('sa-session-key',result.User.login.results[0].session_key);
				self.setItem('sa-session-status',result.User.login.results[0].status);
				self.setItem('sa-session-age',result.User.login.results[0].age);
				self.setItem('sa-session-sex',result.User.login.results[0].sex);
				self.setItem('sa-session-has-children',result.User.login.results[0].has_children);
				self.setItem('sa-session-push-notifications',result.User.login.results[0].push_notifications);

				if (self.session.status == 'approved') {
					if (result.User.login.results[0].has_logged_in == 'Y') {
						$("body").pagecontainer("change","#news-feed");
						$("#sa-top-nav").show();
						$("#sa-bottom-nav").show();
					}
					else {
						self.loadTefilot();
						self.loadFeed(false);
						self.loadSettings(function(){
							$("body").pagecontainer("change","#settings");
							$("#sa-top-nav").show();
							$("#sa-bottom-nav").show();
							self.displaySettings(true);
						});
					}
					
					self.startTicker();
				}
				else if (self.session.status == 'pending')
					$("body").pagecontainer("change","#signup-waiting");
				else if (self.session.status == 'rejected')
					$("body").pagecontainer("change","#signup-rejected");

				if (self.session.has_children == 'Y')
					$('#sa-menu-kids').css('display','');
				else
					$('#sa-menu-kids').css('display','none');
			}
		}
		else
			self.displayErrors(['Su teléfono no tiene conexión al internet.']);
	});
}


// https://developers.facebook.com/docs/reference/javascript/FB.login/v2.1
// https://developers.facebook.com/docs/facebook-login/permissions
sa.prototype.facebookLogin = function(button,info){
    var self = this;
    // facebookConnectPlugin.logout(function(test) {
                facebookConnectPlugin.login(["email",'public_profile','user_about_me','user_birthday'], function(response) {
                                if (response.authResponse) {
                                var userID = response.authResponse.userID;
                                
                                facebookConnectPlugin.api(response.authResponse.userID +"/?fields=id,name,email,gender,age_range" , ["user_birthday"],function(result) {
                                                          var name_parts = result.name.split(' ');
                                                          
                                                          info = {};
                                                          info.last_name  = name_parts[1];
                                                          info.first_name = name_parts[0];
                                                          info.age = result.age_range.min;
                                                          info.email = result.email;
                                                          info.sex = (result.gender && result.gender == 'male') ? 1 : (result.gender && result.gender == 'female' ? 2 : 0);
                                                          info.fb_id = userID;
                                                          
                                                          self.login(button,info);
                                                          
                                                          });
                                }
                                            },function(error){
                                            alert(error)
                                            });
                                 /*},function(error){
                                    alert(error)
                                 });*/
}


sa.prototype.googleLogin = function(button,info){
    var self = this;
    
}

sa.prototype.saveSettings = function(button){
    var self = this;
    var info = this.condenseForm($(button).parents('form').serializeArray());
    
    self.setProp(['session','age'],info.age);
    self.setProp(['session','sex'],info.sex);
    self.setProp(['session','has_children'],info.has_children);
    self.setProp(['session','push_notifications'],info.push_notifications);
    
    self.setItem('sa-session-age',info.age);
    self.setItem('sa-session-sex',info.sex);
    self.setItem('sa-session-has-children',info.has_children);
    self.setItem('sa-session-push-notifications',info.push_notifications);
    
    this.addRequest('User','saveSettings',[info]);
    this.sendRequests(function(result){
                      if (result) {
                      if (result && typeof result.User.saveSettings.results[0].errors != 'undefined') {
                      var errors = result.User.saveSettings.results[0].errors;
                      var error_fields = result.User.saveSettings.results[0].error_fields;
                      self.displayErrors(errors,error_fields,button);
                      }
                      else if (result && result.User.saveSettings.results[0]) {
                      self.displayMessages(result.User.saveSettings.results[0].messages,button);
                      self.loadSettings();
                      
                      if ($(button).attr('data-target') == 'feed')
                      $("body").pagecontainer("change","#news-feed");
                      }
                      }
                      else
                      self.displayErrors(['Su teléfono no tiene conexión al internet.']);
                      });
}

sa.prototype.savePassword = function(button){
    var self = this;
    var info = this.condenseForm($(button).parents('form').serializeArray());
    
    this.addRequest('User','savePassword',[info]);
    this.sendRequests(function(result){
                      if (result) {
                      if (result && typeof result.User.savePassword.results[0].errors != 'undefined') {
                      var errors = result.User.savePassword.results[0].errors;
                      var error_fields = result.User.savePassword.results[0].error_fields;
                      self.displayErrors(errors,error_fields,button);
                      }
                      else if (result && result.User.savePassword.results[0]) {
                      self.displayMessages(result.User.savePassword.results[0].messages,button);
                      }
                      }
                      else
                      self.displayErrors(['Su teléfono no tiene conexión al internet.']);
                      });
}

sa.prototype.logout = function(){
	this.addRequest('User','logOut',[this.session.id]);
	this.sendRequests(function(result){});

	// remove session properties
	this.session.id = null;
	this.session.key = null;
	this.session.status = null;
	this.session.age = null;
	this.session.sex = null;
	this.session.has_children = null;
	this.session.inside = null;
	this.removeItem('sa-session-id');
	this.removeItem('sa-session-key');
	this.removeItem('sa-session-status');
	this.removeItem('sa-session-age');
	this.removeItem('sa-session-sex');
	this.removeItem('sa-session-has-children');
	this.removeItem('sa-cfg');

	// remove cached content
	this.removeItem('sa-tefilot');
	this.removeItem('sa-feed');
	this.removeItem('sa-events');
	this.removeItem('sa-content');
	this.removeItem('sa-shiurim');
	this.removeItem('sa-zmanim');
	this.removeItem('sa-events-kids');
	var event_cats = this.getItem('sa-events-cats');
	if (event_cats && event_cats.length > 0) {
		for (i in event_cats) {
			this.removeItem('sa-events-' + event_cats[i]['id']);
		}
	}

	$("#sa-top-nav").hide();
	$("#sa-bottom-nav").hide();
	this.stopTicker();
}

sa.prototype.loadTefilot = function(return_data){
	var self = this;
	var cached_tefilot = this.getItem('sa-tefilot');
	var cached_tefilot_cats = this.getItem('sa-tefilot-cats');
	var cached_tefilot_places = this.getItem('sa-tefilot-places');
	var tefilot = {};
	var tefilot_cats = {};
	var tefilot_places = {};

	this.addRequest('Events','get',[false,'rezos',false,false,false,false,false,moment().unix(),(moment().add(1,'days').unix())]);
	this.sendRequests(function(result){
		if (result && typeof result.Events.get.results[0] != 'undefined') {
			var results = result.Events.get.results[0];
			for (i in results) {
				if (!results[i].place)
					continue;
					
				results[i].place_abbr = results[i].place.replace('Sinagoga ','');
				if (!tefilot[results[i].key])
					tefilot[results[i].key] = {};
				if (!tefilot[results[i].key][results[i].place_abbr])
					tefilot[results[i].key][results[i].place_abbr] = [];

				var t = results[i].time.split(' ');
				var t1 = t[1].split(':');
				var d = moment().format('d');
				var d1 = moment().add(1,'days').format('d');
				var h = moment().hour();
				var time_raw = moment().hour(t1[0]).minute(t1[1]);
				var weekdays = results[i].weekdays.split(',');

				if (h >= 9) {
					if (results[i].key == 'shajarit') {
						if (weekdays.indexOf(d1) < 0)
							continue;
					}
					else {
						if (weekdays.indexOf(d) < 0)
							continue;
					}
				}
				/*
				if (parseInt(results[i].weekday) == parseInt(d) && (h >= 9) && results[i].key == 'shajarit')
					continue;
				else if (parseInt(results[i].weekday) != parseInt(d) && results[i].key != 'shajarit')
					continue;
		 		*/
				var time = moment().hour(t1[0]).minute(t1[1]).format('h:mm');
				if (tefilot[results[i].key][results[i].place_abbr].indexOf(time) < 0)
					tefilot[results[i].key][results[i].place_abbr].push(time);
				
				tefilot_cats[results[i].key] = results[i].category;
				tefilot_places[results[i].place_abbr] = results[i].place;
			}

			if (Object.keys(tefilot) == 0)
				tefilot = cached_tefilot;

			self.displayTefilot(tefilot,tefilot_cats);
			self.setItem('sa-tefilot',tefilot);
			self.setItem('sa-tefilot-cats',tefilot_cats);
			self.setItem('sa-tefilot-places',tefilot_places);
		}
		else
			self.displayTefilot(cached_tefilot,cached_tefilot_cats);
	});
}

sa.prototype.loadFeed = function(more,preload){
	$.mobile.loading('show');
	console.log('asd')
	var reload = (!this.session.inside && !preload);
	var start = null;
	var end = null;
	
	if (!preload)
		this.session.inside = true;

	if (more) {
		this.more_last_timestamp = (!this.more_last_timestamp) ? moment().subtract(this.more_interval_days,'days').unix() : moment(this.more_last_timestamp * 1000).subtract(this.more_interval_days,'days').unix();
		end = this.more_last_timestamp;
		start = moment(this.more_last_timestamp * 1000).subtract(this.more_interval_days,'days').unix();
	}

	var self = this;
	var feed = (!more) ? this.getItem('sa-feed') : [];
	var last = this.getItem('sa-feed-last');
	var events = (!more) ? this.getItem('sa-events') : [];
	var content = (!more) ? this.getItem('sa-content') : [];
	var old_feed = (more) ? this.getItem('sa-old-items') : [];
	var popups_shown = this.getItem('sa-popups');
	var new_items = [];
	var popups = [];
	var delay = 0;
	popups_shown = (!popups_shown) ? [] : popups_shown;
	
	if (!more && feed) {
		delay = 3000;
		$.mobile.loading('hide');
		$('.ui-page-active .sa-loading-mask').remove();
		
		self.displayFeed('news-feed',feed);
		if (moment().unix() - last < 300)
			return false;
	}
	
	if (reload) {
		feed = [];
		events = [];
		content = [];
	}

	setTimeout(function(){
		self.addRequest('Events','get',[true,null,null,null,self.session.age,self.session.sex,null,start,end]);
		self.addRequest('Content','get',[null,null,self.session.age,self.session.sex,null,start,end]);
		self.sendRequests(function(result){
			// check for upcoming holidays
			for (i = 0;i <= 7; i++) {
				var hdate = new Hebcal.HDate(moment().add(i,'days').toDate()).setLocation(self.position.coords.latitude,self.position.coords.longitude);
				var holidays = hdate.holidays();
				var candles = hdate.candleLighting();
				var timestamp = (candles) ? moment(candles).unix() : moment(hdate.gregEve()).unix();
				
				var title = null;
				if (holidays[0] && holidays[0].desc) {
					title = holidays[0].desc[0].replace(/[0-9]/g,'');
				}
				
				if (title) {
					new_items.push({title: title, type: 'event', id: title.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-'), timestamp: timestamp, category: 'Fiestas Religiosas', content: 'Recordatorio para fecha religiosa.', is_zman:true});
					break;
				}
			}
			
			// receive and parse events
			if (result) {
				var results = result.Events.get.results[0];
				for (i in results) {
					results[i].timestamp = self.getEventTimestamp(results[i]);
					new_items.push(results[i]);
				}
			}
	
			// receive and parse content items
			if (result && result.Content.get.results[0]) {
				var results = result.Content.get.results[0];
				for (i in results) {
					results[i].timestamp = self.getEventTimestamp(results[i]);
					new_items.push(results[i]);
	
					if (results[i].is_popup == 'Y' && popups_shown.indexOf(results[i].id) < 0) {
						popups.push(results[i]);
						popups_shown.push(results[i].id);
					}
				}
			}
	
			feed = (!feed) ? [] : feed;
			events = (!events) ? [] : events;
			content = (!content) ? [] : content;
	
			if (new_items.length > 0) {
				// sorting oldest first
				new_items.sort(function(a,b) {
					return a.timestamp - b.timestamp;
				});
	
				// add to cache and remove oldest items
				for (i in new_items) {
					var found = $.grep(feed,function(item){ return item.type == new_items[i].type && item.id == new_items[i].id; });
					if (found && found.length > 0)
						continue;
	
					feed.push(new_items[i]);
					if (feed.length > 50)
						feed.shift();
	
					if (new_items[i].type == 'event') {
						var found = $.grep(events,function(item){ return item.type == new_items[i].type && item.id == new_items[i].id; });
						if (found && found.length > 0)
							continue;
	
						events.push(new_items[i]);
						if (events.length > 50)
							events.shift();
					}
	
					if (new_items[i].type == 'content') {
						var found = $.grep(content,function(item){ return item.type == new_items[i].type && item.id == new_items[i].id; });
						if (found && found.length > 0)
							continue;
	
						if (new_items[i].key != 'anuncios') {
							content.push(new_items[i]);
							if (content.length > 50)
								content.shift();
						}
					}
	
					var found = $.grep(old_feed,function(item){ return item.type == new_items[i].type && item.id == new_items[i].id; });
					if (found && found.length > 0)
						continue;
	
					old_feed.push(new_items[i]);
					if (old_feed.length > 500)
						old_feed.shift();
				}
			}
	
			if (!preload) {
				self.displayFeed('news-feed',feed,more);
				self.displayAnnouncements(popups);
			}
	
			if (!more) {
				self.setItem('sa-feed',feed);
				self.setItem('sa-feed-last',moment().unix());
				self.setItem('sa-events',events);
				self.setItem('sa-content',content);
			}
			
			if (!preload) {
				self.setItem('sa-old-items',old_feed);
				self.setItem('sa-popups',popups_shown);
			}
			
			self.setProp('more_waiting',false);
		});
	},delay);
}

sa.prototype.loadSettings = function(callback){
	var self = this;
	this.addRequest('Settings','getForApp',[]);
	this.sendRequests(function(result){
		if (result) {
			var results = result.Settings.getForApp.results[0];
			var initial_status = results.user.status;
			self.setProp('cfg',results);
			self.setItem('sa-cfg',results);
			self.setProp(['session','status'],results.user.status);
			self.getItem('sa-session-status',results.user.status);
			self.setItem('sa-events-cats',results.event_cats);
			self.setItem('sa-content-cats',results.content_cats);
			self.setProp('hatzalah_phone',results.hatzalah_phone);
			self.setProp('dsi_phone',results.dsi_phone);

			if (results.user.status == 'approved' && initial_status != 'approved') {
				$("body").pagecontainer("change","#news-feed");
				if (!self.preloaded) {
					self.loadTefilot();
					self.loadFeed(false);
				}
				
				this.preloaded = false;
			}
			else if (results.user.status == 'pending') {
				$("body").pagecontainer("change","#signup-waiting");
				$("#sa-top-nav").hide();
				$("#sa-bottom-nav").hide();
			}
			else if (results.user.status == 'rejected') {
				$("body").pagecontainer("change","#signup-rejected");
				$("#sa-top-nav").hide();
				$("#sa-bottom-nav").hide();
			}

			if (results.user.has_children == 'Y')
				$('#sa-menu-kids').show().prev('.line').show();
			else
				$('#sa-menu-kids').hide().prev('.line').hide();
			
			if (callback)
				callback();

			return true;
		}
		else {
			self.setProp('cfg',self.getItem('sa-cfg'));

			if (callback)
				callback();

			return true;
		}
	});
}

sa.prototype.loadEvents = function(in_feed,category,for_kids,more){
	$.mobile.loading('show');
	
	var params = this.params;
	var start = null;
	var end = null;

	if (more) {
		this.more_last_timestamp = (!this.more_last_timestamp) ? moment().subtract(this.more_interval_days,'days').unix() : moment(this.more_last_timestamp * 1000).subtract(this.more_interval_days,'days').unix();
		end = this.more_last_timestamp;
		start = moment(this.more_last_timestamp * 1000).subtract(this.more_interval_days,'days').unix();
	}

	var new_items = [];
	var popups = [];
	var sex = this.session.sex;
	var age = this.session.age;
	var page = 'events';
	var category = (params && params.category) ? params.category : category;
	category = (category == 'all') ? null : category;
	var key = category;

	if (for_kids) {
		key = 'kids';
		sex = null;
		age = 1;
		page = 'kids';
		in_feed = false;
		category = 'kids';
	}

	var self = this;
	var events = (!more) ? this.getItem('sa-events' + (key ? '-' + key : '')) : [];
	
	if (!more && events) {
		$.mobile.loading('hide');
		$('.ui-page-active .sa-loading-mask').remove();
		
		self.displayFeed(page,events,false,['event'],category);
		more = true;
	}

	this.addRequest('Events','get',[in_feed,category,null,null,age,sex,null,start,end]);
	this.sendRequests(function(result){
		// receive and parse events
		if (result) {
			var results = result.Events.get.results[0];
			for (i in results) {
				results[i].timestamp = self.getEventTimestamp(results[i]);
				new_items.push(results[i]);
			}
		}

		events = (!events) ? [] : events;
		if (key) {
			events.filter(function(item) {
				return item.key = key;
			});
		}

		if (new_items.length > 0) {
			// sorting oldest first
			new_items.sort(function(a,b) {
				return b.timestamp - a.timestamp;
			});

			// add to cache and remove oldest items
			for (i in new_items) {
				var found = $.grep(events,function(item){ return item.type == new_items[i].type && item.id == new_items[i].id; });
				if (found && found.length > 0)
					continue;

				events.push(new_items[i]);
				if (events.length > 50)
					events.shift();
			}
		}

		self.displayFeed(page,events,more,['event'],category);
		self.setProp('more_waiting',false);

		if (!more)
			self.setItem('sa-events' + (key ? '-' + key : ''),events);
	});
}

sa.prototype.loadShiurim = function(){
    $.mobile.loading('show');
    
    var params = this.params;
    var self = this;
    var new_items = [];
    var popups = [];
    var timestamp = (!params || !params.timestamp) ? moment().unix() : params.timestamp;
    if (params)
        var events = (!params || !params.timestamp || !moment().isSame(params.timestamp * 1000,'day')) ? [] : this.getItem('sa-shiurim');
    
    this.addRequest('Events','get',[null,'shiurim',null,null,this.session.age,this.session.sex,false,timestamp,timestamp]);
    this.sendRequests(function(result){
                      // receive and parse events
                      if (result) {
                      var results = result.Events.get.results[0];
                      for (i in results) {
                      results[i].timestamp = self.getEventTimestamp(results[i]);
                      new_items.push(results[i]);
                      }
                      }
                      
                      events = (!events) ? [] : events;
                      if (new_items.length > 0) {
                      // sorting NEWEST first
                      new_items.sort(function(a,b) {
                                     return a.timestamp - b.timestamp;
                                     });
                      
                      // add to cache and remove oldest items
                      for (i in new_items) {
                      var found = $.grep(events,function(item){ return item.type == new_items[i].type && item.id == new_items[i].id; });
                      if (found && found.length > 0)
                      continue;
                      
                      events.push(new_items[i]);
                      if (events.length > 50)
                      events.shift();
                      }
                      }
                      
                      self.displaySchedule('shiurim',events);
                      if (!params || !params.timestamp || !moment().isSame(params.timestamp * 1000,'day'))
                      self.setItem('sa-shiurim',events);
                      });
}

sa.prototype.loadZmanim = function(preload){
	$.mobile.loading('show');
	
	var days_before = -1;
	var days_after = 3;
	
	var params = this.params;
	var self = this;
	var timestamp = (!params || !params.timestamp) ? moment().unix() : params.timestamp;
	var cache = this.getItem('sa-zmanim');
	cache = (!cache) ? {} : cache;
	var tefilot_cats = self.getItem('sa-tefilot-cats');
	tefilot_cats = (!tefilot_cats) ? {} : tefilot_cats;
	var showed_already = false;
	
	if (cache[moment.unix(timestamp).format('M-D')]) {
		$.mobile.loading('hide');
		$('.ui-page-active .sa-loading-mask').remove();
		
		if (!preload) {
			self.displaySchedule('zmanim',cache[moment.unix(timestamp).format('M-D')].events);
			showed_already = true;
		}
		
		if (params && params.timestamp)
			return false;
	}
	
	for (i = days_before;i <= days_after; i++) {
		var t = (i < 0) ? moment.unix(timestamp).subtract(Math.abs(i),'days').unix() : moment.unix(timestamp).add(Math.abs(i),'days').unix();
		this.addRequest('Events','get',[null,['rezos','limud','levaya'],null,null,null,null,null,t,t]);
	}

	this.addRequest('Events','get',[null,['rezos','limud','levaya'],null,null,null,null,null,timestamp,timestamp]);
	this.sendRequests(function(result){
		var d = days_before;
		var cache = {};
		
		for (i in result.Events.get.results) {
			var ts = (d < 0) ? moment.unix(timestamp).subtract(Math.abs(d),'days').unix() : moment.unix(timestamp).add(Math.abs(d),'days').unix();
			var results = result.Events.get.results[i];
			
			cache[moment.unix(ts).format('M-D')] = {events: results};
			if (d == 0 && !showed_already && !preload)
				self.displaySchedule('zmanim',results);
			
			d++;
		}
		
		self.setItem('sa-zmanim',cache);
		self.setItem('sa-tefilot-cats',tefilot_cats);
	});
}

sa.prototype.loadDateOverrides = function(){
	var self = this;
	var cache = this.getItem('sa-date-overrides');
	cache = (!cache) ? {} : cache;
	
	this.addRequest('DateOverrides','get',[]);
	this.sendRequests(function(result){
		var cache = {};
		if (result)
			cache = result.DateOverrides.get.results[0];
			
		self.setItem('sa-date-overrides',cache);
	});
}

sa.prototype.loadContent = function(more,category){
    $.mobile.loading('show');
    
    var params = this.params;
    var start = null;
    var end = null;
    
    if (more) {
        this.more_last_timestamp = (!this.more_last_timestamp) ? moment().subtract(this.more_interval_days,'days').unix() : moment(this.more_last_timestamp * 1000).subtract(this.more_interval_days,'days').unix();
        end = this.more_last_timestamp;
        start = moment(this.more_last_timestamp * 1000).subtract(this.more_interval_days,'days').unix();
    }
    
	var self = this;
	var new_items = [];
	var popups = [];
	var category = (params && params.category) ? params.category : category;
	category = (category == 'all') ? null : category;
	var content = this.getItem('sa-content' + (category ? '-' + category : ''));
	
	if (!more && content) {
		$.mobile.loading('hide');
		$('.ui-page-active .sa-loading-mask').remove();
		
		self.displayFeed('content',content,false,['content']);
		more = true;
	}

	this.addRequest('Content','get',['torah',category,this.session.age,this.session.sex,null,start,end]);
	this.sendRequests(function(result){
		// receive and parse content
		if (result) {
			var results = result.Content.get.results[0];
			for (i in results) {
				results[i].timestamp = moment(results[i].date).unix();
				results[i].type = 'content';

				if (results[i].in_popup != 'Y')
					new_items.push(results[i]);
				else
					popups.push(results[i]);
			}
		}

		content = (!content) ? [] : content;
		if (new_items.length > 0) {
			// sorting oldest first
			new_items.sort(function(a,b) {
				return b.timestamp - a.timestamp;
			});

			// add to cache and remove oldest items
			for (i in new_items) {
				var found = $.grep(content,function(item){ return item.type == new_items[i].type && item.id == new_items[i].id; });
				if (found && found.length > 0)
					continue;

				content.push(new_items[i]);
				if (content.length > 50)
					content.shift();
			}
		}

		self.displayFeed('content',content,more,['content'],category);
		self.setProp('more_waiting',false);

		if (!more)
			self.setItem('sa-content' + (category ? '-' + category : ''),content);
	});
}

sa.prototype.loadDirectory = function(category){
	$.mobile.loading('show');
	
	var params = this.params;
	var self = this;
	var category = (params && params.category) ? params.category : category;
	var directory = this.getItem('sa-directory-' + category);
	var last = this.getItem('sa-directory-last-' + category);
	
	if (directory && (moment().unix() - last < 3600)) {
		$.mobile.loading('hide');
		$('.ui-page-active .sa-loading-mask').remove();
		
		self.displayDirectory(directory,category);
		return false;
	}
	
	this.addRequest('Dir','get',[category]);
	this.sendRequests(function(result){
		if (result) {
			var results = result.Dir.get.results[0];
			directory = [];

			for (i in results) {
				directory.push(results[i]);
			}

			self.displayDirectory(directory,category);
			self.setItem('sa-directory-' + category,directory);
			self.setItem('sa-directory-last-' + category,moment().unix());
		}
	});
}

sa.prototype.loadProducts = function(){
	$.mobile.loading('show');
	
	var self = this;
	var products = this.getItem('sa-products');
	var last = this.getItem('sa-products-last');
	
	if (products && (moment().unix() - last < 3600)) {
		$.mobile.loading('hide');
		$('.ui-page-active .sa-loading-mask').remove();
		
		self.displayProducts('#kashrut-products',products);
		return false;
	}

	this.addRequest('Products','get',[]);
	this.sendRequests(function(result){
		if (result) {
			var results = result.Products.get.results[0];
			products = [];

			for (i in results) {
				products.push(results[i]);
			}

			self.displayProducts('#kashrut-products',products);
			self.setItem('sa-products',products);
			self.setItem('sa-products-last',moment().unix());
		}
	});
}

sa.prototype.loadShlijim = function(){
	$.mobile.loading('show');
	
	var self = this;
	var shlijim = this.getItem('sa-shlijim');
	var last = this.getItem('sa-shlijim-last');
	
	if (shlijim && (moment().unix() - last < 3600)) {
		$.mobile.loading('hide');
		$('.ui-page-active .sa-loading-mask').remove();
		
		self.displayShlijim('#shlijim',shlijim);
		return false;
	}

	this.addRequest('Shlijim','get',[]);
	this.sendRequests(function(result){
		if (result) {
			var results = result.Shlijim.get.results[0];
			shlijim = [];

			for (i in results) {
				shlijim.push(results[i]);
			}

			self.displayShlijim('#shlijim',shlijim);
			self.setItem('sa-shlijim',shlijim);
			self.setItem('sa-shlijim-last',moment().unix());
		}
	});
}

sa.prototype.loadLinks = function(){
	$.mobile.loading('show');
	
	var self = this;
	var links = this.getItem('sa-links');
	var last = this.getItem('sa-links-last');
	
	if (links && (moment().unix() - last < 3600)) {
		$.mobile.loading('hide');
		$('.ui-page-active .sa-loading-mask').remove();
		
		self.displayLinks('#links',links);
		return false;
	}

	this.addRequest('Links','get',[]);
	this.sendRequests(function(result){
		if (result) {
			var results = result.Links.get.results[0];
			links = [];

			for (i in results) {
				links.push(results[i]);
			}

			self.displayLinks('#links',links);
			self.setItem('sa-links',links);
			self.setItem('sa-links-last',moment().unix());
		}
	});
}

sa.prototype.contactEmergency = function(){
    var self = this;
    
    var org = $('.ui-page-active').attr('id');
    var lat = (self.position && self.position.coords) ? self.position.coords.latitude : null;
    var long = (self.position && self.position.coords) ? self.position.coords.longitude : null;
    var number = (org == 'hatzalah') ? self.hatzalah_phone : self.dsi_phone;
    
    this.addRequest('User','emergencyEmail',[org,lat,long]);
    this.sendRequests(function(result){
                      if (result) {
                      alert('La organización ha sido contactada. Puede llamar de nuevo o esperar respuesta.');
                      }
                      });
    
    cordova.InAppBrowser.open('tel:'+number, '_self', 'location=no');
}

//==== SA APP DISPLAY FUNCTIONS ====
sa.prototype.displayFeed = function(page,feed,more,types,category,topics){
	var self = this;
	category = (!category) ? null : category;
	types = (!types) ? [] : types;
	topics = (!topics) ? [] : topics;

	if (category && !more)
		$('#' + page + ' .ui-content').html('');

	var dummy = $('#sa-feed-dummy');
	if (feed && feed.length > 0) {
		self.setProp('more_attempts',0);
		var clones = [];
		
		// sorting oldest first
		feed.sort(function(a,b) {
			return a.timestamp - b.timestamp;
		});

		for (i in feed) {
			if ($('#'+page).find('#feed-' + feed[i].type + '-' + feed[i].id).length > 0 || (types.length > 0 && types.indexOf(feed[i].type) < 0))
				continue;

			var url = null;
			var clone = dummy.clone();
			clone.addClass('sa-' + feed[i].type);

			if (feed[i].type == 'event') {
				url = 'events';
				if (feed[i].timestamp >= moment().endOf('day').unix()) {
					var format = (feed[i].timestamp >= moment().endOf('week').unix()) ? 'dddd, MMM D, h:mm A' : 'dddd h:mm A';
					clone.find('.time .t span:last').html(moment(feed[i].timestamp * 1000).locale('es').format(format));
				}
				else if (feed[i].timestamp >= moment().startOf('day').unix() && feed[i].timestamp <= moment().endOf('day').unix()) {
					clone.find('.time .t span:last').html('Hoy ' + moment(feed[i].timestamp * 1000).locale('es').format('h:mm A'));
				}
				else {
					clone.find('.time .t span:last').html(moment(feed[i].timestamp * 1000).locale('es').fromNow());
				}
				
				if (feed[i].place)
					clone.find('.time .p span:last').html(feed[i].place);
				else
					clone.find('.time .p').remove();
			}

			if (feed[i].type == 'content') {
				url = 'content';
				clone.find('.time').remove();

			}
			
			if (feed[i].author_name) {
				clone.find('.author .n').html(feed[i].author_name).attr('href','mailto:' + feed[i].author_email);
				clone.find('.author .a').html('...' + moment(feed[i].timestamp * 1000).locale('es').fromNow());
				clone.find('.ago').remove();
				
				if (feed[i].author_img)
					clone.find('.author .p').attr('src',this.app_url + '?image=' + feed[i].author_img);
				else
					clone.find('.author .p').remove();
			}
			else
				clone.find('.author').remove();
			
			if (feed[i].img)
				clone.find('.img').attr('src',this.app_url + '?image=' + feed[i].img);
			else
				clone.find('.img').remove();

			clone.find('.ago').html('...' + moment(feed[i].timestamp * 1000).locale('es').fromNow());
			clone.find('.title a').html(feed[i].title).attr('href','#' + url + '-detail').attr('data-params',encodeURIComponent(JSON.stringify({id:feed[i].id, type:feed[i].type, category: category})));
			clone.find('.more').attr('href','#' + url + '-detail').attr('data-params',encodeURIComponent(JSON.stringify({id:feed[i].id, type:feed[i].type, category: category})));
			clone.find('.abstract').html((feed[i]['abstract'] ? feed[i]['abstract'] : feed[i].content));
			clone.attr('id','feed-'+feed[i].type + '-' + feed[i].id);
			clone.removeClass('dummy');

			if (more)
				clones.push(clone);
			else
				clones.unshift(clone);
		}
		
		if (more)
			$('#' + page + ' .ui-content').append(clones);
		else
			$('#' + page + ' .ui-content').prepend(clones);
		
		$('#' + page + ' .ui-content').find('.sa-no-results').remove();
	}
	else if (!more) {
		var clone = $('#sa-no-results-helper').clone().removeClass('dummy');
		$('#' + page + ' .ui-content').find('.sa-no-results').remove();
		$('#' + page + ' .ui-content').append(clone);
	}

	if (page != 'news-feed') {
		var title = '';
		if (page == 'events')
			title = 'Eventos';
		else if (page == 'content')
			title = 'Torah';
		else if (page == 'kids')
			title = 'Eventos para niños';

		var title_clone = this.displayHeader(page,title,{category:category, types:types, topics:topics});
		$('#' + page + ' .ui-content').find('.sa-schedule-title').remove();
		$('#' + page + ' .ui-content').prepend(title_clone);
		$(title_clone).trigger('create');
		this.activateHeader(title_clone,page);
	}

	$('#sa-menu').height($(document).height());
}

sa.prototype.displaySchedule = function(page,results){
	var params = this.params;
	var self = this;
	var title = '';

	if (page == 'zmanim')
		title = 'Rezos y zmanim diarios';
	else if (page == 'shiurim')
		title = 'Shiurim diarios';

	var timestamp = (!params || !params.timestamp) ? moment().unix() : params.timestamp;
	var title_clone = self.displayHeader('calendar',title,{page: page,timestamp:timestamp});
	var overrides = self.getItem('sa-date-overrides');
	var events = [];

	$('#' + page + ' .ui-content').html('');
	$('#' + page + ' .ui-content').append(title_clone);
	$(title_clone).trigger('create');
	this.activateHeader(title_clone,page);
	
	if (page == 'zmanim') {
		// apply specific overrides if in Panama City, Panama
		var in_range = false;
		if (self.position.coords.latitude && self.position.coords.latitude < 9.171759 && self.position.coords.latitude > 8.866779 && self.position.coords.longitude && self.position.coords.longitude > -79.841223 && self.position.coords.longitude < -79.122352) {
			in_range = true;
		}
		
		var overrides0 = (overrides && overrides[moment.unix(timestamp).format('YYYY-MM-DD')] && in_range) ? overrides[moment.unix(timestamp).format('YYYY-MM-DD')] : false;
		var overrides1 = (overrides && overrides[moment.unix(timestamp).add(1,'days').format('YYYY-MM-DD')] && in_range) ? overrides[moment.unix(timestamp).add(1,'days').format('YYYY-MM-DD')] : false;
		var overrides2 = (overrides && overrides[moment.unix(timestamp).add(2,'days').format('YYYY-MM-DD')] && in_range) ? overrides[moment.unix(timestamp).add(2,'days').format('YYYY-MM-DD')] : false;
		
		var hdate = new Hebcal.HDate(new Date(timestamp * 1000)).setLocation(self.position.coords.latitude,self.position.coords.longitude);
		var zmanim = (!overrides0) ? hdate.getZemanim() : overrides0;
		var sedra = hdate.getSedra();
		var daf = hdate.dafyomi();
		var holidays = hdate.holidays(true);
		var holidays_next = hdate.next().holidays();
		var candles = (!overrides0) ? hdate.candleLighting() : overrides0.candles;
		var omer = hdate.omer();
		
		if (holidays_next[0] && holidays_next[0].YOM_TOV_ENDS)
			var havdalah = (!overrides2) ? hdate.next().next().havdalah() : overrides2.tzeit;
		else if (hdate.havdalah())
			var havdalah = (!overrides0) ? hdate.havdalah() : overrides0.tzeit;
		else if (hdate.next().havdalah())
			var havdalah = (!overrides1) ? hdate.next().havdalah() : overrides1.tzeit;
		
		var day_info = {holidays:null, omer:null, candles:null, havdalah:null, sedra:null, daf:null};
		if (holidays[0] && holidays[0].desc) {
			var h_arr = [];
			for (i in holidays) {
				h_arr.push(holidays[i].desc[0].replace('Ch','J').replace('ch','j'));
			}
			day_info.holidays = h_arr.join(' / ');
		}
		if (omer && omer > 0)
			day_info.omer = 'Día <b>' + omer + '</b> del Omer.';
		if (candles)
			day_info.candles = moment(candles).format('h:mm A');
		if (havdalah)
			day_info.havdalah = moment(havdalah).format('h:mm A');
		if (sedra)
			day_info.sedra = sedra.join(' / ');
		if (daf)
			day_info.daf = daf;

		if (zmanim && Object.keys(zmanim).length > 0) {
			var lookup = {neitz_hachama: 'Netz <i>(Zman)</i>',netz: 'Netz <i>(Zman)</i>',sof_zman_shma: 'Final tiempo de Shema <i>(Zman)</i>',shema: 'Final tiempo de Shema <i>(Zman)</i>',sof_zman_tfilla:'Final tiempo de Tefilá <i>(Zman)</i>',tefilah:'Final tiempo de Tefilá <i>(Zman)</i>',mincha_gedola:'Minjá Guedolá <i>(Zman)</i>',minha_gedola:'Minjá Guedolá <i>(Zman)</i>',mincha_ketana:'Minjá Ketaná <i>(Zman)</i>',minha_ketana:'Minjá Ketaná <i>(Zman)</i>',shkiah:'Shekiá',shekia:'Shekiá <i>(Zman)</i>',tzeit:'Salida de las estrellas <i>(Zman)</i>',tzet:'Salida de las estrellas <i>(Zman)</i>'};
			for (i in zmanim) {
				if (typeof lookup[i] == 'undefined')
					continue;
				
				events.push({type: 'zman', title: lookup[i], id: i,timestamp: moment(zmanim[i]).unix()});
			}
		}

		if (candles)
			events.push({type: 'zman', title: 'Encendido de las velas', id: 'candles', timestamp: moment(candles).subtract(1,'days').unix()});
		if (havdalah)
			events.push({type: 'zman', title: 'Havdalah', id: 'havdalah' ,timestamp: moment(havdalah).unix()});
		
		var i_clone = $('#sa-day-info-dummy').clone().removeClass('dummy').attr('id','');
		if (day_info) {
			for (k in day_info) {
				if (day_info[k]) {
					$(i_clone).find('.' + k + ' .item-value').html(day_info[k]);
					if (k == 'havdalah') {
						if (moment.unix(timestamp).format('d') == 5 || moment.unix(timestamp).format('d') == 6) {
							$(i_clone).find('.' + k + ' .item-name:not(.alt)').removeClass('dummy');
							$(i_clone).find('.' + k + ' .item-name.alt').addClass('dummy');
						}
						else {
							$(i_clone).find('.' + k + ' .item-name:not(.alt)').addClass('dummy');
							$(i_clone).find('.' + k + ' .item-name.alt').removeClass('dummy');
						}
					}
				}
				else
					$(i_clone).find('.' + k).remove();
			}
		}
		$('#' + page + ' .ui-content .sa-calendar-nav').after(i_clone);
	}
	
	// receive and parse events
	if (results) {
		var tefilot = {};
		var tefilot_cats = {};
		for (i in results) {
			// sort tefilot seperately
			if (typeof results[i].p_key != 'undefined' && results[i].p_key == 'rezos') {
				results[i].place_abbr = results[i].place.replace('Sinagoga ','');
				if (!tefilot[results[i].key])
					tefilot[results[i].key] = {};
				if (!tefilot[results[i].key][results[i].place_abbr])
					tefilot[results[i].key][results[i].place_abbr] = {times:[],name:null};

				var t = results[i].time.split(' ');
				var t1 = t[1].split(':');
				
				var time = moment().hour(t1[0]).minute(t1[1]).format('h:mm A');
				if (tefilot[results[i].key][results[i].place_abbr].times.indexOf(time) < 0)
					tefilot[results[i].key][results[i].place_abbr].times.push(time);
				
				tefilot[results[i].key][results[i].place_abbr].name = results[i].place_abbr;
				tefilot_cats[results[i].key] = results[i].category;
			}
			else {
				// sort other events
				results[i].timestamp = self.getEventTimestamp(results[i]);
				events.push(results[i]);
			}
		}
	}

	if (tefilot && Object.keys(tefilot).length > 0) {
		var places = {};
		for (key in tefilot) {
			var item = {type:'tefilah', title: tefilot_cats[key], id: key, places:{}};
			if (key == 'shajarit')
				item.timestamp = moment(zmanim.neitz_hachama).add(1,'seconds').unix();
			else if (key == 'musaf')
				item.timestamp = moment(zmanim.sof_zman_tfilla).add(1,'seconds').unix();
			else if (key == 'minja')
				item.timestamp = moment(zmanim.mincha_ketana).add(1,'seconds').unix();
			else if (key == 'shir')
				item.timestamp = moment(zmanim.plag_hamincha).add(1,'seconds').unix();
			else if (key == 'neilah')
				item.timestamp = moment(zmanim.plag_hamincha).add(1,'seconds').unix();
			else if (key == 'arbit')
				item.timestamp = moment(zmanim.shkiah).add(1,'seconds').unix();
			else if (key == 'selihot')
				item.timestamp = moment(zmanim.neitz_hachama).add(-1,'seconds').unix();
			else
				item.timestamp = moment(zmanim.shkiah).add(1,'seconds').unix();

			for (abbr in tefilot[key]) {
				item.places[abbr] = tefilot[key][abbr];
			}
			events.push(item);
		}
	}

	// sorting oldest first
	events.sort(function(a,b) {
		return b.timestamp - a.timestamp;
	});

	var dummy = $('#sa-schedule-dummy');
	if (events && events.length > 0) {
		for (i in events) {
			var clone = dummy.clone();
			var helper = clone.find('.times').clone();
			clone.find('.times').remove();
			clone.find('.title a').html(events[i].title);

			if (events[i].type == 'event') {
				clone.find('.more').attr('href','#events-detail').attr('data-params',encodeURIComponent(JSON.stringify({id:events[i].id, type:'shiurim'})));
				clone.find('.time .t span:last').html(moment.unix(events[i].timestamp).format('h:mm A'));
				clone.find('.time .p span:last').html(events[i].place);
				clone.find('.times').remove();
			}
			else if (events[i].type == 'zman') {
				clone.find('.time .t span:last').html(moment.unix(events[i].timestamp).format('h:mm A'));
				clone.find('.time .p').remove();
				clone.find('.times').remove();
				clone.find('.more').remove();
			}
			else if (events[i].type == 'tefilah') {
				for (place in events[i].places) {
					events[i].places[place].times.sort(function (a, b) {
						var a1 = a.split(':');
						var b1 = b.split(':');
						return moment().hour(a1[0]).minute(a1[1].replace(/\D/g,'')).unix() - moment().hour(b1[0]).minute(b1[1].replace(/\D/g,'')).unix();
					});
					
					var h_clone = helper.clone();
					h_clone.find('.p').html(place);
					h_clone.find('.t span:last').html(events[i].places[place].times.join(', '));
					clone.find('.title').after(h_clone);
				}

				clone.find('.time').remove();
				clone.find('.more').remove();
			}

			clone.attr('id','');
			clone.removeClass('dummy');

			$('#' + page + ' .ui-content .sa-schedule-title').after(clone);
		}
		$('#' + page + ' .ui-content').find('.sa-no-results').remove();
	}
	else {
		var clone = $('#sa-no-results-helper').clone().removeClass('dummy');
		$('#' + page + ' .ui-content').find('.sa-no-results').remove();
		$('#' + page + ' .ui-content').append(clone);
	}
}

sa.prototype.displayProducts = function(container,products){
	var title_clone = this.displayHeader('products','Productos',{});
	$(container + ' .ui-listview-outer').html('');
	$(container + ' .ui-listview-outer').append(title_clone);
	$(title_clone).trigger('create');
	this.activateHeader(title_clone,'products');

	$(container + ' .sa-listview').find('li').remove();
	if (products && products.length > 0) {
		var clones = [];
		for (i in products) {
			var clone = $('#sa-product-dummy').clone();
			clone.find('h2').html(products[i].name);
			clone.find('.sa-search-text').html(products[i].name);
			clone.find('.updated span:last').html(moment(products[i].updated).locale('es').fromNow());

			if (products[i].supervision)
				clone.find('.supervision span:last').html(products[i].supervision);
			else
				clone.find('.supervision').remove();

			if (products[i].warn != 'Y') {
				clone.find('.ti-alert').removeClass('ti-alert').addClass('ti-check-box');
				clone.find('.status span:last').html('Kosher');
			}
			else {
				clone.addClass('sa-warn');
				clone.find('.status span:last').html('No Kosher');
			}

			clone.attr('id','product-' + products[i].id);
			clone.removeClass('dummy');
			clone.collapsible({refresh:true});
			clones.push(clone);
		}
		
		$(container + ' .ui-listview-outer').append(clones);
		$(container + ' .ui-listview-outer').find('.sa-no-results').remove();
	}
	else {
		var clone = $('#sa-no-results-helper').clone().removeClass('dummy');
		$(container + ' .ui-listview-outer').find('.sa-no-results').remove();
		$(container + ' .ui-listview-outer').append(clone);
	}
}

sa.prototype.displayLinks = function(container,links){
    var title_clone = this.displayHeader('links','Vínculos de interés',{});
    $(container + ' .ui-content').find('.sa-schedule-title').remove();
    $(container + ' .ui-content').prepend(title_clone);
    $(title_clone).trigger('create');
    this.activateHeader(title_clone,'links');
    
    $(container + ' .sa-listview').find('li').remove();
    if (links && links.length > 0) {
        for (i in links) {
            var clone = $('#sa-link-dummy').clone();
            clone.find('h2').html(links[i].name);
            clone.find('.sa-search-text').html(links[i].name);
            clone.find('.description p').html(links[i].description);
            clone.find('.url a').attr('href','http://' +  (links[i].url).replace('http://','').replace('https://','')).html((links[i].url).replace('http://','').replace('https://',''));
            
            clone.attr('id','link-' + links[i].id);
            clone.removeClass('dummy');
            $(container + ' .ui-listview-outer').append(clone);
            clone.collapsible({refresh:true});
        }
        $(container + ' .ui-listview-outer').find('.sa-no-results').remove();
    }
    else {
        var clone = $('#sa-no-results-helper').clone().removeClass('dummy');
        $(container + ' .ui-listview-outer').find('.sa-no-results').remove();
        $(container + ' .ui-listview-outer').append(clone);
    }
}

sa.prototype.displayShlijim = function(container,shlijim){
    $(container + ' .sa-listview').find('li').remove();
    if (shlijim && shlijim.length > 0) {
        for (i in shlijim) {
            var clone = $('#sa-shlijim-dummy').clone();
            clone.find('a span:last').html(shlijim[i].name);
            
            if (shlijim[i].warn != 'Y' && shlijim[i].status == 'approved') {
                clone.find('.sa-icon').addClass('ti-check-box');
            }
            else {
                clone.addClass('sa-warn');
                clone.find('.sa-icon').addClass('ti-na');
            }
            
            clone.attr('data-params',encodeURIComponent(JSON.stringify({id:shlijim[i].id})));
            clone.attr('id','shlijim-' + shlijim[i].id);
            clone.removeClass('dummy');
            $(container + ' .sa-listview').append(clone);
        }
        $(container + ' .sa-listview').listview('refresh');
        $(container + ' .sa-listview').find('.sa-no-results').remove();
    }
    else {
        var clone = $('#sa-no-results-helper').clone().removeClass('dummy');
        $(container + ' .sa-listview').find('.sa-no-results').remove();
        $(container + ' .sa-listview').append(clone);
    }
    
    var title_clone = this.displayHeader('shlijim','Shlijim',{});
    $(container + ' .sa-listview').find('.sa-schedule-title').remove();
    $(container + ' .sa-listview').prepend(title_clone);
    $(title_clone).trigger('create');
    this.activateHeader(title_clone,'shlijim');
}

sa.prototype.displayTefilot = function(tefilot,cats) {
    if (!tefilot || Object.keys(tefilot).length == 0)
        return false;
    
    var self = this;
    var h = moment().hour();
    var current = {};
    var key = null;
    
    if (h >= 21 || h < 9)
        key = 'shajarit';
    else if (h >= 9 || h < 6)
        key = 'minja';
    else
        key = 'arbit';
    
    current = tefilot[key];
    if (!current || Object.keys(current) == 0 || !cats)
        return false;
    
    $('#sa-tefilot-event').html(cats[key] + ':');
    $('.sa-tefila').not('.dummy').remove();
    var dummy = $('#sa-tefila-dummy');
    for (i in current) {
        current[i].sort(function (a, b) {
                        var a1 = a.split(':');
                        var b1 = b.split(':');
                        return moment().hour(a1[0]).minute(a1[1]).unix() - moment().hour(b1[0]).minute(b1[1]).unix();
                        });
        
        var clone = dummy.clone();
        clone.find('.p').html(self.smartTruncate(i,6));
        clone.find('.t').html(current[i].join('/'));
        clone.attr('id','');
        clone.removeClass('dummy');
        clone.attr('href','#zmanim')
        $('#sa-tefilot-scroll .scroll').append(clone);
    }
}

sa.prototype.displayDirectory = function(directory,category){
	var url = '';
	var url1 = '';
	var title = '';

	if (category == 'restaurants') {
		url = '#karshrut-restaurants';
		url1 = '#kashrut-detail';
		title = 'Restaurantes';
	}
	else if (category == 'community') {
		url = '#directory .ui-content';
		url1 = '#directory-detail';
		title = 'Directorio comunitario';
	}

	$(url).html('');
	if (directory && directory.length > 0) {
		for (i in directory) {
			var clone = $('#sa-directory-dummy').clone();
			var restaurant_categories = (typeof directory[i].restaurant_categories == 'string') ? directory[i].restaurant_categories.split(',') : [];
			
			/*
			var times = (typeof directory[i].times == 'string') ? directory[i].times.split(',') : [];
			var times1 = [];

			clone.find('.more').attr('href',url1).attr('data-params',encodeURIComponent(JSON.stringify({id:directory[i].id, category: directory[i].key, type: directory[i].type})))

			if (times.length > 0) {
				for (j in times) {
					var time = times[j].split('|');
					times1.push(moment(time[0]).format('h:mm a') + ' - ' + moment(time[1]).format('h:mm a'));
				}

				clone.find('.times .t span:last').html(times1.join(', '));
			}
			else
				clone.find('.times .t span:last').html('No disponible.');
				*/
			
			clone.find('.title a').attr('href',url1).html(directory[i].name).attr('data-params',encodeURIComponent(JSON.stringify({id:directory[i].id, category: directory[i].key, type: directory[i].type})));
			clone.find('.tel .item-value').html(directory[i].tel);
			clone.find('.website .item-value a').attr('href','http://' +  (directory[i].website).replace('http://','').replace('https://','')).html((directory[i].website).replace('http://','').replace('https://',''));
			clone.find('.email .item-value a').attr('href','mailto:' +  directory[i].email).html(directory[i].email);
			
			if (directory[i].lat && directory[i].long)
				clone.find('.address .item-value a').attr('href','http://maps.google.com/maps?ll=' + directory[i].lat + ',' + directory[i].long).html(directory[i].address);
			else if (directory[i].address)
				clone.find('.address .item-value a').attr('href','http://maps.google.com/?q=Panama,' + directory[i].address + ',' + directory[i].name).html(directory[i].address);
			else
				clone.find('.address').remove();
			
			if (category == 'restaurants') {
				if (directory[i].warn != 'Y')
					clone.find('.ti-alert').remove();
				else
					clone.addClass('sa-warn');

				if (restaurant_categories.length > 0) {
					for (j in restaurant_categories) {
						var topic = restaurant_categories[j].split('|');
						var helper = $('#sa-token-helper').clone();
						helper.removeAttr('id','');
						helper.html(topic[1]).attr('href','#kashrut').attr('data-params',encodeURIComponent(JSON.stringify({restaurant_type:topic[0], tab:'#kashrut-restaurants'})));
						clone.find('.categories span:last').append(helper);
					}
				}
			}
			else {
				clone.find('.ti-alert').remove();
				clone.find('.categories').remove();
			}

			clone.attr('id','directory-' + directory[i].id);
			clone.removeClass('dummy');
			$(url).append(clone);
		}
		$(url).find('.sa-no-results').remove();
	}
	else {
		var clone = $('#sa-no-results-helper').clone().removeClass('dummy');
		$(url).find('.sa-no-results').remove();
		$(url).append(clone);
	}

	var title_clone = this.displayHeader(category,title,{});
	$(url).find('.sa-schedule-title').remove();
	$(url).prepend(title_clone);
	$(title_clone).trigger('create');
	this.activateHeader(title_clone,category);
}

sa.prototype.displayDetail = function(){
	var params = this.params;
	var error_string = 'Por razones técnicas, no se puede mostrar este item.';
	
	if (!params || !params.id || !params.type) {
		this.displayErrors([error_string]);
		console.error('Error: Missing detail params.');
		return false;
	}
	
	var query = params.type;
	var page = params.type;

	// set query and page strings
	if (params.type == 'event') {
		query = (!params.category) ? 'events' : 'events-' + params.category;
		page = 'events';
	}
	else if (params.type == 'directory'){
		query = 'directory-' + params.category;
		page = (params.category == 'restaurants') ? 'kashrut' : page;
	}
	else if (params.type == 'shiurim'){
		page = 'events';
	}

	// find the detail items in db
	var items = this.getItem('sa-' + query);
	if (!items || items.length == 0) {
		var items = this.getItem('sa-old-items');
		if (!items || items.length == 0) {
			this.displayErrors([error_string]);
			console.error('Error: No stored items for this content type.');
			return false;
		}
	}

	var filtered = items.filter(function(item) {
		return (item.id == params.id && item.type == params.type);
	});
	
	if (!filtered || filtered.length == 0) {
		var items = this.getItem('sa-old-items');
		var filtered = items.filter(function(item) {
			return (item.id == params.id && item.type == params.type);
		});

		if (!filtered || filtered.length == 0) {
			this.displayErrors([error_string]);
			console.error('Error: No content items found.');
			return false;
		}
	}

	// display according to content type
	var clone = $('#sa-detail-dummy').clone();
	var item = filtered[0];
	if (item.type == 'event') {
		clone.find('.ago').html('...' + moment(item.timestamp * 1000).locale('es').fromNow());
		clone.find('.title span:last').html(item.title);
		clone.attr('id','');

		if (item.content && item.content.length > 0)
			clone.find('.content').html(item.content);
		else
			clone.find('.content').remove();

		clone.find('.time .t span:last').html(moment.unix(item.timestamp).format('dddd h:mm A'));

		if (item.timestamp >= moment().endOf('day').unix()) {
			var format = (item.timestamp >= moment().endOf('week').unix()) ? 'dddd, MMM D, h:mm A' : 'dddd h:mm A';
			clone.find('.time .t span:last').html(moment(item.timestamp * 1000).locale('es').format(format));
		}
		else if (item.timestamp >= moment().startOf('day').unix() && item.timestamp <= moment().endOf('day').unix()) {
			clone.find('.time .t span:last').html('Hoy ' + moment(item.timestamp * 1000).locale('es').format('h:mm A'));
		}
		else {
			clone.find('.time .t span:last').html(moment(item.timestamp * 1000).locale('es').fromNow());
		}
		
		if (item.place)
			clone.find('.time .p span:last').html(item.place);
		else
			clone.find('.time .p').remove();

		clone.find('.author').remove();
		clone.find('.ago').remove();
		clone.find('.times').remove();
		clone.find('.status').remove();

		var helper = $('#sa-token-helper').clone();
		helper.removeAttr('id','');
		helper.html(item.category).attr('href','#events').attr('data-params',encodeURIComponent(JSON.stringify({category:item.key})));
		clone.find('.categories span:last').append(helper);

		clone.find('.calendar_name').val(item.title);
		clone.find('.calendar_location').val(item.place);
		clone.find('.calendar_start').val(moment.unix(item.timestamp).valueOf());
		clone.find('.calendar_end').val(moment.unix(item.timestamp + 1800).valueOf());
	}
	else if (item.type == 'content') {
		clone.find('.ago').html('...' + moment(item.timestamp * 1000).locale('es').fromNow());
		clone.find('.title span:last').html(item.title);
		clone.attr('id','');

		if (item.content && item.content.length > 0)
			clone.find('.content').html(item.content);
		else
			clone.find('.content').remove();

		clone.find('.time').remove();
		clone.find('.remind').remove();
		clone.find('.times').remove();
		clone.find('.status').remove();

		if (item.author_name) {
			clone.find('.author .n').html(item.author_name).attr('href','mailto:' + item.author_email);
			clone.find('.author .a').html('...' + moment(item.timestamp * 1000).locale('es').fromNow());
			clone.find('.ago').remove();

			if (item.author_img)
				clone.find('.author .p').attr('src',this.app_url + '?image=' + item.author_img);
			else
				clone.find('.author .p').remove();
		}
		else
			clone.find('.author').remove();

		var topics = (typeof item.topics == 'string') ? item.topics.split(',') : [];
		if (topics.length > 0 && topics != '') {
			for (i in topics) {
				var topic = topics[i].split('|');
				var helper = $('#sa-token-helper').clone();
				helper.removeAttr('id','');
				helper.html(topic[1]).attr('href','#content').attr('data-params',encodeURIComponent(JSON.stringify({topics:[topic[0]]})));
				clone.find('.categories span:last').append(helper);
			}
		}
		else
			clone.find('.categories').remove();
	}
	else if (item.type == 'directory') {
		clone.find('.title span:last').html(item.name);
		clone.attr('id','');

		clone.find('.ago').remove();
		clone.find('.author').remove();
		clone.find('.time').remove();
		clone.find('.remind').remove();

		if (item.content && item.content.length > 0)
			clone.find('.content').html(item.content);
		else
			clone.find('.content').remove();

		var restaurant_categories = (typeof item.restaurant_categories == 'string') ? item.restaurant_categories.split(',') : [];
		var times = (typeof item.times == 'string') ? item.times.split(',') : [];
		var times1 = [];

		if (times.length > 0) {
			for (j in times) {
				var time = times[j].split('|');
				times1.push(moment(time[0]).format('h:mm a') + ' - ' + moment(time[1]).format('h:mm a'));
			}

			clone.find('.times .t span:last').html(times1.join(', '));
		}
		else
			clone.find('.times .t span:last').html('No disponible.');

		if (item.key == 'restaurants') {
			if (item.warn != 'Y') {
				clone.find('.ti-alert').removeClass('ti-alert').addClass('ti-check-box');
				clone.find('.status span:last').html('Kosher');
			}
			else {
				clone.addClass('sa-warn');
				clone.find('.status span:last').html('No Kosher');
			}

			if (restaurant_categories.length > 0) {
				for (j in restaurant_categories) {
					var topic = restaurant_categories[j].split('|');
					var helper = $('#sa-token-helper').clone();
					helper.removeAttr('id','');
					helper.html(topic[1]).attr('href','#kashrut').attr('data-params',encodeURIComponent(JSON.stringify({restaurant_type:topic[0], tab:'#kashrut-restaurants'})));
					clone.find('.categories span:last').append(helper);
				}
			}
			clone.find('.title').after(clone.find('.categories'));
		}
		else {
			clone.find('.categories').remove();
			clone.find('.status').remove();
		}
	}

	if (item.img) {
		clone.find('.img').attr('src',this.app_url + '?image=' + item.img);
	}
	else
		clone.find('.img').remove();

	clone.removeClass('dummy');
	$('#' + page + '-detail .ui-content').html('');
	$('#' + page + '-detail .ui-content').append(clone);
}

sa.prototype.displayShlijimDetail = function(){
    var params = this.params;
    var error_string = 'Por razones técnicas, no se puede mostrar este item.';
    
    if (!params.id) {
        this.displayErrors([error_string]);
        console.error('Error: Missing detail params.');
        return false;
    }
    
    // find the detail items in db
    var items = this.getItem('sa-shlijim');
    if (!items || items.length == 0) {
        this.displayErrors([error_string]);
        console.error('Error: No stored items for this content type.');
        return false;
    }
    
    var filtered = items.filter(function(item) {
                                return item.id == params.id;
                                });
    
    if (!filtered || filtered.length == 0) {
        this.displayErrors([error_string]);
        console.error('Error: No content items found.');
        return false;
    }
    
    // display according to content type
    var clone = $('#sa-shlijim-detail-dummy').clone();
    var item = filtered[0];
    var status = 'Sin aprobación';
    
    if (item.status == 'approved')
        status = 'Aprobado';
    else if (item.status == 'rejected')
        status = 'Rechazado';
    
    clone.find('.name span:last').html(item.name);
    clone.find('.status:first span:last').html(status);
    clone.find('.country span:last').html(item.country);
    clone.find('.motivo span:last').html(item.motivo);
    clone.find('.num_estudiantes span:last').html(item.num_estudiantes);
    
    if (item.content && item.content.length > 0)
        clone.find('.content').html(item.content);
    else {
        clone.find('.content').remove();
        clone.find('.comentarios').remove();
    }
    
    if (item.warn != 'Y' && item.status == 'approved') {
        clone.find('.overlay').hide();
    }
    else {
        clone.find('.overlay').show();
    }
    
    if (item.img) {
        clone.find('.img').attr('src',this.app_url + '?image=' + item.img);
    }
    else
        clone.find('.img-contain').remove();
    
    clone.attr('id','');
    clone.removeClass('dummy');
    $('#shlijim-detail .ui-content').html('');
    $('#shlijim-detail .ui-content').append(clone);
}

sa.prototype.displaySettings = function(init){
    if (this.cfg && this.cfg.sexos && Object.keys(this.cfg.sexos).length > 0) {
        $('#settings #sex').html('').append('<option value="">Por favor seleccionar</option>');
        for (i in this.cfg.sexos) {
            $('#settings #sex').append('<option value="' + i + '">' + this.cfg.sexos[i] + '</option>');
        }
    }
    
    $('#settings #first_name').val(this.cfg.user.first_name);
    $('#settings #last_name').val(this.cfg.user.last_name);
    $('#settings #email').val(this.cfg.user.email);
    $('#settings #age').val(this.cfg.user.age);
    $('#settings #sex').val(this.cfg.user.sex).selectmenu("refresh");
    $('#settings #tel').val(this.cfg.user.tel);
    $('#settings #blood_type').val(this.cfg.user.blood_type);
    
    if (this.cfg.user.has_children)
        $('#settings #has-children').prop('checked',true).checkboxradio('refresh');
    if (this.cfg.user.push_notifications)
        $('#settings #push-notifications').prop('checked',true).checkboxradio('refresh');
    
    if (this.cfg.user.fb_id && this.cfg.user.fb_id != 0)
        $('.sa-password-settings').hide();
    
    if (init) {
        $('.special-label').show();
        $('.default-label').hide();
        $('#sa-settings-submit').attr('data-target','feed');
    }
    else {
        $('.special-label').hide();
        $('.default-label').show();
        $('#sa-settings-submit').attr('data-target','');
    }
}

//==== SA APP UTILITIES ====
sa.prototype.addRequest = function (classname,method,params) {
    var methods = {};
    methods[method] = params;
    
    if (!this.requests[classname])
        this.requests[classname] = [];
    
    this.requests[classname].push(methods);
}

sa.prototype.sendRequests = function (callback) {
    var self = this;
    var params = {};
    params.commands = JSON.stringify(this.requests);
    if (this.session.id && this.session.key) {
        params.session_id = this.session.id;
        params.nonce = moment().utc().unix();
        params.signature = CryptoJS.HmacSHA256(CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(params.commands)),this.session.key).toString();
    }
    
    $.post(this.app_url,params,function(data) {
           $.mobile.loading('hide');
           $('.ui-page-active .sa-loading-mask').remove();
           
           if (!self.isJSON(data))
           callback({});
           else
           callback(JSON.parse(data));
           }).fail(function() {
                   $.mobile.loading('hide');
                   callback(undefined);
                   });
    
    this.requests = {};
}

sa.prototype.loadMore = function () {
    if (this.more_waiting || (moment().unix() - this.more_last_load) <= 5 || this.more_attempts >= 5)
        return false;
    
    var $elem = $('.sa-feed:visible');
    if ($elem.length == 0)
        return false;
    
    var id = $elem.attr('id');
    if (['news-feed','kids','events','content'].indexOf(id) < 0)
        return false;
    
    var $window = $(window);
    var docViewTop = $window.scrollTop();
    var docViewBottom = docViewTop + $window.height();
    
    var elemTop = $elem.offset().top;
    var elemBottom = elemTop + $elem.height();
    
    if (docViewBottom < elemBottom)
        return false;
    
    this.more_waiting = true;
    this.more_attempts++;
    
    if (id == 'news-feed')
        this.loadFeed(true);
    else if (id == 'events')
        this.loadEvents(true,null,null,true);
    else if (id == 'kids')
        this.loadEvents(true,null,true,true);
    else if (id == 'content')
        this.loadContent(true);
}

sa.prototype.setProp = function (prop,val) {
    if (prop && prop instanceof Array) {
        if (prop.length == 1)
            this[prop[0]] = val;
        if (prop.length == 2)
            this[prop[0]][prop[1]] = val;
        if (prop.length == 3)
            this[prop[0]][prop[1]][prop[2]] = val;
        if (prop.length == 4)
            this[prop[0]][prop[1]][prop[2]][prop[3]] = val;
        if (prop.length == 5)
            this[prop[0]][prop[1]][prop[2]][prop[3]][prop[4]] = val;
    }
    else {
        this[prop] = val;
    }
}

sa.prototype.condenseForm = function (form) {
    var form_values = {};
    if (form && form.length > 0) {
        for (i in form) {
            form_values[form[i].name] = form[i].value;
        }
    }
    return form_values;
}

sa.prototype.displayErrors = function (errors,error_fields,button) {
    $('#sa-form-errors .errors').html('');
    if (error_fields && button) {
        for (i in error_fields) {
            $(button).parents('form').find('#' + error_fields[i]).parents('.param').addClass('error');
        }
    }
    
    for (i in errors) {
        $('#sa-form-errors .errors').append('<li>' + errors[i] + '</li>');
    }
    
    $("#sa-form-errors .errors").listview("refresh");
    $('#sa-form-errors').popup('open');
}

sa.prototype.displayMessages = function (messages,button) {
    $('#sa-form-messages .messages').html('');
    if (messages && messages.length > 0) {
        for (i in messages) {
            $('#sa-form-messages .messages').append('<li>' + messages[i] + '</li>');
        }
    }
    
    $("#sa-form-messages .messages").listview("refresh");
    $('#sa-form-messages .submit-button').button('refresh');
    $('#sa-form-messages').popup('open');
}

sa.prototype.displayAnnouncements = function(items){
    if (items)
        $('#sa-form-announcements .next-id').val('');
    
    var i = (items) ? 0 : $('#sa-form-announcements .next-id').val();
    items = (items) ? items : window.popup_items;
    window.popup_items = items;
    var item = items[i];
    
    if (!items || !item)
        return false;
    
    $('#sa-form-announcements h3').html(item.title);
    $('#sa-form-announcements .content').html(item.content);
    $('#sa-form-announcements .next-id').val(i + 1);
    
    if (i == (items.length - 1)) {
        $('#sa-form-announcements').find('#close-ann').parent('.ui-btn').css('display','block');
        $('#sa-form-announcements').find('#next').parent('.ui-btn').css('display','none');
    }
    else {
        $('#sa-form-announcements').find('#close-ann').parent('.ui-btn').css('display','none');
        $('#sa-form-announcements').find('#next').parent('.ui-btn').css('display','block');
    }
    
    if (i == 0)
        $('#sa-form-announcements').popup('open');
}

sa.prototype.getItem = function (key) {
    var item = window.localStorage.getItem(key);
    if (!this.isJSON(item))
        return null;
    
    return JSON.parse(item);
}

sa.prototype.setItem = function (key,value) {
    try {
        window.localStorage.setItem(key,JSON.stringify(value));
        return true;
    }
    catch (e) {
        return false;
    }
}

sa.prototype.removeItem = function (key) {
    try {
        window.localStorage.removeItem(key);
        return true;
    }
    catch (e) {
        return false;
    }
}

sa.prototype.isJSON = function (str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

sa.prototype.updateHdate = function () {
    this.hebdate = new Hebcal.HDate();
    if (this.position)
        this.hebdate.setLocation(this.position.coords.latitude,this.position.coords.longitude);
    else
        this.hebdate.setLocation(8.97,-79.51);
}

sa.prototype.getEventTimestamp = function(event) {
    if (event.recurrence == 'specific_heb') {
        var y = this.hebdate.getFullYear();
        var m = this.hebdate.getMonthName();
        if (event.month_he == 'tishrei')
            y++;
        
        return moment(new Hebcal.HDate(event.day_he,event.month_he,y).greg()).unix();
    }
    else if (event.recurrence == 'recurrent') {
        var t = event.time.split(' ');
        var t1 = t[1].split(':');
        return moment().hour(t1[0]).minute(t1[1]).unix();
    }
    else
        return moment(event.date).unix();
}

sa.prototype.startTicker = function() {
	var self = this;
	var scroll = $('#sa-tefilot-scroll .scroll');

	window.ticker = setInterval(function(){
		var scroll_elems = scroll.find('.sa-tefila');
		var window_w = parseFloat($('#sa-tefilot-scroll').width());
		var new_l = 0;
		var cur_l = scroll.position().left;
		
		if (scroll.width() < window_w || scroll_elems.length == 0)
			return false;

		$(scroll_elems).each(function(i){
			var l = $(this).position().left;
			var r = $(this).width() + l;
			
			if ((r - window_w + cur_l) > ($(this).width() * .1)) {
				new_l = l - 5;
				return false;
			}
		});
		
		scroll.fadeOut(200,function(){
			scroll.css('left',(-1 * new_l) + 'px').fadeIn(200);
		});
	},5000);
}

sa.prototype.stopTicker = function() {
	clearInterval(window.ticker);
}

sa.prototype.displayHeader = function(mode,title,params) {
    var title_clone = $('#sa-schedule-title-dummy').clone();
    title_clone.attr('id','');
    title_clone.find('.title span').html(title);
    title_clone.removeClass('dummy');
    
    if (mode == 'calendar') {
        var hebdate = new Hebcal.HDate(new Date(params.timestamp * 1000));
        if (this.position)
            hebdate.setLocation(this.position.coords.latitude,this.position.coords.longitude);
        else
            hebdate.setLocation(8.97,-79.51);
        
        title_clone.find('.greg').html(moment(params.timestamp * 1000).locale('es').format('ddd, MMM D'));
        title_clone.find('.religious').html(hebdate.toString());
        title_clone.find('.arrow-left').attr('href','#' + params.page).attr('data-params',encodeURIComponent(JSON.stringify({timestamp:moment(params.timestamp * 1000).subtract(1,'day').unix()})));
        title_clone.find('.arrow-right').attr('href','#' + params.page).attr('data-params',encodeURIComponent(JSON.stringify({timestamp:moment(params.timestamp * 1000).add(1,'day').unix()})));
        title_clone.find('.filters').remove();
    }
    else {
        title_clone.find('.sa-calendar-nav').remove();
    }
    
    if (mode == 'events') {
        title_clone.find('.filter-search').remove();
        
        var cats = this.getItem('sa-events-cats');
        var select = title_clone.find('#filter-category').html('').append('<option value="all">Todas</option');
        var params = this.params;
        
        if (cats) {
            for (i in cats) {
                select.append('<option value="' + cats[i]['key'] + '">' + cats[i]['name'] + '</option');
                /*
                 if (cats[i]['children']) {
                 for (j in cats[i]['children']) {
                 select.append('<option value="' + cats[i]['children'][j]['key'] + '">|--' + cats[i]['children'][j]['name'] + '</option');
                 }
                 }
                 */
            }
            
            if (params && params.category)
                select.val(params.category);
        }
    }
    
    if (mode == 'content') {
        title_clone.find('.filter-search').remove();
        
        var cats = this.getItem('sa-content-cats');
        var select = title_clone.find('#filter-category').html('').append('<option value="all">Todas</option');
        var params = this.params;
        
        if (cats) {
            for (i in cats) {
                select.append('<option value="' + cats[i]['id'] + '">' + cats[i]['name'] + '</option');
                if (cats[i]['children']) {
                    for (j in cats[i]['children']) {
                        select.append('<option value="' + cats[i]['children'][j]['id'] + '">|--' + cats[i]['children'][j]['name'] + '</option');
                    }
                }
            }
            
            if (params && params.category)
                select.val(params.category);
        }
    }
    
    if (mode == 'community' || mode == 'restaurants') {
        title_clone.find('.filters').remove();
    }
    
    if (mode == 'shlijim' || mode == 'products' || mode == 'links') {
        title_clone.find('.filter-category').remove();
    }
    
    return title_clone;
}

sa.prototype.activateHeader = function(elem,page) {
    var self = this;
    if (['content','events'].indexOf(page) >= 0) {
        $(elem).find('#filter-category').bind("keyup change", function(){
                                              $('.ui-page-active').append($('#sa-loading-mask').clone().removeClass('dummy').css('display','block').attr('id',''));
                                              
                                              var params = self.params;
                                              params = (!params) ? {} : params;
                                              params.category = $(this).val();
                                              self.setProp('params',params);
                                              
                                              if (page == 'content')
                                              self.loadContent(null,$(this).val());
                                              else if (page == 'events')
                                              self.loadEvents(true,$(this).val());
                                              });
    }
    else if (['shlijim','products','links'].indexOf(page) >= 0) {
        $(elem).find('#filter-search').bind("keyup", function(){
                                            var search_text = $(this).val().toLowerCase();
                                            $('.ui-page-active .sa-search-text').each(function(){
                                                                                      if ($(this).text().toLowerCase().indexOf(search_text) < 0)
                                                                                      $(this).parents('li').hide();
                                                                                      else
                                                                                      $(this).parents('li').show();
                                                                                      });
                                            });
    }
}

sa.prototype.resizePanels = function() {
    $('body').width($(window).width() * (10/12));
    $('html').width($(window).width() * (10/12));
    $('.ui-page-active:not(.outside)').width($(window).width() * (10/12));
    $('.outside').width($(window).width() * (10/12));
    
    $(document).on('scroll',function(){
        if ($(document).scrollLeft() !== 0) {
                   $(document).scrollLeft(0);
        }
    });
}

sa.prototype.addToCalendar = function(name,location,start,end) {
    window.plugins.calendar.createEventInteractively(name,location,'',moment.unix(start/1000).toDate(),moment.unix(end/1000).toDate(),function(result){
		//alert(JSON.stringify(result))
	},function(result) {
		//alert(JSON.stringify(result))
	});
}

sa.prototype.externalLinks = function() {
    $(document).on('click','.ui-page-active a',function(){
                   if ($(this).attr('href').indexOf("#") < 0) {
                   e.preventDefault();
                   window.open($(this).attr('href'), '_system');
                   return false;
                   }
                   });
}

sa.prototype.smartTruncate = function(s,l) {
    if (!s || !l || typeof s != 'string')
        return s;
    
    var sub_s = s.replace(/ /g,'');
    var c_spaces = s.split(' ').length - 1;
    sub_s = sub_s.substring(0,l);
    /*
     for (i = 0; i <= sub_s.length; i++) {
     if (s[i]==" ")
     sub_s = sub_s.slice(0,i) + s[i] + sub_s.slice(i);
     }
     */
    return sub_s + '.';
    
}

sa.prototype.headerDate = function() {
	if (!this.hebdate)
		return '';
	
	var holidays = this.hebdate.holidays();
	if (holidays[0] && holidays[0].desc)
		return holidays[0].desc[0].replace('Ch','J').replace('ch','j');
	
	var omer = '';
	if (this.hebdate.omer() > 0)
		omer = ' (Omer ' + this.hebdate.omer() + ')';
	
	return this.hebdate.toString().replace('Ch','J').replace('ch','j') + omer;
}
