/**
 * @author Sarah Simmonds
 */

var Polaroid = {
	// init method
	init : function(options, elem) {
		this.settings = {
			'coordX' : Math.floor(Math.random() * (elem.width() - (180 + 20))),
			'coordY' : (Math.floor(Math.random() * (elem.height() - 250))) + 50,
			'rotation' : Math.floor(Math.random() * 8) - 4,
			// original w:160, h:172
			'width' : 180,
			'height' : 194,
			'image' : null,
			'path' : 'images',
			'display' : true,
			'fade' : 1,
			'zoom' : 2.5,
			'imagedrawn' : false,
			'usingCookies' : true,
			'text' : 'text goes here',
			'source' : null
		};
		this.settings.height = Math.round(this.settings.width * 1.075);
		this.settings = $.extend(this.settings, options);

		// If cookies have been set, retrieve them
		if(this.getCookie('x')) {
			this.settings.coordX = parseInt(this.getCookie('x'));
		}
		if(this.getCookie('y')) {
			this.settings.coordY = parseInt(this.getCookie('y'));
		}

		// We need to know exactly how to draw the polaroid no matter what scale it renders at
		// Hence the use of ratios based on the width and height that was passed in
		this.ratios = {
			'width' : 0.843,
			'height' : 0.709,
			'widthToHeight' : 1.107,
			'textToHeight' : 0.909,
			'textSize' : 0.06,
			'padding' : 0
		};
		this.ratios.padding = Math.round((this.settings.width - (this.settings.width * this.ratios.width)) / 2);
		
		this.setStart();
		this.setCache();
	},
	// check the polaroid isn't hidden
	isVisible : function() {
		return this.settings.display;
	},
	// check if we've rendered at this point
	isTarget : function(pointX, offsetX, pointY, offsetY) {
		if(pointX < this.settings.coordX + this.settings.width + offsetX 
		&& pointX > this.settings.coordX + offsetX 
		&& pointY < this.settings.coordY + this.settings.height + offsetY 
		&& pointY > this.settings.coordY + offsetY) {
			return true;
		}
		return false;
	},
	// check if the info button is rendered at this point
	isInfo : function(pointX, offsetX, pointY, offsetY) {
		// 148 and 138 is highly specific to the default width. Will break on any other width, needs to be more dynamic.
		if(pointX < this.settings.coordX + 148 + offsetX + 20 
		&& pointX > this.settings.coordX + 138 + offsetX - 3 
		&& pointY < this.settings.coordY + offsetY + 15 
		&& pointY > this.settings.coordY + offsetY - 3) {
			return true;
		}
		return false;
	},
	// we need to remember the original size/location of the polaroid before it gets zoomed
	setStart : function() {
		this.settings.startWidth = this.settings.width;
		this.settings.startHeight = this.settings.height;
		this.settings.startX = this.settings.coordX;
		this.settings.startY = this.settings.coordY;
	},
	// prepare the cache canvas - we get a huge performance improvement by caching the polaroid render
	setCache : function() {
		$('body').append('<canvas id="polaroidObject-'+this.settings.path+'-'+this.settings.text+'" width="'+(this.settings.width+10)+'" height="'+(this.settings.height+10)+'" style="display:none;"></canvas>');
		this.settings.cache = document.getElementById('polaroidObject-'+this.settings.path+'-'+this.settings.text);

		// initialize canvas object in IE browsers
		if (window.G_vmlCanvasManager) {
			this.settings.cache = window.G_vmlCanvasManager.initElement(this.settings.cache);
		}

		// render the first cache
		this.cache(this.settings.cache.getContext('2d'));
	},
	// cookie the x:y location so visitors don't have to keep reorganising polaroids every visit
	setCookies : function() {
		if(this.settings.usingCookies) {
			$.cookie(this.settings.text+'#x', this.settings.coordX, {expires: 7});
			$.cookie(this.settings.text+'#y', this.settings.coordY, {expires: 7});
		}
		return true;
	},
	getCookie : function(which) {
		if(this.settings.usingCookies && ($.cookie(this.settings.text+'#'+which) != null)) {
			return $.cookie(this.settings.text+'#'+which);
		}
		else {
			return false;
		}
	},
	display : function(display) {
		this.settings.display = display;
	},
	move : function(pointX, offsetX, pointY, offsetY) {
		this.settings.coordX = pointX - offsetX - this.settings.width / 2;
		this.settings.coordY = pointY - offsetY - this.settings.height / 2;

		// save the new location so we can return to it after another operation, eg. zoom
		this.setStart();
	},
	rotate : function(rotate) {
		this.settings.rotation = rotate;
	},
	dodge : function(elem, frame, totalFrames) {
		var locateX = this.settings.newX;
		var locateY = this.settings.newY;
		
		this.settings.coordX = this.easeOut(this.settings.coordX, frame, totalFrames*3, this.settings.coordX - locateX);
		this.settings.coordY = this.easeOut(this.settings.coordY, frame, totalFrames*3, this.settings.coordY - locateY);

		//this.cache(this.settings.cache.getContext('2d'));
	},
	// determines how much room to make for a fully zoomed in polaroid, accounting for blur and rotation
	getZoomWidth : function(rotate) {
		return Math.round((this.settings.width * this.settings.zoom) + (this.settings.width * this.settings.zoom * 0.15));
	},
	// determines how much room to make for a fully zoomed in polaroid, accounting for blur and rotation
	getZoomHeight : function(rotate) {
		return Math.round((this.settings.height * this.settings.zoom) + (this.settings.height * this.settings.zoom * 0.15));
	},
	zoomIn : function(elem, frame, totalFrames) {
		var locateX = elem.width() / 3.2 - (this.settings.startWidth * this.settings.zoom / 2);
		var locateY = elem.height() / 2 - (this.settings.startHeight * this.settings.zoom / 2);

		this.settings.width = this.easeIn(this.settings.startWidth, frame, totalFrames, this.settings.startWidth * this.settings.zoom - this.settings.startWidth);
		this.settings.height = this.easeIn(this.settings.startHeight, frame, totalFrames, this.settings.startHeight * this.settings.zoom - this.settings.startHeight);
		this.settings.coordX = this.easeOut(this.settings.startX, frame, totalFrames, this.settings.startX - locateX);
		this.settings.coordY = this.easeOut(this.settings.startY, frame, totalFrames, this.settings.startY - locateY);
		this.settings.cache.setAttribute('width',Math.round(this.settings.width + (this.settings.width * 0.0625)));
		this.settings.cache.setAttribute('height',Math.round(this.settings.height + (this.settings.width * 0.0625)));

		// recalculate padding ratio
		this.ratios.padding = Math.round((this.settings.width - (this.settings.width * this.ratios.width)) / 2);

		this.cache(this.settings.cache.getContext('2d'));
	},
	zoomOut : function(elem, frame, totalFrames) {
		var locateX = elem.width() / 3.2 - (this.settings.startWidth * this.settings.zoom / 2);
		var locateY = elem.height() / 2 - (this.settings.startHeight * this.settings.zoom / 2);

		this.settings.width = this.easeOut(this.settings.startWidth * this.settings.zoom, frame, totalFrames, this.settings.startWidth * this.settings.zoom - this.settings.startWidth);
		this.settings.height = this.easeOut(this.settings.startHeight * this.settings.zoom, frame, totalFrames, this.settings.startHeight * this.settings.zoom - this.settings.startHeight);
		this.settings.coordX = this.easeIn(locateX, frame, totalFrames, this.settings.startX - locateX);
		this.settings.coordY = this.easeIn(locateY, frame, totalFrames, this.settings.startY - locateY);
		this.settings.cache.setAttribute('width',this.settings.width + (this.settings.width * 0.0625));
		this.settings.cache.setAttribute('height',this.settings.height + (this.settings.width * 0.0625));

		// recalculate padding ratio
		this.ratios.padding = Math.round((this.settings.width - (this.settings.width * this.ratios.width)) / 2);

		this.cache(this.settings.cache.getContext('2d'));
	},
	easeIn : function(offset, thisInterval, totalIntervals, totalDifference) {
		return offset + Math.sqrt(thisInterval / totalIntervals) * totalDifference;
	},
	easeOut : function(offset, thisInterval, totalIntervals, totalDifference) {
		return offset - Math.sqrt(thisInterval / totalIntervals) * totalDifference;
	},
	strmatch : function(string) {
		if(!this.settings.text.toLowerCase().match(string.toLowerCase()) && !this.settings.path.toLowerCase().match(string.toLowerCase())) {
			return false;
		}
		return true;
	},
	// render the polaroid, override the x,y coords - this is good for rendering on a secondary canvas eg 'info'
	drawAt : function(target, ctx, x, y) {
		var tempX = this.settings.coordX;
		var tempY = this.settings.coordY;
		this.settings.coordX = x - (this.settings.width / 2);
		this.settings.coordY = y - (this.settings.height / 2);
		
		this.draw(target, ctx);

		this.settings.coordX = tempX;
		this.settings.coordY = tempY;
	},
	// render changes and translations to the polaroid - usually done on the primary canvas
	draw : function(target, ctx) {
		ctx.save();
		ctx.translate(this.settings.coordX + this.settings.width / 2, this.settings.coordY + this.settings.height / 2);
		ctx.rotate(Math.PI / 180 * this.settings.rotation);
		ctx.translate(-this.settings.width / 2, -this.settings.height / 2);

		// render from cache
		ctx.drawImage(this.settings.cache, 0, 0);

		// cache the photo when it's available
		if(!this.settings.imagedrawn && this.settings.image && this.settings.image.complete) {
			this.cache(this.settings.cache.getContext('2d'));
			this.settings.imagedrawn = true;
		}

		// render the polaroid black backing and fade effect (shows when photos take a while to load)
		if(!this.settings.imagedrawn || (this.settings.imagedrawn && this.settings.fade > 0)) {
			var gradient = ctx.createLinearGradient(50, 180, -10, 20);
			gradient.addColorStop(1, 'rgba(112,112,112,'+this.settings.fade+')');
			gradient.addColorStop(0, 'rgba(26,26,26,'+this.settings.fade+')');
			ctx.fillStyle = gradient;
			ctx.fillRect(this.ratios.padding+2, this.ratios.padding+2, Math.round(this.settings.width * this.ratios.width), Math.round(this.settings.height * this.ratios.height));

			// fade the black backing out
			if (this.settings.imagedrawn) {
				this.settings.fade -= 0.05;
			}
		}

		if(target && (this.settings.startWidth == this.settings.width)) {
			ctx.font = "8pt Segoe Print";
			ctx.fillStyle = "#000000";
			ctx.fillText('>info', this.settings.width - this.ratios.padding - this.ratios.padding - 13, this.ratios.padding);
		}

		ctx.restore();
	},
	// render the polaroid - we cache this as it contains some of the most cpu-intensive HTML5 Canvas operations 
	cache : function(ctx) {
		ctx.save();
		// make sure we're clearing all the render, even if it's been zoomed before
		ctx.clearRect(0, 0, this.settings.width*this.settings.zoom+10, this.settings.height*this.settings.zoom+10);
		
		// chrome v13 is a bit touchy about rasterising the top/left edges. 
		// Need to shift the polaroid 1px on the cache canvas so it captures a sliver of drop shadow and rasterises it before it gets rotated
		ctx.translate(1, 1);

		//Create the shadow (position and blur is proportional to size of the polaroid)
		ctx.shadowOffsetX = this.settings.width * 0.0125;
		ctx.shadowOffsetY = this.settings.height * 0.0125;
		ctx.shadowBlur = this.settings.width * 0.025;
		ctx.shadowColor = "rgba(0,0,0,0.4)";

		//Create the polaroid paper
		var gradient = ctx.createLinearGradient(50, 180, -10, 20);
		gradient.addColorStop(0, '#FFFFFF');
		gradient.addColorStop(1, '#E6E1E1');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, this.settings.width, this.settings.height);

		//Turn off the shadow
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.shadowBlur = 0;
		ctx.shadowColor = "transparent";

		// Create the polaroid photo
		if(this.settings.image && this.settings.image.complete) {
			// Have to crop whatever the original scale and ratio was to fit without distorting the image
			// This has problems when the original photo is vertical rather than horizontal
			ctx.drawImage(this.settings.image, Math.round((this.settings.image.width - this.settings.image.height * this.ratios.widthToHeight) / 2), 0, Math.round(this.settings.image.height * this.ratios.widthToHeight), this.settings.image.height, this.ratios.padding, this.ratios.padding, Math.round(this.settings.width * this.ratios.width), Math.round(this.settings.height * this.ratios.height));
		}
		
		// Create the annotation - calibri font might be more cross platform compatible
		ctx.font = (this.settings.width * this.ratios.textSize) + "pt Segoe Print";
		ctx.fillStyle = "#2d2dd4";
		ctx.fillText(this.settings.text, this.ratios.padding, Math.round(this.settings.height * this.ratios.textToHeight));

		ctx.restore();
	},
	destroy : function() {
		for(var set in this.settings) {
			delete this.settings[set];
		}
	}
};