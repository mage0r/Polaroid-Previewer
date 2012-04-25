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
		'showLocation' : false,
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

			// the zoom and info panels are dependant on the scale of the window and canvas
			$('body').append('<div id="polaroidStack-polaroidInfo"></div>');
			settings.infoPanel = $('#polaroidStack-polaroidInfo');
			$('body').append('<canvas id="polaroidStack-polaroidZoom"></canvas>');
			settings.zoomPanel = $('#polaroidStack-polaroidZoom');
			settings.zoomPanel[0].setAttribute('width', settings.polaroids[0].getZoomWidth());
			settings.zoomPanel[0].setAttribute('height', settings.polaroids[0].getZoomHeight());
			this.polaroidStack('setupZoomInfo');

			// Setup the canvas rendering environment
			// Ideally redraw should only be called if there's actual mouse activity.
			settings.redrawID = setInterval((function(self) {
				return function() {
					self.polaroidStack('redraw');
				};
			})(this), 1000 / settings.frameRate);

			// Setup the event triggers
			this.bind('mousemove.hover', function(event) {
				$('#'+this.id).polaroidStack('hover', event);
			});
			this.polaroidStack('sortEventsEnable');
			
			// Support chaining
			return this;
		},
		setupZoomInfo : function() {
			// setup the info panel where extra information about a polariod will display
			settings.infoPanel.css('left', (window.innerWidth / 2) - settings.infoPanel.width() / 2 + 260 - 170);
			settings.infoPanel.css('top', (window.innerHeight / 2) + $('body').scrollTop() - (settings.infoPanel.height() / 2) - 10);

			// setup the canvas where a zoomed polaroid will display
			settings.zoomPanel.css('left', (window.innerWidth / 2) - settings.zoomPanel.width() / 2 - 10 - 170);
			settings.zoomPanel.css('top', (window.innerHeight / 2) + $('body').scrollTop() - (settings.zoomPanel.height() / 2));
		},
		/*
		 * Look throught the stack and workout if any polaroid overlaps a point on the canvas
		 */
		sight : function(pointX, offsetX, pointY, offsetY) {
			for(var person = settings.polaroids.length - 1; person >= 0; person--) {
				if(settings.polaroids[person].isTarget(pointX, offsetX, pointY, offsetY)) {
					return person;
				}
			}
			return -1;
		},
		/*
		 * Works out if the mouse is hovering over a polaroid in the stack.
		 * If so, then it sets up the environemnt for dragging it around or zoom in.
		 */
		hover : function(event) {
			settings.target = this.polaroidStack('sight', event.pageX, this[0].offsetLeft, event.pageY, this[0].offsetTop);
			if(settings.target >= 0) {
				// check if the info button is hovered
				if(settings.polaroids[settings.target].isInfo(event.pageX, this[0].offsetLeft, event.pageY, this[0].offsetTop)) {
					// prepare to select the info button
					settings.zoom = settings.target;
					
					this.unbind('mousedown.select');
					this.unbind('mouseup.unselect');
					this.bind('mousedown.info', function(event) {
						$('#'+this.id).polaroidStack('info', event);
					});
					this.css('cursor','pointer');
				}
				// otherwise prepare to select the photo
				else {
					this.unbind('mousedown.info');
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

			// reposition it so it's selected in the center
			settings.polaroids[settings.target].move(event.pageX, this[0].offsetLeft, event.pageY, this[0].offsetTop);
			settings.polaroids[settings.target].rotate();

			// setup the event triggers for dragging
			this.unbind('mousemove.hover');
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

			this.bind('mousemove.hover', function(event) {
				$('#'+this.id).polaroidStack('hover', event);
			});
			settings.target = -1;
			settings.sort = 'chaos';
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
					event.data.context.polaroidStack('sortOrder');
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
		 * Recalculates the polaroid positions to accomodate the new size depending on the sort algorithm being used
		 */
		resize : function() {
			this.polaroidStack('setupZoomInfo');
			if(settings.sort == 'order') {
				settings.sort = 'chaos';
				this.polaroidStack('sortOrder');
			}
			else
				this.polaroidStack('sortChaos');
		},
		/*
		 * Moves the polaroids into a logical grouping
		 */
		sortOrder : function(event) {
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
				var typesCount = Math.floor(this.width()/settings.polaroids[0].settings.width);
				var spacingHorizontal = Math.floor((this.width()%(typesCount*settings.polaroids[0].settings.width))/(typesCount+1));
				
				// how tall does the canvas need to be to fit them all in?
				var totalRows = Math.ceil(settings.polaroids.length / typesCount);
				var paddingTop = 50;
				var paddingBottom = 20;
				var minHeight = (settings.polaroids[0].settings.height*totalRows)+paddingTop+paddingBottom;

				// increase the height of the canvas if necessary
				if(minHeight > this.height()) {
					this.attr({
						width : this.width() - 14,
						height : minHeight
					});

					// recalculate to accommodate the scrollbar
					typesCount = Math.floor(this.width()/settings.polaroids[0].settings.width);
					spacingHorizontal = Math.floor((this.width()%(typesCount*settings.polaroids[0].settings.width))/(typesCount+1));
					totalRows = Math.ceil(settings.polaroids.length / typesCount);
					minHeight = (settings.polaroids[0].settings.height*totalRows)+paddingTop+paddingBottom;
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
					settings.polaroids[person].setNewAllocCoords(((settings.polaroids[0].settings.width+spacingHorizontal)*count)+5, (settings.polaroids[0].settings.height*line)+paddingTop);
					count++;
				}
				settings.sort = 'order';
			}
			this.polaroidStack('startSortAnimation');
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
			settings.sort = 'chaos';
			this.polaroidStack('startSortAnimation');
		},
		startSortAnimation : function() {
			window.clearInterval(settings.sortID);
			settings.sortID = null;
			settings.sortFrame = 0;
			settings.sortID = setInterval((function(self) {
				return function() {
					self.polaroidStack('sortAnimation');
				};
			})(this), 1000 / settings.frameRate);
		},
		sortAnimation : function() {
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
					this.bind('mousemove.hover', function(event) {
						$('#'+this.id).polaroidStack('hover', event);
					});
					this.polaroidStack('sortEventsEnable');
				}
			}
		},
		/*
		 * Handles the zoom in to see the polaroid better
		 */
		info : function(event) {
			this.unbind('mousemove.hover');
			this.unbind('mousedown.info');
			this.polaroidStack('sortEventsDisable');
			this.polaroidStack('setupZoomInfo');
			
			settings.target = this.polaroidStack('reorder', settings.target);
			settings.polaroids[settings.target].setStart();

			settings.zoomX = (window.innerWidth / 2) - (settings.polaroids[settings.target].settings.startWidth * settings.polaroids[settings.target].settings.zoom / 2) - 170;
			settings.zoomY = (window.innerHeight / 2) + $('body').scrollTop() - (settings.polaroids[settings.target].settings.startHeight * settings.polaroids[settings.target].settings.zoom / 2);
			settings.zoomFrame = 0;
			settings.zoomID = setInterval((function(self) {
				return function() {
					self.polaroidStack('zoomIn');
				};
			})(this), 1000 / settings.frameRate);
		},
		/*
		 * Loop over the zoomIn to incrementally shift the polaroid
		 * The frame handling would probably be better off in the polaroid object its self
		 */
		zoomIn : function() {
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
				this.polaroidStack('updateInfo', settings.polaroids[settings.target].getInfo());
				$(settings.oneClickSelect).bind('click', function(e) {
   					$(this).selectText();
				});
				settings.zoomPanel.show();
				settings.infoPanel.show('slide');
				
				window.clearInterval(settings.zoomID);
				settings.zoomID = null;
				settings.zoomFrame = 0;
				settings.zoomed = true;
				this.bind('mousedown.infoOut', function(event) {
					$('#'+this.id).polaroidStack('infoOut', event);
				});
			}
		},
		updateInfo : function(target) {
			var contents = '';
			for(var output in target) {
				if(settings.showLocation || (!settings.showLocation && output != 'location')) {
					contents += "<p><span class=\"title\" id=\""+output+"_title\">"+output.substr(0,1).toUpperCase()+output.substr(1,output.length).replace('_',' ')+"</span> <span id=\""+output+"\" class=\"selectableField\">"+target[output]+"</span></p>";
				}
			}
			settings.infoPanel.html(contents);
		},
		/*
		 * Handles the zoom out to put the polaroid back in place
		 */
		infoOut : function() {
			this.unbind('mousedown.infoOut');
			$(settings.oneClickSelect).unbind('click');

			// close the info panels and clean up
			settings.polaroids[settings.target].setZoomed(false);
			var ctx = this[0].getContext('2d');
			settings.polaroids[settings.target].draw(false, ctx);
			settings.infoPanel.hide();
			settings.zoomPanel.hide();

			settings.zoomFrame = 0;
			settings.zoomID = setInterval((function(self) {
				return function() {
					self.polaroidStack('zoomOut');
				};
			})(this), 1000 / settings.frameRate);
		},
		/*
		 * Loop over the zoomOut to incrementally shift the polaroid
		 * The frame handling would probably be better off in the polaroid object its self
		 */
		zoomOut : function() {
			var totalZoomFrames = 10;
			if(settings.zoomFrame <= totalZoomFrames) {
				settings.polaroids[settings.target].zoomOut(settings.zoomX, settings.zoomY, settings.zoomFrame, totalZoomFrames);
				settings.zoomFrame++;
			}
			else {
				window.clearInterval(settings.zoomID);
				settings.zoomID = null;
				settings.zoomFrame = 0;
				settings.target = -1;
				settings.zoomed = false;
				this.bind('mousemove.hover', function(event) {
					$('#'+this.id).polaroidStack('hover', event);
				});
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
