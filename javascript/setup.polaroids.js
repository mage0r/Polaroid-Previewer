(function($) {
	// Resize an object to fit the window
	$.fn.liquidLayout = function() {
		this.attr({
			width : window.innerWidth - 6,
			height : window.innerHeight - 6
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
		$('#polaroid-previewer').liquidLayout().polaroidStack('resize');
	});

	$(document).ready(function() {
		$('#polaroid-previewer').liquidLayout().polaroidStack(sources, {
			'oneClickSelect' : '.selectableField',
			'sortOrder' : $('#sort-order'),
			'sortChaos' : $('#sort-chaos')
		});

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