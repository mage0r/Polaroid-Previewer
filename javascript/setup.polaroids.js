(function($) {
	// Resize an object to fit the window
	$.fn.liquidLayout = function() {
		this.attr({
			width : window.innerWidth - 3,
			height : window.innerHeight - 3
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
	
	$(window).resize(function() {
		// safari on iphone wrongly triggers a window resize event when the content gets too wide
		if(!$('#polaroid-previewer').polaroidStack('isTouchDevice')) {
			$('#polaroid-previewer').liquidLayout().polaroidStack('resize');
		}
	});

	$(document).ready(function() {
		$('#polaroid-previewer').liquidLayout().polaroidStack(sources, {
			'oneClickSelect' : '.selectableField',
			'sortOrder' : $('#sort-order'),
			'sortChaos' : $('#sort-chaos')
		});
		// scroll past the address bar on mobile devices. Regex for 'mobi' because opera for mobile uses this truncation
		/mobi/i.test(navigator.userAgent) && !location.hash && setTimeout(function () {
			if (!pageYOffset) window.scrollTo(0, 0);
		}, 1000);

		// these should probably be encapsulated in a search plugin
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
})(jQuery);