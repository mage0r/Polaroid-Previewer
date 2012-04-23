(function($) {
	// canvas object
	$.fn.liquidLayout = function() {
		this.attr({
			width : window.innerWidth - 6,
			height : window.innerHeight - 6
		});
	};

	// select text object
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
		$('#canvas').liquidLayout();
		$('#canvas').polaroidStack('resize');
	});

	$(document).ready(function() {
		$('#canvas').liquidLayout();
		$('#canvas').polaroidStack({
			'sources' : sources,
			'zoomPanel' : $('#zoomPolaroid'),
			'infoPanel' : $('#infoPolaroid'),
			'oneClickSelect' : '.selectableField',
			'sortOrder' : $('#sort-order'),
			'sortChaos' : $('#sort-chaos')
		});
	
		// these should probably be encapsulated in a search plugin
		$('#search-field').attr('value','');
		$('#search-field').bind('keyup.search', function(event) {
			$('#canvas').polaroidStack('search', event.target.value);
			$('#search-cancel').css('background-image','url(images/search-cancel.png)');
			$('#search-cancel').css('cursor','pointer');
			$('#search-cancel').bind('mouseup.searchCancel', function(event) {
				$('#search-field').attr('value','');
				$('#canvas').polaroidStack('showAll', event);
				$('#search-cancel').css('background-image','url(images/search-end.png)');
				$('#search-cancel').css('cursor','auto');
				$('#search-cancel').unbind();
			});
		});
	});
})(jQuery);