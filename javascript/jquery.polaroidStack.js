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
		'sources' : [],
		'redrawID' : null,
		'frameRate' : 30,
		'showLocation' : false,
		'sort' : 'chaos',
		'categories' : 'type'
	};
	var methods = {

		// init method
		init : function(options) {
			if(options) {
				settings = $.extend(settings, options);
			}

			settings.polaroids = [];

			// Setup the polaroid stack
			for(var person in settings.sources) {
					var image = new Image();
					image.src = settings.sources[person]['location'] + '/' + settings.sources[person]['name'] + '.jpg';

					settings.polaroids[person] = Object.create(Polaroid);
					settings.polaroids[person].init({
						'text' : settings.sources[person]['name'],
						'path' : settings.sources[person]['location'],
						'uid' : settings.sources[person]['uid'],
						'image' : image,
						'source' : settings.sources[person]
					}, this);
			}

			// the zoom and info panels are dependant on the scale of the primary canvas
			this.polaroidStack('setupZoom');

			// Setup the canvas rendering environment
			// Ideally redraw should only be called on interval if there's actual mouse activity.
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
		setupZoom : function() {
			// setup the canvas where a zoomed polaroid will display
			settings.zoomPanel.hide();
			settings.zoomPanel.css('left', (this.width() / 3.2 - settings.zoomPanel.width() / 2) - 10);
			settings.zoomPanel.css('top', (this.height() / 2 - settings.zoomPanel.height() / 2));
			settings.zoomPanel[0].setAttribute('width', settings.polaroids[0].getZoomWidth());
			settings.zoomPanel[0].setAttribute('height', settings.polaroids[0].getZoomHeight());

			// setup the info panel where extra information about a polariod will display
			settings.infoPanel.hide();
			settings.infoPanel.width(300);
			settings.infoPanel.height(360);
			settings.infoPanel.css('left', this.width() / 3.2 - settings.infoPanel.width() / 2 + 260);
			settings.infoPanel.css('top', this.height() / 2 - settings.infoPanel.height() / 2 - 10);
		},
		/*
		 * Look throught the stack and workout if any polaroid overlaps a point on the canvas
		 */
		sight : function(pointX, offsetX, pointY, offsetY) {
			for(var person = settings.polaroids.length - 1; person >= 0; person--) {
				if(settings.polaroids[person].isVisible()) {
					if(settings.polaroids[person].isTarget(pointX, offsetX, pointY, offsetY)) {
						return person;
					}
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
			settings.polaroids[settings.target].rotate(Math.floor(Math.random() * 8) - 4);

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
			settings.sortOrder.bind('click', function(event) {
				$('#canvas').polaroidStack('sortOrder');
			});
			settings.sortChaos.bind('click', function(event) {
				$('#canvas').polaroidStack('sortChaos');
			});			
			if(settings.sort == 'order') {
				settings.sortOrder.removeClass('disabled');
				settings.sortChaos.removeClass('disabledunsel');
			}
			else {
				settings.sortChaos.removeClass('disabled');
				settings.sortOrder.removeClass('disabledunsel');
			}
		},
		/*
		 * Remove the sort events without showing them as disabled
		 */
		sortEventsSilence : function() {
			settings.sortOrder.unbind('click');
			settings.sortChaos.unbind('click');
		},
		/*
		 * Remove the sort events
		 */
		sortEventsDisable : function() {
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
		},
		/*
		 * Recalculates and redraws depending on the sort algorithm being used
		 */
		resize : function() {
			this.polaroidStack('setupZoom');

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
			window.clearInterval(settings.sortID);

			settings.sortOrder.addClass('selected');
			settings.sortChaos.removeClass('selected');

			if(settings.sort == 'order') {
				for(var person in settings.polaroids) {
					settings.polaroids[person].rotate(Math.floor(Math.random() * 8) - 4);
				}
			}
			else {
				this.unbind('mousemove.hover');
				this.unbind('mousedown.info');
				this.polaroidStack('sortEventsSilence');

				// reorder if categories are available
				if(settings.polaroids[0].settings.source[settings.categories]) {
					settings.polaroids.sort(function(a,b) {
						var aName = a.settings.source[settings.categories];
						var bName = b.settings.source[settings.categories];
						var cName = a.settings.source['name'];
						var dName = b.settings.source['name'];
					
						if(aName < bName) return -1;
						if(aName > bName) return 1;
						if(cName < dName) return -1;
						if(cName > dName) return 1;
					});
				}
	
				var paddingLeft = 10;
				var paddingTop = 50;
				var typesCount = Math.floor(this.width()/settings.polaroids[0].settings.width);
				var leftoverLeft = Math.floor((this.width()%(typesCount*settings.polaroids[0].settings.width))/(typesCount+1));
				var spacing = Math.floor((this.width()-(paddingLeft*2))/typesCount);
				var count=1;
				var line=1;
				for(var person in settings.polaroids) {
					if(count%(typesCount+1) == 0) {
						line++;
						count=1;
					}
					var pointX = ((settings.polaroids[0].settings.width+leftoverLeft)*count)+(paddingLeft/2);
					var offsetX = settings.polaroids[0].settings.width/2;
					var pointY = (settings.polaroids[0].settings.height*line)+paddingTop;
					var offsetY = settings.polaroids[0].settings.height/2;
	
					settings.polaroids[person].settings.newX = pointX - offsetX - settings.polaroids[person].settings.width / 2;
					settings.polaroids[person].settings.newY = pointY - offsetY - settings.polaroids[person].settings.width / 2;
	
					count++;
				}
	
				settings.sortFrame = 0;
				settings.sortID = setInterval((function(self) {
					return function() {
						self.polaroidStack('sortAnimation');
					};
				})(this), 1000 / settings.frameRate);
				settings.sort = 'order';
			}
		},
		/*
		 * Moves the polaroids into a random grouping
		 */
		sortChaos : function(event) {
			window.clearInterval(settings.sortID);

			this.unbind('mousemove.hover');
			this.unbind('mousedown.info');
			this.polaroidStack('sortEventsSilence');

			settings.sortChaos.addClass('selected');
			settings.sortOrder.removeClass('selected');

			for(var person in settings.polaroids) {
				settings.polaroids[person].settings.newX = Math.floor(Math.random() * (this.width() - (180 + 20)));
				settings.polaroids[person].settings.newY = (Math.floor(Math.random() * (this.height() - 250))) + 50;
			}
			
			settings.sortFrame = 0;
			settings.sortID = setInterval((function(self) {
				return function() {
					self.polaroidStack('sortAnimation');
				};
			})(this), 1000 / settings.frameRate);
			settings.sort = 'chaos';
		},
		sortAnimation : function() {
			var totalSortFrames = 10;

			if(settings.sortFrame <= totalSortFrames) {
				for(var person in settings.polaroids) {
					settings.polaroids[person].dodge(this, settings.sortFrame, totalSortFrames);
				}
				settings.sortFrame++;
			}
			else {
				for(var person in settings.polaroids) {
					settings.polaroids[person].setStart();
					settings.polaroids[person].setCache();
				}

				window.clearInterval(settings.sortID);
				settings.sortID = null;
				settings.sortFrame = 0;
				settings.target = -1;
				this.bind('mousemove.hover', function(event) {
					$('#'+this.id).polaroidStack('hover', event);
				});

				this.polaroidStack('sortEventsEnable');
			}
		},
		clearIntervals : function() {
			window.clearInterval(settings.sortID);
			window.clearInterval(settings.zoomID);
		},
		/*
		 * Handles the zoom in to see the polaroid better
		 */
		info : function(event) {
			this.unbind('mousemove.hover');
			this.unbind('mousedown.info');
			this.polaroidStack('sortEventsDisable');

			settings.target = this.polaroidStack('reorder', settings.target);
			
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
				settings.polaroids[settings.target].zoomIn(this, settings.zoomFrame, totalZoomFrames);
				settings.zoomFrame++;
			}
			else {
				// setup the zoomed polaroid inside its own canvas - helps with the layering
				// info panel allows the contents to be selectable, add a form, anything
				var ctx = settings.zoomPanel[0].getContext('2d');
				ctx.clearRect(0, 0, settings.zoomPanel.width(), settings.zoomPanel.height());
				settings.polaroids[settings.target].drawAt(false, ctx, settings.zoomPanel.width() / 2, settings.zoomPanel.height() / 2);
				settings.polaroids[settings.target].display(false);
				this.polaroidStack('updateInfo', settings.polaroids[settings.target].settings.source);
				$(settings.oneClickSelect).bind('click', function(e) {
   					$(this).selectText();
				});
				settings.infoPanel.show('slide');
				settings.zoomPanel.show();
				
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
			settings.polaroids[settings.target].display(true);
			var ctx = this[0].getContext('2d');
			settings.polaroids[settings.target].draw(false, ctx);
			settings.infoPanel.hide();
			settings.zoomPanel.hide();

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
				settings.polaroids[settings.target].zoomOut(this, settings.zoomFrame, totalZoomFrames);
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
					var checkPerson = false;
					for(var detail in settings.polaroids[person].settings.source) {
						if(settings.polaroids[person].settings.source[detail].toLowerCase().match(string.toLowerCase())) {
							checkPerson = true;
						}
					}
					if(!checkPerson) {
						settings.polaroids[person].display(false);
					}
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
				if(settings.polaroids[person].isVisible()) {
					if(person == settings.target) {
						settings.polaroids[person].draw(true, ctx);
					} else {
						settings.polaroids[person].draw(false, ctx);
					}
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
			for(var person in settings.source) {
				delete settings.sources[person];
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
