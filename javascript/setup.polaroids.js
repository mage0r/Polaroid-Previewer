(function($) {

	$(document).ready(function() {
		$('#polaroid-previewer').liquidLayout().polaroidStack({
			'sources' : sources,
			'sortOrder' : $('#sort-order'),
			'sortChaos' : $('#sort-chaos'),
		});

		// scroll past the address bar on mobile devicesn
		/mobi/i.test(navigator.userAgent) && !location.hash && setTimeout(function () {
			if (!pageYOffset) window.scrollTo(0, 0);
		}, 1000);
		
		//CUSTOM selectText so one click will highlight all text in info panel (except on touch screen devices)
		if(!('ontouchstart' in window)) {
			$('#polaroid-previewer').bind('polaroidZoomIn', function() {
				$('.polaroidStack-polaroidContent').bind('click', function(e) {
		   			$(this).selectText();
				});
			});
			$('#polaroid-previewer').bind('polaroidZoomOut', function() {
				$('.selectableField').unbind('click');
			});
		
		}
		//CUSTOM layout so the canvas always resizes to the window unless it needs to be larger		$(window).resize(function() {
			// safari on iphone wrongly triggers a window resize event when the content gets too wide
			if(!('ontouchstart' in window)) {
				$('#polaroid-previewer').liquidLayout().polaroidStack('resize');
			}
		});
		$(window).bind('orientationchange', function() {
			$('#polaroid-previewer').liquidLayout().polaroidStack('resize');
		});
		$('#polaroid-previewer').bind('switchOrderToChaos', function() {
			$(this).liquidLayout();
		});

		//CUSTOM search
		$('#search-field').attr('value','');
		$('#search-field').bind('keyup.search', function(event) {
			$('#polaroid-previewer').polaroidStack('search', event.target.value);
			$('#search-cancel').removeClass('disabled');
			$('#search-cancel').bind('mouseup.searchCancel', function(event) {
				$('#search-field').attr('value','');
				$('#polaroid-previewer').polaroidStack('showAll', event);
				$('#search-cancel').addClass('disabled');
				$('#search-cancel').unbind();
			});
		});
	});

	// Resize an object to fit the window
	$.fn.liquidLayout = function() {
		this.attr({
			width : window.innerWidth - 3 - parseInt(this.css('margin-left')) - parseInt(this.css('padding-left')) - parseInt(this.css('margin-right')) - parseInt(this.css('padding-right')),
			height : window.innerHeight - 3 - parseInt(this.css('margin-top')) - parseInt(this.css('padding-top')) - parseInt(this.css('margin-bottom')) - parseInt(this.css('padding-bottom'))
		});
		return this;
	};

	// Allows text to be selectable with a single click
	// eg. email address, full name, description
	$.fn.selectText = function() {
	    if ($.browser.msie) {
	        var range = document.body.createTextRange();
	        range.moveToElementText(this[0]);
	        range.select();
	    } 
	    else if ($.browser.mozilla || $.browser.opera) {
	        var selection = window.getSelection();
	        var range = document.createRange();
	        range.selectNodeContents(this[0]);
	        selection.removeAllRanges();
	        selection.addRange(range);
	    } 
	    else if ($.browser.safari) {
	        var selection = window.getSelection();
	        selection.setBaseAndExtent(this[0], 0, this[0], 1);
	    }
	    return this;
	};
})(jQuery);