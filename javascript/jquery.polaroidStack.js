// polaroids pile object
(function($) {
	var polaroidStack = Class.extend({
		// init method
		init : function(options, element) {
			this.options = $.extend({
				'polaroids' : [],
				'redrawID' : null,
				'loaded' : 0,
				'animations' : 0,
				'framesDrawn' : 0,
				'frameRate' : 30,
				'displayDebug' : false,
				'usingCookies' : (typeof $.cookie == 'undefined') ? false : true,
				'sort' : 'chaos',
				'categories' : 'type',
				'originalHeight' : null,
				'originalWidth' : null,
				// for future release
				'orderNewLinePerCategory' : false
			}, options);
			this.element = $(element);

			// create the polaroids
			this.initPolaroids(options);
			// arrange the polaroids based on the initial sort
			this.initSort();
			// draw the polaroids onto the primary canvas
			this.initDraw();
				
			// Create the zoom and info panels
			this.initZoomInfo();
			// Setup the event triggers
			this.setupActiveEvents();
			this.sortEventsEnable();

			// Support chaining
			return this;
		},

		initPolaroids : function(options) {
			// Setup the polaroid stack
			for(var person in this.options.sources) {
				this.options.polaroids[person] = Object.create(Polaroid);
				this.options.polaroids[person].init($.extend({'source' : this.options.sources[person], 'id' : this.element.attr('id')}, options), this.element.width(), this.element.height());
			}
		},

		initSort : function() {
			// Recover the sort from cookies. this will default to chaos.
			// Override the default sort to ordered for screens too small to handle chaos nicely.
			if((this.options.sort == 'order') || 
			   (this.options.usingCookies && ($.cookie(this.element.attr('id')+'#polaroid-previewer-sort') == 'order')) || 
			   (this.options.polaroids.length > 3 && (window.innerWidth < this.options.polaroids[0].getWidth()*3 || window.innerHeight < this.options.polaroids[0].getHeight()*3))) {
				this.options.sort = null;
				this.sortOrder(false);
			}
		},

		/*
		 * drawing functions to control when the canvas needs to be updated
		 */
		initDraw : function() {
			this.drawBeginAnimation();
			this.element.bind('imageLoad.draw', {context: this}, function(event) {
				// stop the fade in animation when all the images have finished
				event.data.context.options.loaded++;
				if(event.data.context.options.loaded == event.data.context.options.polaroids.length) {
					event.data.context.drawStopAnimation();
				}
			});

			this.element.bind('polaroidAnimationStart.draw', {context: this}, function(event) {
				event.data.context.drawBeginAnimation();
			});
			this.element.bind('polaroidAnimationEnd.draw', {context: this}, function(event) {
				event.data.context.drawStopAnimation();
			});
		},
		
		drawBeginAnimation : function(timeout) {
			// Setup the canvas rendering environment
			// Ideally redraw should only be called if there's actual mouse activity.
			this.options.animations++;
			if(this.options.animations == 1) {
				this.options.redrawID = setInterval((function(self) {
					return function() {
						self.redraw();
					};
				})(this), 1000 / this.options.frameRate);
				
				if(typeof timeout != 'undefined') {
					var stop = this;
					setTimeout(function() {
						stop.drawStopAnimation();
					}, timeout);
				}
			}
		},
		
		drawStopAnimation : function() {
			this.options.animations--;
			if(this.options.animations == 0) {
				if(this.options.redrawID != null) {
					var redrawID = this.options.redrawID;
					setTimeout(function() {
						window.clearInterval(redrawID);
					}, 100);
				}
				this.options.redrawID = null;			
			}
		},
		
		initZoomInfo : function() {
			$('body').append('<div id="'+this.element.attr('id')+'-polaroidStack-polaroidInfo" class="polaroidStack-polaroidInfo" width="300px">&nbsp;</div>');
			this.options.infoPanel = $('#'+this.element.attr('id')+'-polaroidStack-polaroidInfo');
			$('body').append('<canvas id="'+this.element.attr('id')+'-polaroidStack-polaroidZoom" class="polaroidStack-polaroidZoom"></canvas>');
			this.options.zoomPanel = $('#'+this.element.attr('id')+'-polaroidStack-polaroidZoom');
			this.resizeZoomInfo();
		},
		resizeZoomInfo : function() {
			this.options.zoomPanel[0].setAttribute('width', this.options.polaroids[0].getZoomWidth());
			this.options.zoomPanel[0].setAttribute('height', this.options.polaroids[0].getZoomHeight());
		},
		// the zoom and info panels are dependant on the scale of the window and canvas
		setupZoomInfo : function() {
			//this.resizeZoomInfo();
			// don't setup the info panel if there's nothing in it
			if(this.options.infoPanel.html() == '') {
				// setup the canvas where a zoomed polaroid will display
				this.options.zoomPanel.css('left', (window.innerWidth - this.options.zoomPanel.width()) / 2 - 10);
				this.options.zoomPanel.css('top', (window.innerHeight - this.options.zoomPanel.height()) / 2 + this.getScrollOffset());
			}
			// arrange vertically for narrow screens
			else if(window.innerWidth <= this.options.zoomPanel.width() + this.options.infoPanel.width() + 20) {
				// can't use dynamic css3 here because css doesn't include the scroll bar but js does and testing for scrollbar is surprisingly non-trivial
				this.options.infoPanel.css('padding-left',20);
				this.options.infoPanel.css('padding-top',140);
				// setup the info panel where extra information about a polariod will display
				this.options.infoPanel.css('left', (window.innerWidth - 10 - (this.options.infoPanel.width() + parseInt(this.options.infoPanel.css('padding-left')) + parseInt(this.options.infoPanel.css('padding-right')))) / 2);
				this.options.infoPanel.css('top', (window.innerHeight - this.options.zoomPanel.height()) / 2 + this.getScrollOffset() + this.options.zoomPanel.height() - 210);
				// setup the canvas where a zoomed polaroid will display
				this.options.zoomPanel.css('left', (window.innerWidth - this.options.zoomPanel.width()) / 2 - 10);
				this.options.zoomPanel.css('top', (window.innerHeight - this.options.zoomPanel.height()) / 2 - 60 + this.getScrollOffset());
				// nudge down if it goes over the top banner
				if(parseInt(this.options.zoomPanel.css('top')) < 10) {
					this.options.infoPanel.css('top', parseInt(this.options.infoPanel.css('top')) + (10 - parseInt(this.options.zoomPanel.css('top'))));
					this.options.zoomPanel.css('top', 10);
				}
			}
			// arrange horizontally for wide screens
			else {
				this.options.infoPanel.css('padding-left',140);
				this.options.infoPanel.css('padding-top',20);
				// setup the info panel where extra information about a polariod will display
				this.options.infoPanel.css('left', ((window.innerWidth - this.options.infoPanel.width()) / 2) + (this.options.zoomPanel.width() / 2) - 170);
				this.options.infoPanel.css('top', (window.innerHeight - this.options.infoPanel.height()) / 2 + this.getScrollOffset() - 10);
				// setup the canvas where a zoomed polaroid will display
				this.options.zoomPanel.css('left', (window.innerWidth - this.options.zoomPanel.width()) / 2 - 10 - 170);
				this.options.zoomPanel.css('top', (window.innerHeight - this.options.zoomPanel.height()) / 2 + this.getScrollOffset());
			}
		},
		setStyle : function(style) {
			for(var person = this.options.polaroids.length - 1; person >= 0; person--) {
				this.options.polaroids[person]['style'+style]();
				this.options.polaroids[person].saveLocation();
				this.options.polaroids[person].resetCache();
			}
			if(this.options.sort == 'order') {
				this.setSort('chaos');
				this.sortOrder(true);
			}
			this.resizeZoomInfo();
			this.setupZoomInfo();
		},
		/*
		 * On touch screen devices the hover event doesn't exist or is broken, so setup a mousedown event instead.
		 * Hover events on physical devices give a more responsive experience, but mousedown events are more consistent for touch screens.
		 */
		setupActiveEvents : function() {
			if('ontouchstart' in window) {
				this.element.bind('mousedown.info', {context: this}, function(event) {
					event.data.context.findTarget(event.pageX, event.data.context.element[0].offsetLeft, event.pageY, event.data.context.element[0].offsetTop);
					event.data.context.zoomInInitialize(event);
				});
			}
			else {
				this.element.bind('mousemove.hover', {context: this}, function(event) {
					event.data.context.hoverOver(event);
				});
				this.element.bind('mouseout.hover', {context: this}, function(event) {
					event.data.context.hoverOut(event);
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
		 * Look throught the stack and workout if any polaroid overlaps a point on the canvas
		 */
		findTarget : function(pointX, offsetX, pointY, offsetY) {
			this.element.trigger('polaroidAnimationStart.draw');
			for(var person = this.options.polaroids.length - 1; person >= 0; person--) {
				if(this.options.polaroids[person].isTarget(pointX, offsetX, pointY, offsetY)) {
					this.options.target = person;
					this.element.trigger('polaroidAnimationEnd.draw');
					return;
				}
			}
			this.options.target = -1;
			this.element.trigger('polaroidAnimationEnd.draw');
		},
		/*
		 * Works out if the mouse is hovering over a polaroid in the stack.
		 * If so, then it sets up the environemnt for dragging it around or zoom in.
		 */
		hoverOver : function(event) {
			this.findTarget(event.pageX, this.element[0].offsetLeft, event.pageY, this.element[0].offsetTop);
			if(this.options.target >= 0) {
				// check if the info button is hovered
				if(this.options.polaroids[this.options.target].isInfo(event.pageX, this.element[0].offsetLeft, event.pageY, this.element[0].offsetTop)) {
					// prepare to select the info button
					this.options.zoom = this.options.target;
					
					this.element.unbind('mousedown.select');
					this.element.unbind('mouseup.unselect');
					this.element.unbind('mousedown.info');
					this.element.bind('mousedown.info', function(event) {
						$('#'+this.id).polaroidStack('zoomInInitialize', event);
					});
					this.element.css('cursor','pointer');
				}
				// otherwise prepare to select the photo
				else {
					this.element.unbind('mousedown.info');
					this.element.unbind('mousedown.select');
					this.element.bind('mousedown.select', function(event) {
						$('#'+this.id).polaroidStack('select', event);
					});
					this.element.css('cursor','move');
				}
			}
			// mouse is hovering over dead space 
			else {
				this.element.unbind('mousedown.info');
				this.element.unbind('mousedown.select');
				this.element.css('cursor','default');
			}
		},

		hoverOut : function(event) {
			this.options.target = -1;
		},
		/*
		 * shuffles the target polaroid to the top of the stack
		 */
		toTop : function(target) {
			var temp = this.options.polaroids[target];
			this.options.polaroids.push(temp);
			this.options.polaroids.splice(target, 1);
			return this.options.polaroids.length - 1;
		},		
		/*
		 * This brings a polaroid to the top of the stack and prepares the environment for dragging
		 */
		select : function(event) {
			this.options.target = this.toTop(this.options.target);

			// rotate to signal recieved mousedown and remember where the mouse is relative to the polaroid
			this.options.polaroids[this.options.target].rotate();
			this.options.polaroids[this.options.target].saveLocation();
			this.options.polaroids[this.options.target].saveMouse(event.pageX - this.element[0].offsetLeft,event.pageY - this.element[0].offsetTop);

			// setup the event triggers for dragging
			this.element.unbind('mousemove.hover');
			this.element.unbind('mouseout.hover');
			this.element.bind('mousemove.drag', function(event) {
				$('#'+this.id).polaroidStack('drag', event);
			});
			this.element.bind('mouseup.unselect', function(event) {
				$('#'+this.id).polaroidStack('unselect', event);
			});
		},
		/*
		 * Allows user to 'drop' a polaroid after dragging it around the canvas
		 */
		unselect : function(event) {
			this.element.unbind('mousemove.drag');
			this.element.unbind('mouseup.unselect');

			// record the new location for next time they visit
			this.options.polaroids[this.options.target].setCookies();
			this.options.polaroids[this.options.target].saveLocation();

			this.setupActiveEvents();
			this.options.target = -1;
			this.setSort('chaos');
		},
		/*
		 * Allows the user to move a selected polaroid around on the canvas
		 */
		drag : function(event) {
			this.element.trigger('polaroidAnimationStart.draw');
			this.options.polaroids[this.options.target].drag(event.pageX, this.element[0].offsetLeft, event.pageY, this.element[0].offsetTop);
			this.element.trigger('polaroidAnimationEnd.draw');
		},
		/*
		 * Attach the sort events
		 */
		sortEventsEnable : function() {
			if(this.options.sortOrder && this.options.sortChaos) {
				this.options.sortOrder.bind('click', {context: this}, function(event) {
					event.data.context.sortOrder(true);
				});
				this.options.sortChaos.bind('click', {context: this}, function(event) {
					event.data.context.sortChaos();
				});
				if(this.options.sort == 'order') {
					this.options.sortOrder.removeClass('disabled');
					this.options.sortChaos.removeClass('disabledunsel');
				}
				else {
					this.options.sortChaos.removeClass('disabled');
					this.options.sortOrder.removeClass('disabledunsel');
				}
			}
		},
		/*
		 * Remove all events without showing them as disabled
		 */
		sortEventsSilence : function() {
			if(this.options.sortOrder && this.options.sortChaos) {
				this.element.unbind('mousemove.hover');
				this.element.unbind('mouseout.hover');
				this.element.unbind('mousedown.info');
				this.options.sortOrder.unbind('click');
				this.options.sortChaos.unbind('click');
			}
		},
		/*
		 * Remove the sort events
		 */
		sortEventsDisable : function() {
			if(this.options.sortOrder && this.options.sortChaos) {
				this.options.sortOrder.unbind('click');
				this.options.sortChaos.unbind('click');
				if(this.options.sort == 'order') {
					this.options.sortOrder.addClass('disabled');
					this.options.sortChaos.addClass('disabledunsel');
				}
				else {
					this.options.sortChaos.addClass('disabled');
					this.options.sortOrder.addClass('disabledunsel');
				}
			}
		},
		/*
		 * Recalculates the polaroid positions to accomodate the new canvas size depending on the sort algorithm being used
		 */
		resize : function() {
			this.setupZoomInfo();

			if(this.options.sort == 'order') {
				this.setSort('chaos');
				this.sortOrder(true);
			}
			else
				this.sortChaos();
		},
		/*
		 * Moves the polaroids into a logical grouping
		 */
		sortOrder : function(animate) {
			if(this.options.sortOrder && this.options.sortChaos) {
				this.options.sortOrder.addClass('selected');
				this.options.sortChaos.removeClass('selected');
			}

			this.sortEventsSilence();
			if(this.options.sort == 'order') {
				// if the polaroids are already ordered, just rotate them a tad 
				// as a visual queue to the user they're not gonna move any further.
				for(var person in this.options.polaroids) {
					this.options.polaroids[person].setAnimationRotate();
				}
			}
			else {
				// must be able to uniquely identify the zoomed in polaroid after the sort
				if((this.options.target >= 0) && (this.options.polaroids[this.options.target].isZoomed())) {
					this.options.saveTarget = this.options.polaroids[this.options.target].getInfo('name');
				}

				// perform the sort
				var categories = this.options.categories;
				this.options.polaroids.sort(function(a,b) {
					if(a.getInfo(categories)) {
						if(a.getInfo(categories) < b.getInfo(categories)) return -1;
						if(a.getInfo(categories) > b.getInfo(categories)) return 1;
					}
					if(a.getInfo('name') < b.getInfo('name')) return -1;
					if(a.getInfo('name') > b.getInfo('name')) return 1;
					return 0;
				});
				
				// how many polaroids can fit across the width of the canvas?
				var typesCount = Math.floor(this.element.width()/this.options.polaroids[0].settings.startWidth);
				var spacingHorizontal = Math.floor((this.element.width()%(typesCount*this.options.polaroids[0].settings.startWidth))/(typesCount+1));
				
				// how tall does the canvas need to be to fit them all in?
				var totalRows = Math.ceil(this.options.polaroids.length / typesCount);
				var paddingTop = 10;
				var paddingBottom = 20;
				var minHeight = (this.options.polaroids[0].settings.startHeight*totalRows)+paddingTop+paddingBottom;

				// increase the height of the canvas if necessary
				if(minHeight > this.element.height()) {
					// save the original height so we can come back to it later
					this.options.originalWidth = this.element.width();
					this.options.originalHeight = this.element.height();
					this.element.attr({
						width : this.element.width() - 14,
						height : minHeight
					});

					// recalculate to accommodate the scrollbar
					typesCount = Math.floor(this.element.width()/this.options.polaroids[0].settings.startWidth);
					spacingHorizontal = Math.floor((this.element.width()%(typesCount*this.options.polaroids[0].settings.startWidth))/(typesCount+1));
					totalRows = Math.ceil(this.options.polaroids.length / typesCount);
					minHeight = (this.options.polaroids[0].settings.startHeight*totalRows)+paddingTop+paddingBottom;
					this.element.attr({
						height : minHeight
					});
				}

				// allocate each polaroid to its designated spot
				var count=1;
				var line=1;
				for(var person in this.options.polaroids) {
					if((count%(typesCount+1) == 0) || (this.options.orderNewLinePerCategory && (person > 0) && (this.options.polaroids[person].getInfo('type') != this.options.polaroids[person-1].getInfo('type')))) {
						line++;
						count=1;
					}
					animate ? 
						this.options.polaroids[person].setAnimationCoords(((this.options.polaroids[person].settings.startWidth+spacingHorizontal)*count)+5, (this.options.polaroids[person].settings.startHeight*line)+paddingTop) :
						this.options.polaroids[person].setCoords(((this.options.polaroids[person].settings.startWidth+spacingHorizontal)*count)+5, (this.options.polaroids[person].settings.startHeight*line)+paddingTop) ;
					count++;
				}
				this.setSort('order');
			}
			if(animate && this.options.sortID == null) {
				this.sortBeginAnimation();
			}
		},
		/*
		 * Moves the polaroids into a random grouping
		 */
		sortChaos : function(event) {
			this.sortEventsSilence();

			if((this.element.height() != this.options.originalHeight) && (this.options.originalHeight != null)) {
				this.element.attr({
					width : this.options.originalWidth,
					height : this.options.originalHeight - parseInt(this.element.css('margin-top')) - parseInt(this.element.css('padding-top')) - parseInt(this.element.css('margin-bottom')) - parseInt(this.element.css('padding-bottom'))
				});
				this.options.originalWidth = null;
				this.options.originalHeight = null;
				this.element.trigger('switchOrderToChaos');
			}

			this.options.sortChaos.addClass('selected');
			this.options.sortOrder.removeClass('selected');

			for(var person in this.options.polaroids) {
				this.options.polaroids[person].setRandomAnimationCoords(this.element.width(), this.element.height());
			}
			this.setSort('chaos');

			if(this.options.sortID == null) {
				this.sortBeginAnimation();
			}
		},
		sortBeginAnimation : function() {
			window.clearInterval(this.options.sortID);
			this.options.sortID = null;
			this.options.sortFrame = 0;
			this.element.trigger('polaroidAnimationStart.draw');
			this.options.sortID = setInterval((function(self) {
				return function() {
					self.sortAnimate();
				};
			})(this), 1000 / this.options.frameRate);
		},
		sortAnimate : function() {
			var totalSortFrames = 10;
			if(this.options.sortFrame <= totalSortFrames) {
				for(var person in this.options.polaroids) {
					this.options.polaroids[person].nudge(this.options.sortFrame, totalSortFrames);
				}
				this.options.sortFrame++;
			}
			else {
				window.clearInterval(this.options.sortID);
				this.options.sortID = null;
				this.options.sortFrame = 0;
				if(!this.options.zoomed) {
					this.setupActiveEvents();
					this.sortEventsEnable();
				}
				// get the new target ID
				if(this.options.saveTarget) {
					for(var person in this.options.polaroids) {
						if(this.options.polaroids[person].getInfo('name') == this.options.saveTarget) {
							this.options.target = this.toTop(person);
						}
					}
					delete this.options.saveTarget;
				}
				this.element.trigger('polaroidAnimationEnd.draw');
			}
		},
		// define sort settings and save to cookies
		setSort : function(sort) {
			this.options.sort = sort;
			if(this.options.usingCookies) {
				$.cookie(this.element.attr('id')+'#polaroid-previewer-sort', this.options.sort, {expires: 7});
			}
		},
		/*
		 * Handles the zoom in to see the polaroid better
		 */
		zoomInInitialize : function(event) {
			this.element.trigger('polaroidAnimationStart.draw');
			this.element.unbind('mousedown.info');
			this.element.unbind('mousemove.hover');
			this.element.unbind('mouseout.hover');
			this.sortEventsDisable();
			this.resizeZoomInfo();
			this.setupZoomInfo();
			
			this.options.zoomPanel.show();
			this.options.zoomPanel.css('z-index',50);
			this.options.target = this.toTop(this.options.target);
			this.options.polaroids[this.options.target].saveLocation();

			this.options.zoomX = parseInt(this.options.zoomPanel.css('left'))+38-this.element[0].offsetLeft;
			this.options.zoomY = parseInt(this.options.zoomPanel.css('top'))+38-this.element[0].offsetTop;
			this.options.zoomFrame = 0;

			this.options.polaroids[this.options.target].setZooming(true);
			this.options.zoomID = setInterval((function(self) {
				return function() {
					self.zoomInAnimate();
				};
			})(this), 1000 / this.options.frameRate);
		},
		/*
		 * Loop over the zoomIn to incrementally shift the polaroid
		 * The frame handling would probably be better off in the polaroid object its self
		 */
		zoomInAnimate : function() {
			var ctx = this.options.zoomPanel[0].getContext('2d');
			var totalZoomFrames = 10;

			if(this.options.zoomFrame <= totalZoomFrames) {
				this.options.polaroids[this.options.target].setZoomed(true);
				// setup the zoomed polaroid inside its own canvas - helps with the layering
				this.options.polaroids[this.options.target].zoomIn(this.options.zoomX, this.options.zoomY, this.options.zoomFrame, totalZoomFrames, this.options.zoomPanel, this.element[0].offsetLeft, this.element[0].offsetTop);
				this.options.zoomFrame++;
			}
			else {
				// info panel allows the contents to be selectable, add a form, anything
				this.options.polaroids[this.options.target].setZooming(false);
				
				// show the panels
				this.options.infoPanel.html(this.options.polaroids[this.options.target].formatInfo());
				this.options.infoPanel.bind('mousedown.infoStay', function(e) {
					e.stopPropagation();
				});
				//this.options.zoomPanel.show();
				if(this.options.infoPanel.html() != '') {
					this.options.infoPanel.show('slide');
				}
				
				// clean up
				window.clearInterval(this.options.zoomID);
				this.options.zoomID = null;
				this.options.zoomFrame = 0;
				this.options.zoomed = true;
				
				$('body').bind('mousedown.zoomOut', {context : this}, function(event) {
					event.data.context.zoomOutInitialize(event);
				});
				this.options.zoomPanel.bind('mousedown.zoomOut', {context : this}, function(event) {
					event.data.context.zoomOutInitialize(event);
				});
				this.element.bind('mousedown.zoomOut', {context : this}, function(event) {
					event.data.context.zoomOutInitialize(event);
				});
				this.element.trigger('polaroidAnimationEnd.draw');
			}
		},
		/*
		 * Handles the zoom out to put the polaroid back in place
		 */
		zoomOutInitialize : function() {
			this.element.trigger('polaroidAnimationStart.draw');
			this.options.infoPanel.unbind('mousedown.infoStay');
			this.options.zoomPanel.unbind('mousedown.zoomOut');
			this.element.unbind('mousedown.zoomOut');
			$('body').unbind('mousedown.zoomOut');

			this.options.polaroids[this.options.target].setZoomed(true);
			this.options.polaroids[this.options.target].setZooming(true);
			this.options.zoomX = parseInt(this.options.zoomPanel.css('left'))+38-this.element[0].offsetLeft;
			this.options.zoomY = parseInt(this.options.zoomPanel.css('top'))+38-this.element[0].offsetTop;
			this.options.zoomFrame = 0;

			// close the info panels and clean up
			this.options.zoomPanel.css('z-index',40);
			this.options.infoPanel.hide();

			this.options.zoomID = setInterval((function(self) {
				return function() {
					self.zoomOutAnimate();
				};
			})(this), 1000 / this.options.frameRate);
		},
		/*
		 * Loop over the zoomOut to incrementally shift the polaroid
		 * The frame handling would probably be better off in the polaroid object its self
		 */
		zoomOutAnimate : function() {
			var totalZoomFrames = 10;
			if(this.options.zoomFrame <= totalZoomFrames) {
				this.options.polaroids[this.options.target].zoomOut(this.options.zoomX, this.options.zoomY, this.options.zoomFrame, totalZoomFrames, this.options.zoomPanel, this.element[0].offsetLeft, this.element[0].offsetTop);
				this.options.zoomFrame++;
			}
			else {
				this.options.infoPanel.hide();
				window.clearInterval(this.options.zoomID);
				this.options.polaroids[this.options.target].setZoomed(false);
				this.options.polaroids[this.options.target].setZooming(false);
				this.options.target = -1;
				this.options.zoomID = null;
				this.options.zoomFrame = 0;
				this.options.zoomed = false;
				this.setupActiveEvents();
				this.sortEventsEnable();
				
				this.redraw();
				this.options.zoomPanel.hide();
				this.element.trigger('polaroidAnimationEnd.draw');
			}
		},
		search : function(string) {
			this.showAll();
			this.element.trigger('polaroidAnimationStart.draw');
			if(string.length > 0) {
				for(var person in this.options.polaroids) {
					this.options.polaroids[person].display(this.options.polaroids[person].searchInfo(string.toLowerCase()));
				}
			}
			this.element.trigger('polaroidAnimationEnd.draw');
		},
		showAll : function() {
			this.element.trigger('polaroidAnimationStart.draw');
			for(var person in this.options.polaroids) {
				this.options.polaroids[person].display(true);
			}
			this.element.trigger('polaroidAnimationEnd.draw');
		},
		/*
		 * Redraw gets called repeatedly so the canvas can respond to mouse movement.
		 */
		redraw : function() {
			var ctx = this.element[0].getContext("2d");
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

			for(var person in this.options.polaroids) {
				if(person == this.options.target) {
					this.options.polaroids[person].draw(true, ctx);
				} else {
					this.options.polaroids[person].draw(false, ctx);
				}
			}

			this.options.framesDrawn++;
			if(this.options.displayDebug) {
				ctx.fillStyle = "black";
				ctx.fillRect(10, 10, 170, 50);
				ctx.font = "bold 16px Arial";
				ctx.fillStyle = "white";
				ctx.fillText('frames drawn: '+this.options.framesDrawn, 20, 30);
				ctx.fillText('images loaded: '+this.options.loaded, 20, 50);
			}
		},
		destroy : function() {
			window.clearInterval(this.options.redrawID);
			window.clearInterval(this.options.sortID);
			window.clearInterval(this.options.zoomID);

			for(var person in this.options.polaroids) {
				this.options.polaroids[person].destroy();
				delete this.options.polaroids[person];
			}
			for(var set in this.options) {
				delete this.options[set];
			}
			this.element.unbind();

			delete this;
		}
	});

	$.plugin('polaroidStack', polaroidStack);
})(jQuery);
