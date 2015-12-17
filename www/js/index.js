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
	this.app_url = 'http://localhost/shevet_ahim/backend/htdocs/api.php';
	
	// user
	this.session = {};
	this.session.signed_up = null;
	this.session.id = null;
	this.session.key = null;
	this.session.status = null;
	this.session.age = null;
	this.session.sex = null;
	
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
				var data_string = decodeURIComponent($(this).attr('data-params'));
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
					self.loadEvents();
				else if (page == 'events-detail')
					self.displayDetail();
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
				
				self.setItem('sa-signed-up',true);
				self.setItem('sa-session-id',result.User.login.results[0].session_id);
				self.setItem('sa-session-key',result.User.login.results[0].session_key);
				self.setItem('sa-session-status',result.User.login.results[0].status);
				self.setItem('sa-session-age',result.User.login.results[0].age);
				self.setItem('sa-session-sex',result.User.login.results[0].sex);
				
				if (self.session.status == 'approved')
					$("body").pagecontainer("change","#news-feed");
				else if (self.session.status == 'pending')
					$("body").pagecontainer("change","#signup-waiting");
				else if (self.session.status == 'rejected')
					$("body").pagecontainer("change","#signup-rejected");
			}
		}
		else
			self.displayErrors(['Problema de conexión!']);
	});
}

sa.prototype.logout = function(){
	this.addRequest('User','logOut',[this.session.id]);
	this.sendRequests(function(result){});
	this.removeItem('sa-session-id');
	this.removeItem('sa-session-key');
	this.removeItem('sa-session-status');
	this.removeItem('sa-session-age');
	this.removeItem('sa-session-sex');
}

sa.prototype.loadTefilot = function(){
	var self = this;
	var cached_tefilot = this.getItem('sa-tefilot');
	var cached_tefilot_cats = this.getItem('sa-tefilot-cats');
	var tefilot = {};
	var tefilot_cats = {};

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
			}
			
			if (Object.keys(tefilot) == 0)
				tefilot = cached_tefilot;
			
			self.displayTefilot(tefilot,tefilot_cats);
			self.setItem('sa-tefilot',tefilot);
			self.setItem('sa-tefilot-cats',tefilot_cats);
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
				if (results[i].recurrence == 'specific_heb') {
					var y = self.hebdate.getFullYear();
					var m = self.hebdate.getMonthName();
					if (results[i].month_he == 'tishrei')
						y++;
					
					results[i].timestamp = moment(new Hebcal.HDate(results[i].day_he,results[i].month_he,y).greg()).unix();
				}
				else
					results[i].timestamp = moment(results[i].date).unix();
				
				results[i].type = 'event';
				new_items.push(results[i]);
			}
		}
		
		// receive and parse content items
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

sa.prototype.loadEvents = function(){
	var self = this;
	var events = this.getItem('sa-events');
	var new_items = [];
	var popups = [];
	
	this.addRequest('Events','get',[true,null,null,null,this.session.age,this.session.sex]);
	this.sendRequests(function(result){
		// receive and parse events
		if (typeof result.Events.get.results[0] != 'undefined' && result.Events.get.results[0]) {
			var results = result.Events.get.results[0];
			for (i in results) {
				if (results[i].recurrence == 'specific_heb') {
					var y = self.hebdate.getFullYear();
					var m = self.hebdate.getMonthName();
					if (results[i].month_he == 'tishrei')
						y++;
					
					results[i].timestamp = moment(new Hebcal.HDate(results[i].day_he,results[i].month_he,y).greg()).unix();
				}
				else
					results[i].timestamp = moment(results[i].date).unix();
				
				results[i].type = 'event';
				new_items.push(results[i]);
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

		self.displayFeed('events',events,null,['event']);
		self.setItem('sa-events',events);
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
		
		var clone = dummy.clone();
		var url = null;
		clone.addClass('sa-' + feed[i].type);
		
		if (feed[i].type == 'event') {
			url = 'events';
			clone.find('.time .t').html(moment.unix(feed[i].timestamp).format());
			clone.find('.time .p').html(feed[i].place);
			clone.find('.author').remove();
		}
		
		if (feed[i].type == 'content') {
			url = 'content';
			clone.find('.author .n').html(feed[i].author_name).attr('href','mailto:' + feed[i].author_email);
			clone.find('.time').remove();
		}
		
		clone.find('.ago').html(moment(feed[i].timestamp * 1000).locale('es').fromNow());
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

sa.prototype.displayDetail = function(type){
	var params = this.params;
	var error_string = 'Por razones técnicas, no se puede mostrar este item.';
	var query = (params.type == 'event') ? 'events' : params.type;
	
	if (!params.id || !params.type) {
		this.displayErrors([error_string]);
		return false;
	}
	
	var items = this.getItem('sa-' + query);
	if (!items || items.length == 0) {
		this.displayErrors([error_string]);
		return false;
	}
	
	var filtered = items.filter(function(item) {
		return item.id == params.id;
	});
	
	if (!filtered || filtered.length == 0) {
		this.displayErrors([error_string]);
		return false;
	}
	
	var item = filtered[0];
	var clone = $('#sa-detail-dummy').clone();
	var topics = (typeof item.topics == 'string') ? item.topics.split(',') : []; 
	
	clone.find('.ago').html(moment(item.timestamp * 1000).locale('es').fromNow());
	clone.find('.title').html(item.title).attr('href','#' + query + '-detail');
	clone.attr('id','');
	clone.removeClass('dummy');
	
	if (item.content && item.content.length > 0)
		clone.find('.content').html(item.content);
	else
		clone.find('.content').remove();

	if (item.type == 'event') {
		clone.find('.time .t').html(moment.unix(item.timestamp).format());
		clone.find('.time .p').html(item.place);
		clone.find('.author').remove();
		clone.find('.ago').remove();
		
		var helper = $('#sa-token-helper').clone();
		helper.html(item.category).attr('href','#events').attr('data-params',encodeURIComponent(JSON.stringify({category:item.key})));
		clone.find('.categories span').append(helper);
	}
	
	if (item.type == 'content') {
		clone.find('.author .n').html(item.author_name).attr('href','mailto:' + item.author_email);
		clone.find('.time').remove();
		
		if (topics.length > 0) {
			for (i in topics) {
				var topic = topics[i].split('|');
				var helper = $('#sa-token-helper').clone();
				helper.html(topic[1]).attr('href','#content').attr('data-params',encodeURIComponent(JSON.stringify({topics:[topic[0]]})));
				clone.find('.categories span').append(helper);
			}
		}
		else
			clone.find('.categories').remove();
	}
	
	$('#' + query + '-detail .ui-content').append(clone);
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
