//==== PHONEGAP FUNCTIONALITY ====
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
    	window.sa = new sa();
    }
};

// ==== SA APP INSTANCE ====
function sa(){
	this.app_url = 'http://66.172.10.252/shevet_ahim/backend/htdocs/api.php';
	
	// user
	this.session = {};
	this.session.signed_up = null;
	this.session.id = null;
	this.session.key = null;
	this.session.status = null;
	this.session.age = null;
	this.session.sex = null;
	this.session.has_children = null;
	
	// app properties
	this.hebdate = null;
	this.position = null;
	this.requests = {};
	this.params = {};
	
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
	    	// get current position
			navigator.geolocation.getCurrentPosition(function(position){
				self.setProp('position',position);
			});
			
			// initialize hebdate object and set position (default Panama City)
			self.setProp('hebdate',new Hebcal.HDate());
			if (self.position)
				self.hebdate.setLocation(self.position.coords.latitude,self.position.coords.longitude);
			else
				self.hebdate.setLocation(8.97,-79.51);
	
			// try to get phone number and email
			/*
			var deviceInfo = cordova.require("cordova/plugin/DeviceInformation");
			deviceInfo.get(function(result) {
		        console.log(result);
		    });
		    */
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
			$('#sa-hebdate-date').html(self.hebdate.toString());
			$(document).on('click','#sa-signup',function(e) {
				self.signup(this);
				e.preventDefault();
			});
			$(document).on('click','#sa-login',function(e) {
				self.login(this);
				e.preventDefault();
			});
			$(document).on('click','.sa-close-popup',function(e){
				$(this).parents('.popup-full').find('.sa-items').html('');
			});
			$('#sa-top-nav').toolbar();
			$('#sa-form-errors').popup();
			$("#sa-form-errors .errors").listview();
			$("#sa-menu").panel();
			/*
			$("#sa-menu").panel().on("panelbeforeopen",function(e,ui) {
				$('.blur-copy > .contain').html($('.ui-page-active').html()).width($('.ui-page-active').width()).scrollTop($('.ui-page-active').scrollTop()).foggy({
					blurRadius: 2,
					cssFilterSupport: true,
					opacity: 1,
				}).children('.ui-header,.ui-content').width($('.ui-page-active').width());
				$('.blur-copy .ui-content').css('margin-top',(parseFloat($('.blur-copy .ui-content').position().top) + parseFloat($('.ui-page-active').css('padding-top')) + 'px'));
				$('.blur-copy .ui-header').css('top','0');
			}).on("panelopen",function(e,ui) {
				$('.blur-copy').fadeIn(200);
				
			}).on("panelbeforeclose",function(e,ui) {
				$('.blur-copy').hide(0);
			});
			*/
			
			// page load events
			$(document).on("pagecontainerbeforeshow",function(event,ui) {
				self.setProp('preloaded',true);
				
				var page = ui.toPage.prop("id");
				if (page == 'news-feed') {
					self.loadTefilot();
					self.loadFeed();
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
				else if (page == 'logout')
					self.logout();
				
				
			});
			
			// tabs load events
			$(document).on('click','#karshrut-restaurants-tab',function(){
				self.loadDirectory('restaurants');
			});
			$(document).on('click','#karshrut-products-tab',function(){
				self.loadProducts();
			});
			
			// timers
			setInterval(function() {
				self.updateHdate();
				self.loadTefilot();
			},300000);
			
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
			
			// initialize appropriate state
			if (this.session.id && this.session.key && this.session.status == 'approved') {
				$("body").pagecontainer("change","#news-feed");
				if (!this.preloaded) {
					this.loadTefilot();
					this.loadFeed();
				}
			}
			if (this.session.id && this.session.key && this.session.status == 'pending')
				$("body").pagecontainer("change","#signup-waiting");
			if (this.session.id && this.session.key && this.session.status == 'rejected')
				$("body").pagecontainer("change","#signup-rejected");
			
			if (this.session.has_children == 'Y')
				$('#sa-menu-kids').css('display','');
			else
				$('#sa-menu-kids').css('display','none');
			
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
		if (typeof result.User.signup.results[0] != 'undefined') {
			if (typeof result.User.signup.results[0].errors != 'undefined') {
				var errors = result.User.signup.results[0].errors;
				var error_fields = result.User.signup.results[0].error_fields;
				self.displayErrors(errors,error_fields,button);
			}
			else if (result.User.signup.results[0]) {
				if (result.User.signup.results[0] == 'pending')
					$("body").pagecontainer("change","#signup-waiting");
				if (result.User.signup.results[0] == 'approved')
					self.login(null,info);
				
				self.setItem('sa-signed-up',true);
			}
		}
		else
			self.displayErrors(['Problema de conexión!']);
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
		if (typeof result.User.login.results[0] != 'undefined') {
			if (typeof result.User.login.results[0].errors != 'undefined') {
				var errors = result.User.login.results[0].errors;
				var error_fields = result.User.login.results[0].error_fields;
				self.displayErrors(errors,error_fields,button);
			}
			else if (result.User.login.results[0]) {
				self.setProp(['session','id'],result.User.login.results[0].session_id);
				self.setProp(['session','key'],result.User.login.results[0].session_key);
				self.setProp(['session','status'],result.User.login.results[0].status);
				self.setProp(['session','age'],result.User.login.results[0].age);
				self.setProp(['session','sex'],result.User.login.results[0].sex);
				self.setProp(['session','has_children'],result.User.login.results[0].has_children);
				
				self.setItem('sa-signed-up',true);
				self.setItem('sa-session-id',result.User.login.results[0].session_id);
				self.setItem('sa-session-key',result.User.login.results[0].session_key);
				self.setItem('sa-session-status',result.User.login.results[0].status);
				self.setItem('sa-session-age',result.User.login.results[0].age);
				self.setItem('sa-session-sex',result.User.login.results[0].sex);
				self.setItem('sa-session-has-children',result.User.login.results[0].has_children);
				
				if (self.session.status == 'approved')
					$("body").pagecontainer("change","#news-feed");
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
			self.displayErrors(['Problema de conexión!']);
	});
}

sa.prototype.logout = function(){
	this.addRequest('User','logOut',[this.session.id]);
	this.sendRequests(function(result){});
	// remove session properties
	this.removeItem('sa-session-id');
	this.removeItem('sa-session-key');
	this.removeItem('sa-session-status');
	this.removeItem('sa-session-age');
	this.removeItem('sa-session-sex');
	this.removeItem('sa-session-has-children');
	
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
			this.removeItem('sa-events-' + event_cats[i]);
		}
	}
}

sa.prototype.loadTefilot = function(return_data){
	var self = this;
	var cached_tefilot = this.getItem('sa-tefilot');
	var cached_tefilot_cats = this.getItem('sa-tefilot-cats');
	var cached_tefilot_places = this.getItem('sa-tefilot-places');
	var tefilot = {};
	var tefilot_cats = {};
	var tefilot_places = {};

	this.addRequest('Events','get',[false,'rezos']);
	this.sendRequests(function(result){
		if (typeof result.Events.get.results[0] != 'undefined' && result.Events.get.results[0]) {
			var results = result.Events.get.results[0];
			for (i in results) {
				if (!tefilot[results[i].key])
					tefilot[results[i].key] = {};
				if (!tefilot[results[i].key][results[i].place_abbr])
					tefilot[results[i].key][results[i].place_abbr] = [];
				
				var t = results[i].time.split(' ');
				var t1 = t[1].split(':');
				var time = moment().hour(t1[0]).minute(t1[1]).format('h:mm');
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

sa.prototype.loadFeed = function(){
	var self = this;
	var feed = this.getItem('sa-feed');
	var events = this.getItem('sa-events');
	var content = this.getItem('sa-content');
	var new_items = [];
	var popups = [];
	
	this.addRequest('Events','get',[true,null,null,null,this.session.age,this.session.sex]);
	this.addRequest('Content','get',[null,null,this.session.age,this.session.sex]);
	this.sendRequests(function(result){
		// receive and parse events
		if (typeof result.Events.get.results[0] != 'undefined' && result.Events.get.results[0]) {
			var results = result.Events.get.results[0];
			for (i in results) {
				results[i].timestamp = self.getEventTimestamp(results[i]);
				new_items.push(results[i]);
			}
		}
		
		// receive and parse content items
		if (typeof result.Content.get.results[0] != 'undefined' && result.Content.get.results[0]) {
			var results = result.Content.get.results[0];
			for (i in results) {
				results[i].timestamp = self.getEventTimestamp(results[i]);
				if (results[i].in_popup != 'Y')
					new_items.push(results[i]);
				else
					popups.push(results[i]);
			}
		}
		
		feed = (!feed) ? [] : feed;
		events = (!events) ? [] : events;
		content = (!content) ? [] : content;
		
		if (new_items.length > 0) {
			// sorting oldest first
			new_items.sort(function(a,b) {
				return b.timestamp - a.timestamp;
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
					
					content.push(new_items[i]);
					if (content.length > 50)
						content.shift();
				}
			}
		}
		
		self.displayFeed('news-feed',feed);
		self.displayAnnouncements(popups);
		
		self.setItem('sa-feed',feed);
		self.setItem('sa-events',events);
		self.setItem('sa-content',content);
	});
}

sa.prototype.loadEvents = function(in_feed,category,for_kids,older){
	var new_items = [];
	var popups = [];
	var key = category;
	var sex = this.session.sex;
	var age = this.session.age;
	var page = 'events';
	var category = (typeof category == 'undefined') ? null : category;
	
	if (for_kids) {
		key = 'kids';
		sex = null;
		age = 1;
		page = 'kids';
	}
	
	var self = this;
	var cats = this.getItem('sa-events-cats');
	var events = this.getItem('sa-events' + (key ? '-' + key : ''));
	
	if ((!events || events.length == 0) && key != 'kids')
		events = this.getItem('sa-events');
	
	this.addRequest('Events','get',[in_feed,category,null,null,age,sex]);
	this.sendRequests(function(result){
		// receive and parse events
		if (typeof result.Events.get.results[0] != 'undefined' && result.Events.get.results[0]) {
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

		self.displayFeed(page,events,null,['event']);
		self.setItem('sa-events' + (key ? '-' + key : ''),events);
		
		cats = (!cats) ? [] : cats;
		if (key && cats.indexOf(key) < 0) {
			cats.push(key);
			self.setItem('sa-events-cats',cats);
		}
	});
}

sa.prototype.loadShiurim = function(){
	var self = this;
	var events = this.getItem('sa-shiurim');
	var new_items = [];
	var popups = [];
	
	this.addRequest('Events','get',[null,'shiurim',null,null,this.session.age,this.session.sex]);
	this.sendRequests(function(result){
		// receive and parse events
		if (typeof result.Events.get.results[0] != 'undefined' && result.Events.get.results[0]) {
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
		self.setItem('sa-shiurim',events);
	});
}

sa.prototype.loadZmanim = function(){
	var self = this;
	var events = this.getItem('sa-zmanim');
	var new_items = [];
	
	this.addRequest('Events','get',[null,['rezos','limud','levaya'],null,null,this.session.age,this.session.sex]);
	this.sendRequests(function(result){
		// get zmanim
		var hdate = new Hebcal.HDate().setLocation(self.position.coords.latitude,self.position.coords.longitude);
		var zmanim = hdate.getZemanim();
		var sedra = hdate.getSedra();
		var holidays = hdate.holidays();
		var candles = hdate.candleLighting();
		var havdalah = hdate.next().havdalah();
		
		if (zmanim && Object.keys(zmanim).length > 0) {
			var lookup = {neitz_hachama: 'Netz',sof_zman_shma: 'Final tiempo de Shema',sof_zman_tfilla:'Final tiempo de Tefilá',mincha_gedola:'Minjá Guedolá',mincha_ketana:'Minjá Ketaná',shkiah:'Shekiá',tzeit:'Salida de las estrellas'};
			for (i in zmanim) {
				if (typeof lookup[i] == 'undefined')
					continue;
				
				new_items.push({type: 'zman', title: lookup[i], id: i,timestamp: moment(zmanim[i]).unix()});
			}
		}
		
		if (candles)
			new_items.push({type: 'zman', title: 'Encendido de las velas', id: 'candles', timestamp: moment(candles).unix()});
		if (havdalah)
			new_items.push({type: 'zman', title: 'Havdalah', id: 'havdalah' ,timestamp: moment(havdalah).unix()});
		
		// receive and parse events
		if (typeof result.Events.get.results[0] != 'undefined' && result.Events.get.results[0]) {
			var tefilot_cats = self.getItem('sa-tefilot-cats');
			var tefilot_places = self.getItem('sa-tefilot-places');
			
			var results = result.Events.get.results[0];
			var tefilot = {};
			for (i in results) {
				// sort tefilot seperately
				if (typeof tefilot_cats[results[i].key] != 'undefined') {
					if (!tefilot[results[i].key])
						tefilot[results[i].key] = {};
					if (!tefilot[results[i].key][results[i].place_abbr])
						tefilot[results[i].key][results[i].place_abbr] = {times:[],name:null};
					
					var t = results[i].time.split(' ');
					var t1 = t[1].split(':');
					tefilot[results[i].key][results[i].place_abbr].times.push(moment().hour(t1[0]).minute(t1[1]).format('h:mm A'));
					tefilot[results[i].key][results[i].place_abbr].name = tefilot_places[results[i].place_abbr];
				}
				else {
					// sort other events
					results[i].timestamp = self.getEventTimestamp(results[i]);
					new_items.push(results[i]);
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
				else
					item.timestamp = moment(zmanim.shkiah).add(1,'seconds').unix();
				
				for (abbr in tefilot[key]) {
					item.places[tefilot_places[abbr]] = tefilot[key][abbr];
				}
				new_items.push(item);
			}
		}
		
		events = (!events) ? [] : events;
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
		
		self.displaySchedule('zmanim',events);
		self.setItem('sa-zmanim',events);
	});
}

sa.prototype.loadContent = function(){
	var self = this;
	var content = this.getItem('sa-content');
	var new_items = [];
	var popups = [];
	
	this.addRequest('Content','get',[null,null,this.session.age,this.session.sex]);
	this.sendRequests(function(result){
		// receive and parse content
		if (typeof result.Content.get.results[0] != 'undefined' && result.Content.get.results[0]) {
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

		self.displayFeed('content',content,null,['content']);
		self.setItem('sa-content',content);
	});
}

sa.prototype.loadDirectory = function(category){
	var self = this;
	var directory = this.getItem('sa-directory-' + category);
	
	this.addRequest('Dir','get',[category]);
	this.sendRequests(function(result){
		if (typeof result.Dir.get.results[0] != 'undefined' && result.Dir.get.results[0]) {
			var results = result.Dir.get.results[0];
			directory = [];
			
			for (i in results) {
				directory.push(results[i]);
			}
			
			self.displayDirectory(directory,category);
			self.setItem('sa-directory-' + category,directory);
		}
	});
}

sa.prototype.loadProducts = function(){
	var self = this;
	var products = this.getItem('sa-products');
	
	this.addRequest('Products','get',[]);
	this.sendRequests(function(result){
		if (typeof result.Products.get.results[0] != 'undefined' && result.Products.get.results[0]) {
			var results = result.Products.get.results[0];
			products = [];
			
			for (i in results) {
				products.push(results[i]);
			}
			
			self.displayProducts('#kashrut-products',products);
			self.setItem('sa-products',products);
		}
	});
}

sa.prototype.loadShlijim = function(){
	var self = this;
	var shlijim = this.getItem('sa-shlijim');
	
	this.addRequest('Shlijim','get',[]);
	this.sendRequests(function(result){
		if (typeof result.Shlijim.get.results[0] != 'undefined' && result.Shlijim.get.results[0]) {
			var results = result.Shlijim.get.results[0];
			shlijim = [];
			
			for (i in results) {
				shlijim.push(results[i]);
			}
			
			self.displayShlijim('#shlijim',shlijim);
			self.setItem('sa-shlijim',shlijim);
		}
	});
}

//==== SA APP DISPLAY FUNCTIONS ====
sa.prototype.displayFeed = function(page,feed,older,types,categories,topics){
	if (!feed || feed.length == 0)
		return false;
	
	categories = (!categories) ? [] : categories;
	types = (!types) ? [] : types;
	topics = (!topics) ? [] : topics;

	var dummy = $('#sa-feed-dummy');
	for (i in feed) {
		if ($('#'+page).find('#feed-' + feed[i].type + '-' + feed[i].id).length > 0 || (types.length > 0 && types.indexOf(feed[i].type) < 0))
			continue;
		
		var url = null;
		var clone = dummy.clone();
		clone.addClass('sa-' + feed[i].type);
		
		if (feed[i].type == 'event') {
			url = 'events';
			clone.find('.time .t span:last').html(moment.unix(feed[i].timestamp).format('dddd h:mm A'));
			clone.find('.time .p span:last').html(feed[i].place);
			clone.find('.author').remove();
		}
		
		if (feed[i].type == 'content') {
			url = 'content';
			clone.find('.time').remove();
			
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
		}
		
		if (feed[i].img)
			clone.find('.img').attr('src',this.app_url + '?image=' + feed[i].img);
		else
			clone.find('.img').remove();
		
		clone.find('.ago').html('...' + moment(feed[i].timestamp * 1000).locale('es').fromNow());
		clone.find('.title a').html(feed[i].title).attr('href','#' + url + '-detail').attr('data-params',encodeURIComponent(JSON.stringify({id:feed[i].id, type:feed[i].type})));
		clone.find('.more').attr('href','#' + url + '-detail').attr('data-params',encodeURIComponent(JSON.stringify({id:feed[i].id, type:feed[i].type})));
		clone.find('.abstract').html((feed[i]['abstract'] ? feed[i]['abstract'] : feed[i].content));
		clone.attr('id','feed-'+feed[i].type + '-' + feed[i].id);
		clone.removeClass('dummy');
		
		if (older)
			$('#' + page + ' .ui-content').append(clone);
		else
			$('#' + page + ' .ui-content').prepend(clone);
	}
}

sa.prototype.displaySchedule = function(page,events){
	if (!events || events.length == 0)
		return false;
	
	$('#' + page + ' .ui-content').html('');
	var dummy = $('#sa-schedule-dummy');
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
		
		$('#' + page + ' .ui-content').prepend(clone);
	}
}

sa.prototype.displayProducts = function(container,products){
	if (!products || products.length == 0)
		return false;
	
	$(container + ' .sa-listview').find('li').remove();
	for (i in products) {
		var clone = $('#sa-product-dummy').clone();
		clone.find('h2').html(products[i].name);
		clone.find('.updated span:last').html(moment(products[i].updated).locale('es').fromNow());
		
		if (products[i].supervision)
			clone.find('.supervision span:last').html(products[i].supervision);
		else
			clone.find('.supervision').remove();
		
		if (products[i].warn != 'Y') {
			clone.find('.ti-alert').remove();
			clone.find('.status span:last').html('Kosher');
		}
		else {
			clone.addClass('sa-warn');
			clone.find('.status span:last').html('No Kosher');
		}
		
		clone.attr('id','product-' + products[i].id);
		clone.removeClass('dummy');
		$(container + ' .ui-listview-outer').append(clone);
		clone.collapsible({refresh:true});
	}
}

sa.prototype.displayShlijim = function(container,shlijim){
	if (!shlijim || shlijim.length == 0)
		return false;
	
	$(container + ' .sa-listview').find('li').remove();
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
}

sa.prototype.displayAnnouncements = function(popups){
	
}

sa.prototype.displayTefilot = function(tefilot,cats) {
	if (!tefilot || Object.keys(tefilot) == 0)
		return false;
	
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
	if (Object.keys(current) == 0)
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
		clone.find('.p').html(i);
		clone.find('.t').html(current[i].join('/'));
		clone.attr('id','');
		clone.removeClass('dummy');
		dummy.parent().append(clone);
	}
}

sa.prototype.displayDirectory = function(directory,category){
	if (!directory || directory.length == 0)
		return false;
	
	var url = '';
	var url1 = '';
	
	if (category == 'restaurants') {
		url = '#karshrut-restaurants';
		url1 = '#kashrut-detail';
	}
	else if (category == 'community') {
		url = '#directory .ui-content';
		url1 = '#directory-detail';
	}
	
	$(url).html('');
	for (i in directory) {
		var clone = $('#sa-directory-dummy').clone();
		var restaurant_categories = (typeof directory[i].restaurant_categories == 'string') ? directory[i].restaurant_categories.split(',') : [];
		var times = (typeof directory[i].times == 'string') ? directory[i].times.split(',') : [];
		var times1 = [];
		
		clone.find('.title a').attr('href',url1).html(directory[i].name).attr('data-params',encodeURIComponent(JSON.stringify({id:directory[i].id, category: directory[i].key, type: directory[i].type})));
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
		
		if (category == 'restaurants') {
			if (directory[i].warn != 'Y')
				clone.find('.ti-alert').remove();
			else
				clone.addClass('sa-warn');
			
			if (restaurant_categories.length > 0) {
				for (j in restaurant_categories) {
					var topic = restaurant_categories[j].split('|');
					var helper = $('#sa-token-helper').clone();
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
}

sa.prototype.displayDetail = function(){
	var params = this.params;
	var error_string = 'Por razones técnicas, no se puede mostrar este item.';
	var query = params.type;
	var page = params.type;
	
	// set query and page strings
	if (params.type == 'event') {
		query = 'events';
		page = 'events';
	}
	else if (params.type == 'directory'){
		query = 'directory-' + params.category;
		page = (params.category == 'restaurants') ? 'kashrut' : page;
	}
	else if (params.type == 'shiurim'){
		page = 'events';
	}

	if (!params.id || !params.type) {
		this.displayErrors([error_string]);
		console.error('Error: Missing detail params.');
		return false;
	}
	
	// find the detail items in db
	var items = this.getItem('sa-' + query);
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
	var clone = $('#sa-detail-dummy').clone();
	var item = filtered[0];
	if (item.type == 'event') {
		clone.find('.ago').html('...' + moment(item.timestamp * 1000).locale('es').fromNow());
		clone.find('.title').html(item.title);
		clone.attr('id','');
		
		if (item.content && item.content.length > 0)
			clone.find('.content').html(item.content);
		else
			clone.find('.content').remove();
		
		clone.find('.time .t span:last').html(moment.unix(item.timestamp).format('dddd h:mm A'));
		clone.find('.time .p span:last').html(item.place);
		clone.find('.author').remove();
		clone.find('.ago').remove();
		clone.find('.times').remove();
		clone.find('.status').remove();
		
		var helper = $('#sa-token-helper').clone();
		helper.html(item.category).attr('href','#events').attr('data-params',encodeURIComponent(JSON.stringify({category:item.key})));
		clone.find('.categories span:last').append(helper);
	}
	else if (item.type == 'content') {
		clone.find('.ago').html('...' + moment(item.timestamp * 1000).locale('es').fromNow());
		clone.find('.title').html(item.title);
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
				helper.html(topic[1]).attr('href','#content').attr('data-params',encodeURIComponent(JSON.stringify({topics:[topic[0]]})));
				clone.find('.categories span:last').append(helper);
			}
		}
		else
			clone.find('.categories').remove();
	}
	else if (item.type == 'directory') {
		clone.find('.title').html(item.name);
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
			clone.find('.times .t').html(times1.join(', '));
		}
		else
			clone.find('.times .t').html('No disponible.');
		
		if (item.key == 'restaurants') {
			if (item.warn != 'Y') {
				clone.find('.ti-alert').remove();
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
	clone.find('.status span:last').html(status);
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
		clone.find('.sa-icon').addClass('ti-check-box');
	}
	else {
		clone.addClass('sa-warn');
		clone.find('.sa-icon').addClass('ti-na');
	}
	
	clone.attr('id','');
	clone.removeClass('dummy');
	$('#shlijim-detail .ui-content').html('');
	$('#shlijim-detail .ui-content').append(clone);
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
		if (!self.isJSON(data))
			callback({});
		else
			callback(JSON.parse(data));
	});
	
	this.requests = {};
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
		var y = self.hebdate.getFullYear();
		var m = self.hebdate.getMonthName();
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
