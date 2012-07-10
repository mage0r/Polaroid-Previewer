/**
 * @author Sarah Simmonds
 */

var Polaroid = {
	// init method
	init : function(options, width, height) {
		this.settings = {
			'id' : 'polaroid-previewer',
			'rotation' : Math.floor(Math.random() * 8) - 4,
			'display' : true,
			'fade' : 1,
			'zoom' : 2.5,
			'imagedrawn' : false,
			'usingCookies' : (typeof $.cookie == 'undefined') ? false : true,
			'source' : [],
			'style' : 'ClassicPolaroid',
			'showLocation' : false,
			'showExtension' : false,
			'showName' : false,
			'annotate' : true,
			// Fonts to use in fallback order. 
			// Bradley is Mac, Marker is iOS, Segoe is PC, Verdana is everywhere 
			'fontFamilies' : ['Bradley Hand ITC TT', 'Marker Felt', 'Segoe Print', 'Verdana'],
			'fontSizes' : [3,3,0,0]
		};
		this.settings = $.extend(this.settings, options);

		// begin downloading the image
		this.initImage();
		// setup the style of the polaroid
		this.initStyle(width, height);
		// load the cookies if there are any
		this.initCookies();
		// choose a font based on what's available
		this.initFont();
		// remember where the polaroid goes
		this.saveLocation();
		// prepare the cache canvas (improves speed)
		this.initCache();
	},
	
	// start downloading the photo for this polaroid
	initImage : function() {
		this.settings.image = new Image();
		this.settings.image.src = this.settings.source.location + '/' + this.settings.source.name + '.' + this.settings.source.extension;
	},
	// apply style and start at a random location
	initStyle : function(width, height) {
		this['style'+this.settings.style]();
		this.settings.coordX = Math.floor(Math.random() * (width - this.settings.width));
		this.settings.coordY = Math.floor(Math.random() * (height - this.settings.height + 10));
	},
	// prepare the cache canvas - we get a huge performance improvement by caching the polaroid render
	initCache : function() {
		$('body').append('<canvas id="'+this.settings.id+'-polaroidObject-'+this.settings.source.location+'-'+this.settings.source.name+'" width="'+(this.settings.width+10)+'" height="'+(this.settings.height+10)+'" style="display:none;"></canvas>');
		this.settings.cache = document.getElementById(this.settings.id+'-polaroidObject-'+this.settings.source.location+'-'+this.settings.source.name);

		// initialize canvas object in IE browsers
		if (window.G_vmlCanvasManager) {
			this.settings.cache = window.G_vmlCanvasManager.initElement(this.settings.cache);
		}

		// render the first cache
		this.cache(this.settings.cache.getContext('2d'));
	},
	// Determine which font to use based on what's available in the local environment.
	// Unfortunately we don't have css style font fallback when drawing on HTML5 Canvas so we'll just have to make do.
	initFont : function() {
		// prepare the font detection suite
		font.setup();
		for(var x=this.settings.fontFamilies.length-1; x>=0; x--) {
			if(font.isInstalled(this.settings.fontFamilies[x])) {
				this.settings.fontFamily = this.settings.fontFamilies[x];
				this.settings.fontSize = this.settings.fontSizes[x];
			}
		}
	},
		
	/*
	 * Cookie functions
	 */
	initCookies : function() {
		// If cookies have been set, retrieve them
		if(this.getCookie('x')) {
			this.settings.coordX = parseInt(this.getCookie('x'));
		}
		if(this.getCookie('y')) {
			this.settings.coordY = parseInt(this.getCookie('y'));
		}
	},
	// cookie the x:y location so visitors don't have to keep reorganising polaroids every visit
	setCookies : function() {
		if(this.settings.usingCookies) {
			$.cookie(this.settings.id+'#'+this.settings.source.name+'#x', this.settings.coordX, {expires: 7});
			$.cookie(this.settings.id+'#'+this.settings.source.name+'#y', this.settings.coordY, {expires: 7});
		}
		return true;
	},
	getCookie : function(which) {
		if(this.settings.usingCookies && ($.cookie(this.settings.id+'#'+this.settings.source.name+'#'+which) != null)) {
			return $.cookie(this.settings.id+'#'+this.settings.source.name+'#'+which);
		}
		else {
			return false;
		}
	},

	/*
	 * style functions
	 */
	// classic polaroid style
	styleClassicPolaroid : function() {
		this.settings.width = 180;
		this.settings.height = Math.round(this.settings.width * 1.075);
		this.settings.annotate = true;
		this.settings.showName = false;
		// We need to know exactly how to draw the polaroid no matter what scale it renders at
		// Hence the use of ratios for objects inside the polaroid relative to the width and height that was passed in
		this.ratios = {
			'width' : 0.91,
			'height' : 0.75,
			'textSize' : 0.08
		};
		this.styleRatiosCalculate();
	},
	// minimal landscape photo style
	styleMinLandscape : function() {
		this.settings.width = 240;
		this.settings.height = Math.round(this.settings.width * 0.78);
		this.settings.annotate = false;
		this.settings.showName = true;
		this.ratios = {
			'width' : 0.927,
			'height' : 0.9
		};
		this.styleRatiosCalculate();
	},
	// minimal portrait photo style
	styleMinPortrait : function() {
		this.settings.height = 240;
		this.settings.width = Math.round(this.settings.height * 0.78);
		this.settings.annotate = false;
		this.settings.showName = true;
		this.ratios = {
			'height' : 0.927,
			'width' : 0.9
		};
		this.styleRatiosCalculate();
	},
	styleRatiosCalculate : function() {
		this.ratios.padding = Math.round((this.settings.width - (this.settings.width * this.ratios.width)) / 2);
		this.ratios.widthToHeightRatio = (this.settings.width * this.ratios.width) / (this.settings.height * this.ratios.height);
		this.ratios.heightToWidthRatio = (this.settings.height * this.ratios.height) / (this.settings.width * this.ratios.width);
	},

	/*
	 * getters and setters
	 */
	getWidth : function() {
		return this.settings.width;
	},
	getHeight : function() {
		return this.settings.height;
	},
	// determines how much room to make for a fully zoomed in polaroid, accounting for blur and rotation
	getZoomWidth : function(rotate) {
		return Math.round((this.settings.width * this.settings.zoom) + (this.settings.width * this.settings.zoom * 0.15));
	},
	// determines how much room to make for a fully zoomed in polaroid, accounting for blur and rotation
	getZoomHeight : function(rotate) {
		return Math.round((this.settings.height * this.settings.zoom) + (this.settings.height * this.settings.zoom * 0.15));
	},
	// check the polaroid isn't hidden
	isVisible : function() {
		return this.settings.display;
	},
	setZoomed : function(state) {
		this.settings.zoomed = state;
	},
	isZoomed : function(state) {
		return this.settings.zoomed;
	},
	setZooming : function(state) {
		this.settings.zooming = state;
	},
	isZooming : function(state) {
		return this.settings.zooming;
	},
	// check if we've rendered at this point
	isTarget : function(pointX, offsetX, pointY, offsetY) {
		if(this.isVisible()) {
			if(pointX < this.settings.coordX + this.settings.width + offsetX 
			&& pointX > this.settings.coordX + offsetX 
			&& pointY < this.settings.coordY + this.settings.height + offsetY 
			&& pointY > this.settings.coordY + offsetY) {
				return true;
			}
			return false;
		}
	},
	// check if the info button is rendered at this point
	isInfo : function(pointX, offsetX, pointY, offsetY) {
		if(pointX < this.settings.coordX + offsetX + this.settings.width - this.ratios.padding 
		&& pointX > this.settings.coordX + offsetX + this.ratios.padding 
		&& pointY < this.settings.coordY + offsetY + (this.settings.height * this.ratios.height) + this.ratios.padding
		&& pointY > this.settings.coordY + offsetY + this.ratios.padding) {
			return true;
		}
		return false;
	},
	// we need to remember the original size/location of the polaroid before it gets zoomed
	saveLocation : function() {
		this.settings.startWidth = this.settings.width;
		this.settings.startHeight = this.settings.height;
		this.settings.startX = this.settings.coordX;
		this.settings.startY = this.settings.coordY;
	},
	// need to remember where the mouse is relative to the polaroid for dragging purposes
	saveMouse : function(x,y) {
		this.settings.startMX = x;
		this.settings.startMY = y;
	},
	
	/*
	 * functions for relocating the polaroid
	 */
	// define a new random location for this polaroid to finish an animation at
	setRandomAnimationCoords : function(maxRight, maxBottom) {
		this.settings.finishX = Math.floor(Math.random() * (maxRight - this.settings.width));
		this.settings.finishY = (Math.floor(Math.random() * (maxBottom - this.settings.height + 10)));
		this.settings.finishR = this.rotateRandom();
		if(this.isZoomed()) {
			this.settings.startX = this.settings.finishX;
			this.settings.startY = this.settings.finishY;
		}
	},
	// define a new allocated location for this polaroid to finish an animation at
	setAnimationCoords : function(pointX, pointY) {
		this.settings.finishX = pointX - (this.settings.startWidth/2) - (this.settings.startWidth/2);
		this.settings.finishY = pointY - (this.settings.startHeight/2) - (this.settings.startHeight/2);
		this.settings.finishR = this.rotateRandom();
		if(this.isZoomed()) {
			this.settings.startX = this.settings.finishX;
			this.settings.startY = this.settings.finishY;
		}
	},
	// define a new rotation for this polaroid to finish an animation at
	setAnimationRotate : function() {
		this.settings.finishX = this.settings.coordX;
		this.settings.finishY = this.settings.coordY;
		this.settings.finishR = this.rotateRandom();
	},
	// define new coordinates for this polaroid to load into immedietally
	setCoords : function(pointX, pointY) {
		this.settings.coordX = pointX - (this.settings.startWidth/2) - (this.settings.startWidth/2);
		this.settings.coordY = pointY - (this.settings.startHeight/2) - (this.settings.startHeight/2);
	},
	
	/*
	 * Info functions
	 */
	getInfo : function(which) {
		if(this.settings.source[which] != null) {
			return this.settings.source[which];
		}
		else if(which) {
			return false;
		}
		return this.settings.source;
	},
	formatInfo : function() {
		var contents = '';
		for(var output in this.settings.source) {
			if((this.settings.showLocation || (!this.settings.showLocation && output != 'location'))
			&& (this.settings.showExtension || (!this.settings.showExtension && output != 'extension'))
			&& (this.settings.showName || (!this.settings.showName && output != 'name'))
			) {
				contents += "<p><span class=\"title\" id=\""+output+"_title\">"+output.substr(0,1).toUpperCase()+output.substr(1,output.length).replace('_',' ')+"</span> <span id=\""+output+"\" class=\"polaroidStack-polaroidContent\">"+this.settings.source[output]+"</span></p>";
			}
		}
		return contents;
	},
	searchInfo : function(string) {
		for(var detail in this.settings.source) {
			if(this.settings.source[detail].toLowerCase().match(string)) {
				return true;
			}
		}
		return false;
	},
	
	/*
	 * drawing and animation functions
	 */
	display : function(display) {
		this.settings.display = display;
	},
	drag : function(pointX, offsetX, pointY, offsetY) {
		this.settings.coordX = pointX - offsetX - (this.settings.startMX - this.settings.startX);
		this.settings.coordY = pointY - offsetY - (this.settings.startMY - this.settings.startY);
	},
	rotate : function() {
		this.settings.rotation = this.rotateRandom();
	},
	rotateRandom : function() {
		return Math.floor(Math.random() * 8) - 4;
	},
	nudge : function(frame, totalFrames) {
		if(!this.isZoomed()) {
			this.settings.coordX = this.easeOut(this.settings.coordX, frame, totalFrames*3, this.settings.coordX - this.settings.finishX);
			this.settings.coordY = this.easeOut(this.settings.coordY, frame, totalFrames*3, this.settings.coordY - this.settings.finishY);
			this.settings.rotation = this.easeOut(this.settings.rotation, frame, totalFrames*3, this.settings.rotation - this.settings.finishR);
		}
	},
	zoomIn : function(locateX, locateY, frame, totalFrames, zoomCanvas, offsetLeft, offsetTop) {
		this.settings.width = this.easeIn(this.settings.startWidth, frame, totalFrames, this.settings.startWidth * this.settings.zoom - this.settings.startWidth);
		this.settings.height = this.easeIn(this.settings.startHeight, frame, totalFrames, this.settings.startHeight * this.settings.zoom - this.settings.startHeight);
		this.settings.coordX = this.easeOut(this.settings.startX, frame, totalFrames, this.settings.startX - locateX);
		this.settings.coordY = this.easeOut(this.settings.startY, frame, totalFrames, this.settings.startY - locateY);
		this.resetCache();
		this.zoomPanel(zoomCanvas, offsetLeft, offsetTop);
	},
	zoomOut : function(locateX, locateY, frame, totalFrames, zoomCanvas, offsetLeft, offsetTop) {
		this.settings.width = this.easeOut(this.settings.startWidth * this.settings.zoom, frame, totalFrames, this.settings.startWidth * this.settings.zoom - this.settings.startWidth);
		this.settings.height = this.easeOut(this.settings.startHeight * this.settings.zoom, frame, totalFrames, this.settings.startHeight * this.settings.zoom - this.settings.startHeight);
		this.settings.coordX = this.easeIn(locateX, frame, totalFrames, this.settings.startX - locateX);
		this.settings.coordY = this.easeIn(locateY, frame, totalFrames, this.settings.startY - locateY);
		this.resetCache();
		this.zoomPanel(zoomCanvas, offsetLeft, offsetTop);
	},
	zoomPanel : function(canvas, offsetLeft, offsetTop) {
		canvas.css('top', this.settings.coordY+offsetTop-18);
		canvas.css('left', this.settings.coordX+offsetLeft-18);
		canvas.attr({
			'width' : this.settings.cache.getAttribute('width'),
			'height' : this.settings.cache.getAttribute('height')
		});
		this.drawAt(false, canvas[0].getContext('2d'), 20, 20);
	},
	resetCache : function() {
		this.settings.cache.setAttribute('width',this.settings.width + (this.settings.width * 0.14));
		this.settings.cache.setAttribute('height',this.settings.height + (this.settings.width * 0.14));

		// recalculate padding ratio
		this.ratios.padding = (this.settings.width - (this.settings.width * this.ratios.width)) / 2;
		this.cache(this.settings.cache.getContext('2d'));
	},
	easeIn : function(offset, thisInterval, totalIntervals, totalDifference) {
		return offset + Math.sqrt(thisInterval / totalIntervals) * totalDifference;
	},
	easeOut : function(offset, thisInterval, totalIntervals, totalDifference) {
		return offset - Math.sqrt(thisInterval / totalIntervals) * totalDifference;
	},
	// render the polaroid, override the x,y coords - this is good for rendering on a secondary canvas eg 'zoom'
	drawAt : function(target, ctx, x, y) {
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		var tempX = this.settings.coordX;
		var tempY = this.settings.coordY;
		var tempZ = this.settings.zoomed;

		this.settings.coordX = x;
		this.settings.coordY = y;
		this.settings.zoomed = false;
		
		this.draw(target, ctx);

		this.settings.coordX = tempX;
		this.settings.coordY = tempY;
		this.settings.zoomed = tempZ;
	},
	// render changes and translations to the polaroid - usually done on the primary canvas
	draw : function(target, ctx) {
		if(this.isZoomed()) {
			return;
		}
		
		ctx.save();
		if(!this.isVisible()) {
			ctx.globalAlpha = 0.1;
		}
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
				this.settings.fade = this.settings.fade.toFixed(2) - 0.05;
			}
		}
		if(this.settings.fade == 0) {
			this.settings.fade = -1;
			$('#'+this.settings.id).trigger('imageLoad.draw');
		}

		if(target && !this.isZooming()) {
			ctx.fillStyle = 'rgba(0,0,0,0.7)';
			ctx.fillRect(this.ratios.padding+1, this.ratios.padding+1, Math.round(this.settings.width * this.ratios.width), Math.round(this.settings.height * this.ratios.height));

			// magnifying glass icon
			ctx.beginPath();
			ctx.arc(this.settings.width/2,(this.settings.height*this.ratios.height/2)+this.ratios.padding-4,10,20,Math.PI*2,true);
			ctx.strokeStyle = "#cccccc";
			ctx.lineWidth = 3.5;
			ctx.stroke();
			ctx.lineTo(this.settings.width/2+10,(this.settings.height*this.ratios.height/2)+this.ratios.padding+16);
			ctx.stroke();
			ctx.closePath();
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
			var cropHeight = this.settings.image.height-1; // -1px to correct for an iphone safari bug
			var cropWidth = this.settings.image.width;
			var cropXOffset = 0;

			// If the image is more landscaped than the polaroid viewport, center it horizontally and crop left and right edges
			if(this.ratios.widthToHeightRatio <= this.settings.image.width / this.settings.image.height) {
				cropWidth = this.settings.image.height * this.ratios.widthToHeightRatio;
				cropXOffset = (this.settings.image.width - this.settings.image.height * this.ratios.widthToHeightRatio) / 2;
			}
			// If the image is more portrait than the polariod, increase the height enough so the width will fit and align to the top
			else {
				cropHeight = cropWidth * this.ratios.heightToWidthRatio;
			}

			// Have to crop whatever the original scale and ratio was to fit without distorting the image
			// This has problems when the original photo is vertical rather than horizontal
			ctx.drawImage(this.settings.image,cropXOffset,0,cropWidth,cropHeight,this.ratios.padding,this.ratios.padding,this.settings.width * this.ratios.width,this.settings.height * this.ratios.height);
		}
		
		if(this.settings.annotate) {
			// Create the annotation
			ctx.font = ((this.settings.width * this.ratios.textSize) + this.settings.fontSize) + "px "+this.settings.fontFamily;
			ctx.fillStyle = "#2d2dd4";
			// Place the annotation in the center of the blank space left over below the image
			ctx.fillText(this.settings.source.name, this.ratios.padding, this.settings.height - ((this.settings.height - (this.settings.height*this.ratios.height) + (this.ratios.padding*2)) / 2.2) + ((this.settings.width * this.ratios.textSize) + this.settings.fontSize));
		}

		ctx.restore();
	},
	destroy : function() {
		for(var set in this.settings) {
			delete this.settings[set];
		}
	}
};

/*
 * @author Remy Sharp
 *
 * Client side font detection described on his blog here:
 * http://remysharp.com/2008/07/08/how-to-detect-if-a-font-is-installed-only-using-javascript/
 */

var font = (function () {
    var test_string = 'mmmmmmmmmwwwwwww';
    var test_font = '"Comic Sans MS"';
    var notInstalledWidth = 0;
    var testbed = null;
    var guid = 0;
    
    return {
        // must be called when the dom is ready
        setup : function () {
            if ($('#fontInstalledTest').length) return;

            $('head').append('<' + 'style> #fontInstalledTest, #fontTestBed { position: absolute; left: -9999px; top: 0; visibility: hidden; } #fontInstalledTest { font-size: 50px!important; font-family: ' + test_font + ';}</' + 'style>');
            
            
            $('body').append('<div id="fontTestBed"></div>').append('<span id="fontInstalledTest" class="fonttest">' + test_string + '</span>');
            testbed = $('#fontTestBed');
            notInstalledWidth = $('#fontInstalledTest').width();
        },
        
        isInstalled : function(font) {
            guid++;
        
            var style = '<' + 'style id="fonttestStyle"> #fonttest' + guid + ' { font-size: 50px!important; font-family: ' + font + ', ' + test_font + '; } <' + '/style>';
            
            $('head').find('#fonttestStyle').remove().end().append(style);
            testbed.empty().append('<span id="fonttest' + guid + '" class="fonttest">' + test_string + '</span>');
                        
            return (testbed.find('span').width() != notInstalledWidth);
        }
    };
})();