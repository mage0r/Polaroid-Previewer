// Make sure Object.create is available in the browser (for our prototypal inheritance)
// Courtesy of Papa Crockford
// Note this is not entirely equal to native Object.create, but compatible with our use-case
if( typeof Object.create !== 'function') {
	Object.create = function(o) {
		function F() {
		}// optionally move this outside the declaration and into a closure if you need more speed.
		F.prototype = o;
		return new F();
	};
}

// polaroids pile object
(function($) {
	var settings = {
		'polaroids' : [],
		'redrawID' : null,
		'frameRate' : 30,
		'usingCookies' : true,
		'sort' : 'chaos',
		'categories' : 'type',
		// for future release
		'orderNewLinePerCategory' : false
	};
	var methods = {

		// init method
		init : function(sources,options) {
			if(options) {
				settings = $.extend(settings, options);
			}

			// Setup the polaroid stack
			for(var person in sources) {
					settings.polaroids[person] = Object.create(Polaroid);
					settings.polaroids[person].init({'source' : sources[person]}, this.width(), this.height());
			}
			
			// Recover the sort from cookies. this will default to chaos.
			// Override the default sort to ordered for screens too small to handle chaos nicely.
			if((settings.usingCookies && ($.cookie('polaroid-previewer-sort') == 'order')) || 
			   (settings.polaroids.length > 3 && (window.innerWidth < settings.polaroids[0].getWidth()*3 || window.innerHeight < settings.polaroids[0].getHeight()*3))) {
				this.polaroidStack('sortOrder',true);
			}

			// the zoom and info panels are dependant on the scale of the window and canvas
			$('body').append('<div id="polaroidStack-polaroidInfo">&nbsp;</div>');
			settings.infoPanel = $('#polaroidStack-polaroidInfo');
			$('body').append('<canvas id="polaroidStack-polaroidZoom"></canvas>');
			settings.zoomPanel = $('#polaroidStack-polaroidZoom');
			settings.zoomPanel[0].setAttribute('width', settings.polaroids[0].getZoomWidth());
			settings.zoomPanel[0].setAttribute('height', settings.polaroids[0].getZoomHeight());

			// Setup the canvas rendering environment
			// Ideally redraw should only be called if there's actual mouse activity.
			settings.redrawID = setInterval((function(self) {
				return function() {
					self.polaroidStack('redraw');
				};
			})(this), 1000 / settings.frameRate);

			// Setup the event triggers
			this.polaroidStack('setupActiveEvents');
			this.polaroidStack('sortEventsEnable');
			
			// Support chaining
			return this;
		},
		setupZoomInfo : function() {
			// don't setup the info panel if there's nothing in it
			if(settings.infoPanel.html() == '') {
				// setup the canvas where a zoomed polaroid will display
				settings.zoomPanel.css('left', (window.innerWidth - settings.zoomPanel.width()) / 2 - 10);
				settings.zoomPanel.css('top', (window.innerHeight - settings.zoomPanel.height()) / 2 + this.polaroidStack('getScrollOffset'));
			}
			// arrange vertically for narrow screens
			else if(window.innerWidth <= settings.zoomPanel.width() + settings.infoPanel.width() + 20) {
				// setup the info panel where extra information about a polariod will display
				settings.infoPanel.css('left', (window.innerWidth - 10 - (settings.infoPanel.width() + parseInt(settings.infoPanel.css('padding-left')) + parseInt(settings.infoPanel.css('padding-right')))) / 2);
				settings.infoPanel.css('top', (window.innerHeight + settings.zoomPanel.height()) / 2 - 210 + this.polaroidStack('getScrollOffset'));
				// can't use dynamic css3 here because it doesn't include the scroll bar but js does and testing for scrollbar is surprisingly non-trivial
				settings.infoPanel.css('padding-left',20);
				settings.infoPanel.css('padding-top',140);
				// setup the canvas where a zoomed polaroid will display
				settings.zoomPanel.css('left', (window.innerWidth - settings.zoomPanel.width()) / 2 - 10);
				settings.zoomPanel.css('top', (window.innerHeight - settings.zoomPanel.height()) / 2 - 60 + this.polaroidStack('getScrollOffset'));
				// nudge down if it goes over the top banner
				if(parseInt(settings.zoomPanel.css('top')) < 10) {
					settings.infoPanel.css('top', parseInt(settings.infoPanel.css('top')) + (10 - parseInt(settings.zoomPanel.css('top'))));
					settings.zoomPanel.css('top', 10);
				}
			}
			// arrange horizontally for wide screens
			else {
				// setup the info panel where extra information about a polariod will display
				settings.infoPanel.css('left', (window.innerWidth - settings.infoPanel.width()) / 2 + 260 - 170);
				settings.infoPanel.css('top', (window.innerHeight - settings.infoPanel.height()) / 2 + this.polaroidStack('getScrollOffset') - 10);
				settings.infoPanel.css('padding-left',140);
				settings.infoPanel.css('padding-top',20);
				// setup the canvas where a zoomed polaroid will display
				settings.zoomPanel.css('left', (window.innerWidth - settings.zoomPanel.width()) / 2 - 10 - 170);
				settings.zoomPanel.css('top', (window.innerHeight - settings.zoomPanel.height()) / 2 + this.polaroidStack('getScrollOffset'));
			}
		},
		/*
		 * On touch screen devices the hover event doesn't exist or is broken, so setup a mousedown event instead.
		 * Hover events on physical devices give a more responsive experience, but mousedown events are more consistent for touch screens.
		 */
		setupActiveEvents : function() {
			if(this.polaroidStack('isTouchDevice')) {
				this.bind('mousedown.info', {context: this}, function(event) {
					event.data.context.polaroidStack('sight', event.pageX, event.data.context[0].offsetLeft, event.pageY, event.data.context[0].offsetTop);
					event.data.context.polaroidStack('zoomInInitialize', event);
				});
			}
			else {
				this.bind('mousemove.hover', function(event) {
					$('#'+this.id).polaroidStack('hover', event);
				});
				this.bind('mouseout.hover', function(event) {
					$('#'+this.id).polaroidStack('hoverOut', event);
				});
			}
		},
		/*
		 * Compares the response given for scrollTop on html and body and gives the greater value.
		 * IE9 & FF gives the correct offset for html, Chrome gives the correct offset for body. Go figure.
		 */
		getScrollOffset : function() {
			if($('html').scrollTop() > $('body').scrollTop()) {
				return $('html').scrollTop();
			}
			return $('body').scrollTop();
		},
		/*
		 * Check if this device is a touch screen.
		 * This is important for setting up different event triggers on different interfaces.
		 */
		isTouchDevice : function() {
			return !!('ontouchstart' in window);
		},
		/*
		 * Look throught the stack and workout if any polaroid overlaps a point on the canvas
		 */
		sight : function(pointX, offsetX, pointY, offsetY) {
			for(var person = settings.polaroids.length - 1; person >= 0; person--) {
				if(settings.polaroids[person].isTarget(pointX, offsetX, pointY, offsetY)) {
					settings.target = person;
					return;
				}
			}
			settings.target = -1;
		},
		/*
		 * Works out if the mouse is hovering over a polaroid in the stack.
		 * If so, then it sets up the environemnt for dragging it around or zoom in.
		 */
		hover : function(event) {
			this.polaroidStack('sight', event.pageX, this[0].offsetLeft, event.pageY, this[0].offsetTop);
			if(settings.target >= 0) {
				// check if the info button is hovered
				if(settings.polaroids[settings.target].isInfo(event.pageX, this[0].offsetLeft, event.pageY, this[0].offsetTop)) {
					// prepare to select the info button
					settings.zoom = settings.target;
					
					this.unbind('mousedown.select');
					this.unbind('mouseup.unselect');
					this.unbind('mousedown.info');
					this.bind('mousedown.info', function(event) {
						$('#'+this.id).polaroidStack('zoomInInitialize', event);
					});
					this.css('cursor','pointer');
				}
				// otherwise prepare to select the photo
				else {
					this.unbind('mousedown.info');
					this.unbind('mousedown.select');
					this.bind('mousedown.select', function(event) {
						$('#'+this.id).polaroidStack('select', event);
					});
					this.css('cursor','move');
				}
			}
			// mouse is hovering over dead space 
			else {
				this.unbind('mousedown.info');
				this.unbind('mousedown.select');
				this.css('cursor','default');
			}
		},
		hoverOut : function(event) {
			settings.target = -1;
		},
		/*
		 * shuffles the target polaroid to the top of the stack
		 */
		reorder : function(target) {
			var temp = settings.polaroids[target];
			settings.polaroids.push(temp);
			settings.polaroids.splice(target, 1);
			return settings.polaroids.length - 1;
		},
		/*
		 * This brings a polaroid to the top of the stack and prepares the environment for dragging
		 */
		select : function(event) {
			settings.target = this.polaroidStack('reorder', settings.target);

			// rotate to signal recieved mousedown and remember where the mouse is relative to the polaroid
			settings.polaroids[settings.target].rotate();
			settings.polaroids[settings.target].setStart();
			settings.polaroids[settings.target].setStartMouse(event.pageX - this[0].offsetLeft,event.pageY - this[0].offsetTop);

			// setup the event triggers for dragging
			this.unbind('mousemove.hover');
			this.unbind('mouseout.hover');
			this.bind('mousemove.drag', function(event) {
				$('#'+this.id).polaroidStack('drag', event);
			});
			this.bind('mouseup.unselect', function(event) {
				$('#'+this.id).polaroidStack('unselect', event);
			});
		},
		/*
		 * Allows user to 'drop' a polaroid after dragging it around the canvas
		 */
		unselect : function(event) {
			this.unbind('mousemove.drag');
			this.unbind('mouseup.unselect');

			// record the new location for next time they visit
			settings.polaroids[settings.target].setCookies();
			settings.polaroids[settings.target].setStart();

			this.polaroidStack('setupActiveEvents');
			settings.target = -1;
			this.polaroidStack('setSort','chaos');
		},
		/*
		 * Allows the user to move a selected polaroid around on the canvas
		 */
		drag : function(event) {
			settings.polaroids[settings.target].move(event.pageX, this[0].offsetLeft, event.pageY, this[0].offsetTop);
		},
		/*
		 * Attach the sort events
		 */
		sortEventsEnable : function() {
			if(settings.sortOrder && settings.sortChaos) {
				settings.sortOrder.bind('click', {context: this}, function(event) {
					event.data.context.polaroidStack('sortOrder',false);
				});
				settings.sortChaos.bind('click', {context: this}, function(event) {
					event.data.context.polaroidStack('sortChaos');
				});
				if(settings.sort == 'order') {
					settings.sortOrder.removeClass('disabled');
					settings.sortChaos.removeClass('disabledunsel');
				}
				else {
					settings.sortChaos.removeClass('disabled');
					settings.sortOrder.removeClass('disabledunsel');
				}
			}
		},
		/*
		 * Remove all events without showing them as disabled
		 */
		sortEventsSilence : function() {
			if(settings.sortOrder && settings.sortChaos) {
				this.unbind('mousemove.hover');
				this.unbind('mouseout.hover');
				this.unbind('mousedown.info');
				settings.sortOrder.unbind('click');
				settings.sortChaos.unbind('click');
			}
		},
		/*
		 * Remove the sort events
		 */
		sortEventsDisable : function() {
			if(settings.sortOrder && settings.sortChaos) {
				settings.sortOrder.unbind('click');
				settings.sortChaos.unbind('click');
				if(settings.sort == 'order') {
					settings.sortOrder.addClass('disabled');
					settings.sortChaos.addClass('disabledunsel');
				}
				else {
					settings.sortChaos.addClass('disabled');
					settings.sortOrder.addClass('disabledunsel');
				}
			}
		},
		/*
		 * Recalculates the polaroid positions to accomodate the new canvas size depending on the sort algorithm being used
		 */
		resize : function() {
			this.polaroidStack('setupZoomInfo');
			
			// if we've zoomedin make sure the zoomout will animate from the revised coords
			if((settings.target >= 0) && settings.polaroids[settings.target].isZoomed()) {
				settings.zoomX = (window.innerWidth / 2) - (settings.polaroids[settings.target].settings.startWidth * settings.polaroids[settings.target].settings.zoom / 2) - 170;
				settings.zoomY = (window.innerHeight / 2) + this.polaroidStack('getScrollOffset') - (settings.polaroids[settings.target].settings.startHeight * settings.polaroids[settings.target].settings.zoom / 2);
				settings.polaroids[settings.target].settings.coordX = settings.zoomX;
				settings.polaroids[settings.target].settings.coordY = settings.zoomY;
			}

			if(settings.sort == 'order') {
				this.polaroidStack('setSort','chaos');
				this.polaroidStack('sortOrder',false);
			}
			else
				this.polaroidStack('sortChaos');
		},
		/*
		 * Moves the polaroids into a logical grouping
		 */
		sortOrder : function(firstPass) {
			settings.sortOrder.addClass('selected');
			settings.sortChaos.removeClass('selected');

			if(settings.sort == 'order') {
				// if the polaroids are already ordered, just rotate them a tad 
				// as a visual queue to the user they're not gonna move any further.
				for(var person in settings.polaroids) {
					settings.polaroids[person].setNewRotation();
				}
			}
			else {
				this.polaroidStack('sortEventsSilence');

				// must be able to uniquely identify the zoomed in polaroid after the sort
				if((settings.target >= 0) && (settings.polaroids[settings.target].isZoomed())) {
					settings.saveTarget = settings.polaroids[settings.target].getInfo('name');
				}

				// perform the sort
				settings.polaroids.sort(function(a,b) {
					if(a.getInfo(settings.categories)) {
						if(a.getInfo(settings.categories) < b.getInfo(settings.categories)) return -1;
						if(a.getInfo(settings.categories) > b.getInfo(settings.categories)) return 1;
					}
					if(a.getInfo('name') < b.getInfo('name')) return -1;
					if(a.getInfo('name') > b.getInfo('name')) return 1;
					return 0;
				});
				
				// how many polaroids can fit across the width of the canvas?
				var typesCount = Math.floor(this.width()/settings.polaroids[0].settings.startWidth);
				var spacingHorizontal = Math.floor((this.width()%(typesCount*settings.polaroids[0].settings.startWidth))/(typesCount+1));
				
				// how tall does the canvas need to be to fit them all in?
				var totalRows = Math.ceil(settings.polaroids.length / typesCount);
				var paddingTop = 50;
				var paddingBottom = 20;
				var minHeight = (settings.polaroids[0].settings.startHeight*totalRows)+paddingTop+paddingBottom;

				// increase the height of the canvas if necessary
				if(minHeight > this.height()) {
					this.attr({
						width : this.width() - 14,
						height : minHeight
					});

					// recalculate to accommodate the scrollbar
					typesCount = Math.floor(this.width()/settings.polaroids[0].settings.startWidth);
					spacingHorizontal = Math.floor((this.width()%(typesCount*settings.polaroids[0].settings.startWidth))/(typesCount+1));
					totalRows = Math.ceil(settings.polaroids.length / typesCount);
					minHeight = (settings.polaroids[0].settings.startHeight*totalRows)+paddingTop+paddingBottom;
					this.attr({
						height : minHeight
					});
				}

				// allocate each polaroid to its designated spot
				var count=1;
				var line=1;
				for(var person in settings.polaroids) {
					if((count%(typesCount+1) == 0) || (settings.orderNewLinePerCategory && (person > 0) && (settings.polaroids[person].getInfo('type') != settings.polaroids[person-1].getInfo('type')))) {
						line++;
						count=1;
					}
					settings.polaroids[person].setNewAllocCoords(((settings.polaroids[person].settings.startWidth+spacingHorizontal)*count)+5, (settings.polaroids[person].settings.startHeight*line)+paddingTop);
					if(firstPass) {
						settings.polaroids[person].setNewCoords(((settings.polaroids[person].settings.startWidth+spacingHorizontal)*count)+5, (settings.polaroids[person].settings.startHeight*line)+paddingTop);
					}
					count++;
				}
				this.polaroidStack('setSort','order');
			}
			if(firstPass != true) {
				this.polaroidStack('sortInitialize');
			}
		},
		/*
		 * Moves the polaroids into a random grouping
		 */
		sortChaos : function(event) {
			this.polaroidStack('sortEventsSilence');

			// cleanup after a sortOrder
			if(this.height() > (window.innerHeight - 6)) {
				this.liquidLayout();
			}

			settings.sortChaos.addClass('selected');
			settings.sortOrder.removeClass('selected');

			for(var person in settings.polaroids) {
				settings.polaroids[person].setNewRandomCoords(this.width(), this.height());
			}
			this.polaroidStack('setSort','chaos');
			this.polaroidStack('sortInitialize');
		},
		sortInitialize : function() {
			window.clearInterval(settings.sortID);
			settings.sortID = null;
			settings.sortFrame = 0;
			settings.sortID = setInterval((function(self) {
				return function() {
					self.polaroidStack('sortAnimate');
				};
			})(this), 1000 / settings.frameRate);
		},
		sortAnimate : function() {
			var totalSortFrames = 10;
			if(settings.sortFrame <= totalSortFrames) {
				for(var person in settings.polaroids) {
					settings.polaroids[person].dodge(settings.sortFrame, totalSortFrames);
				}
				settings.sortFrame++;
			}
			else {
				window.clearInterval(settings.sortID);
				settings.sortID = null;
				settings.sortFrame = 0;
				if(!settings.zoomed) {
					this.polaroidStack('setupActiveEvents');
					this.polaroidStack('sortEventsEnable');
				}
				// get the new target ID
				if(settings.saveTarget) {
					for(var person in settings.polaroids) {
						if(settings.polaroids[person].getInfo('name') == settings.saveTarget) {
							settings.target = this.polaroidStack('reorder', person);
						}
					}
					delete settings.saveTarget;
				}
			}
		},
		// define sort settings and save to cookies
		setSort : function(sort) {
			settings.sort = sort;
			if(settings.usingCookies) {
				$.cookie('polaroid-previewer-sort', settings.sort, {expires: 7});
			}
		},
		/*
		 * Handles the zoom in to see the polaroid better
		 */
		zoomInInitialize : function(event) {
			this.unbind('mousedown.info');
			this.unbind('mousemove.hover');
			this.unbind('mouseout.hover');
			this.polaroidStack('sortEventsDisable');
			this.polaroidStack('setupZoomInfo');
			
			settings.target = this.polaroidStack('reorder', settings.target);
			settings.polaroids[settings.target].setStart();
			settings.polaroids[settings.target].setZooming(true);

			settings.zoomX = parseInt(settings.zoomPanel.css('left'))+38;
			settings.zoomY = parseInt(settings.zoomPanel.css('top'))+38;
			settings.zoomFrame = 0;
			settings.zoomID = setInterval((function(self) {
				return function() {
					self.polaroidStack('zoomInAnimate');
				};
			})(this), 1000 / settings.frameRate);
		},
		/*
		 * Loop over the zoomIn to incrementally shift the polaroid
		 * The frame handling would probably be better off in the polaroid object its self
		 */
		zoomInAnimate : function() {
			var totalZoomFrames = 10;
			if(settings.zoomFrame <= totalZoomFrames) {
				settings.polaroids[settings.target].zoomIn(settings.zoomX, settings.zoomY, settings.zoomFrame, totalZoomFrames);
				settings.zoomFrame++;
			}
			else {
				// setup the zoomed polaroid inside its own canvas - helps with the layering
				// info panel allows the contents to be selectable, add a form, anything
				var ctx = settings.zoomPanel[0].getContext('2d');
				ctx.clearRect(0, 0, settings.zoomPanel.width(), settings.zoomPanel.height());
				settings.polaroids[settings.target].drawAt(false, ctx, settings.zoomPanel.width() / 2, settings.zoomPanel.height() / 2);
				settings.polaroids[settings.target].setZoomed(true);
				settings.polaroids[settings.target].setZooming(false);
				
				// show the info panel
				settings.infoPanel.html(settings.polaroids[settings.target].formatInfo());
				this.polaroidStack('setupZoomInfo');
				settings.infoPanel.bind('mousedown.infoStay', function(e) {
					e.stopPropagation();
				});
				if(!this.polaroidStack('isTouchDevice')) {
					$(settings.oneClickSelect).bind('click', function(e) {
	   					$(this).selectText();
					});
				}
				settings.zoomPanel.show();
				if(settings.infoPanel.html() != '') {
					settings.infoPanel.show('slide');
				}
				
				// clean up
				window.clearInterval(settings.zoomID);
				settings.zoomID = null;
				settings.zoomFrame = 0;
				settings.zoomed = true;
				
				$('body').bind('mousedown.zoomOut', {id : this.attr('id')}, function(event) {
					$('#'+event.data.id).polaroidStack('zoomOutInitialize', event);
				});
				settings.zoomPanel.bind('mousedown.zoomOut', {id : this.attr('id')}, function(event) {
					$('#'+event.data.id).polaroidStack('zoomOutInitialize', event);
				});
				this.bind('mousedown.zoomOut', function(event) {
					$('#'+this.id).polaroidStack('zoomOutInitialize', event);
				});
			}
		},
		/*
		 * Handles the zoom out to put the polaroid back in place
		 */
		zoomOutInitialize : function() {
			settings.infoPanel.unbind('mousedown.infoStay');
			settings.zoomPanel.unbind('mousedown.zoomOut');
			this.unbind('mousedown.zoomOut');
			$('body').unbind('mousedown.zoomOut');
			$(settings.oneClickSelect).unbind('click');

			settings.polaroids[settings.target].setZoomed(false);
			settings.polaroids[settings.target].setZooming(true);
			settings.zoomX = parseInt(settings.zoomPanel.css('left'))+38;
			settings.zoomY = parseInt(settings.zoomPanel.css('top'))+38;
			settings.zoomFrame = 0;

			// close the info panels and clean up
			var ctx = this[0].getContext('2d');
			settings.polaroids[settings.target].draw(false, ctx);
			settings.infoPanel.hide();
			settings.zoomPanel.hide();

			settings.zoomID = setInterval((function(self) {
				return function() {
					self.polaroidStack('zoomOutAnimate');
				};
			})(this), 1000 / settings.frameRate);
		},
		/*
		 * Loop over the zoomOut to incrementally shift the polaroid
		 * The frame handling would probably be better off in the polaroid object its self
		 */
		zoomOutAnimate : function() {
			var totalZoomFrames = 10;
			if(settings.zoomFrame <= totalZoomFrames) {
				settings.polaroids[settings.target].zoomOut(settings.zoomX, settings.zoomY, settings.zoomFrame, totalZoomFrames);
				settings.zoomFrame++;
			}
			else {
				window.clearInterval(settings.zoomID);
				settings.polaroids[settings.target].setZooming(false);
				settings.target = -1;
				settings.zoomID = null;
				settings.zoomFrame = 0;
				settings.zoomed = false;
				this.polaroidStack('setupActiveEvents');
				this.polaroidStack('sortEventsEnable');
			}
		},
		search : function(string) {
			this.polaroidStack('showAll');
			if(string.length > 0) {
				for(var person in settings.polaroids) {
					settings.polaroids[person].display(settings.polaroids[person].searchInfo(string.toLowerCase()));
				}
			}
		},
		showAll : function() {
			for(var person in settings.polaroids) {
				settings.polaroids[person].display(true);
			}
		},
		/*
		 * Redraw gets called repeatedly so the canvas can respond to mouse movement.
		 */
		redraw : function() {
			var ctx = this[0].getContext("2d");
			ctx.clearRect(0, 0, this.width(), this.height());

			for(var person in settings.polaroids) {
				if(person == settings.target) {
					settings.polaroids[person].draw(true, ctx);
				} else {
					settings.polaroids[person].draw(false, ctx);
				}
			}
		},
		destroy : function() {
			window.clearInterval(settings.redrawID);
			window.clearInterval(settings.sortID);
			window.clearInterval(settings.zoomID);

			for(var person in settings.polaroids) {
				settings.polaroids[person].destroy();
				delete settings.polaroids[person];
			}
			for(var set in settings) {
				delete settings[set];
			}
			$(settings.oneClickSelect).unbind();
			this.unbind();

			delete this;
		}
	};

	// polaroidStack object - setup the plugin
	$.fn.polaroidStack = function(method) {
		if(methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if( typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' + method + ' does not exist on jQuery.polaroid');
		}
	};
})(jQuery);
