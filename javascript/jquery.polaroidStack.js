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
		'showLocation' : false
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
						'image' : image
					}, this);
			}

			// setup the canvas where a zoomed polaroid will display
			settings.zoomPanel.hide();
			settings.zoomPanel.css('left', (this.width() / 3.2 - settings.zoomPanel.width() / 2) - 10);
			settings.zoomPanel.css('top', (this.height() / 2 - settings.zoomPanel.height() / 2) - 28);
			settings.zoomPanel[0].setAttribute('width', settings.polaroids[0].getZoomWidth());
			settings.zoomPanel[0].setAttribute('height', settings.polaroids[0].getZoomHeight());

			// setup the info panel where extra information about a polariod will display
			settings.infoPanel.hide();
			settings.infoPanel.width(300);
			settings.infoPanel.height(360);
			settings.infoPanel.css('left', this.width() / 3.2 - settings.infoPanel.width() / 2 + 260);
			settings.infoPanel.css('top', this.height() / 2 - settings.infoPanel.height() / 2 - 10);

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
			
			// Support chaining
			return this;
		},
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
		 * reorder the target polaroid to the top of the stack
		 */
		reorder : function(target) {
			var temp = settings.sources[target];
			settings.sources.push(temp);
			settings.sources.splice(target, 1);
			
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
		},
		/*
		 * Allows the user to move a selected polaroid around on the canvas
		 */
		drag : function(event) {
			settings.polaroids[settings.target].move(event.pageX, this[0].offsetLeft, event.pageY, this[0].offsetTop);
		},
		/*
		 * Handles the zoom in to see the polaroid better
		 */
		info : function(event) {
			this.unbind('mousemove.hover');
			this.unbind('mousedown.info');
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
				ctx.clearRect(0, 0, $('#canvas2').width(), $('#canvas2').height());
				settings.polaroids[settings.target].drawAt(false, ctx, settings.zoomPanel.width() / 2, settings.zoomPanel.height() / 2);
				settings.polaroids[settings.target].display(false);
				this.polaroidStack('updateInfo', settings.sources[settings.target]);
				$(settings.oneClickSelect).bind('click', function(e) {
   					$(this).selectText();
				});
				settings.infoPanel.show('slide');
				settings.zoomPanel.show();
				
				window.clearInterval(settings.zoomID);
				settings.zoomID = null;
				settings.zoomFrame = 0;
				this.bind('mousedown.infoOut', function(event) {
					$('#'+this.id).polaroidStack('infoOut', event);
				});
			}
		},
		updateInfo : function(target) {
			var contents = '';
			for(var output in target) {
				if(settings.showLocation || (!settings.showLocation && output != 'location')) {
					contents += "<p><span class=\"title\" id=\""+output+"_title\">"+output.substr(0,1).toUpperCase()+output.substr(1,output.length)+"</span> <span id=\""+output+"\" class=\"selectableField\">"+target[output]+"</span></p>";
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
				this.bind('mousemove.hover', function(event) {
					$('#'+this.id).polaroidStack('hover', event);
				});
			}
		},
		search : function(string) {
			this.polaroidStack('showAll');
			if(string.length > 0) {
				for(var person in settings.sources) {
					var checkPerson = false;
					for(var detail in settings.sources[person]) {
						if(settings.sources[person][detail].toLowerCase().match(string.toLowerCase())) {
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
			window.clearInterval(settings.zoomID);

			$(settings.oneClickSelect).unbind('click');
			for(var person in settings.polaroids) {
				settings.polaroids[person].destroy();
				delete settings.polaroids[person];
			}
			for(var set in settings) {
				delete settings[set];
			}
			this.unbind();
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