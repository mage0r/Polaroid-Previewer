# Polaroid Previewer #

![Polaroid Previewer Screenshot v1.2](http://chixor.net/demo/polaroid-previewer/polaroid-previewer.png)

* Display photos from a directory in HTML5 Canvas.
* Option for user to place photos in a random mess overlapping each other or in order.
* Allow user to move photos around the screen and zoom in.
* Built with jQuery and CSS3.
* Online demo available at [chixor.net/demo/polaroid-previewer/](http://chixor.net/demo/polaroid-previewer/)

## Add/Remove ##

### Hello World ###
To quickly and easily see your images in Polaroid Previewer make sure the demo code is located on a php enabled server. Then simply copy paste images (jpg, jpeg, png or gif) into the polaroids/ directory. Next time you load index.html it'll load your images right in. Voila! To remove them you can also remove the image files from the polaroids/ directory.

### Don't want to use polaroids/ directory? ###
If you want to use a different directory or even multiple directories, go to the settings php file and update the directory array:

  /settings.inc.php
  $polaroidDirectory = array('a_different_directory','another_directory','../foo_bar');

## Info Fields ##
There's currently two ways to populate the information panel that slides out when you click the magnifying glass icon on each polaroid:

### LDAP ###
You can connect to an LDAP server to collect whatever data is available using the polaroid image names as the search variable. This works great in an office that uses LDAP authentication and has staff photos stored in a directory somewhere.

To get LDAP records on your polaroids, you just need to connect to LDAP by uncommenting this line in the file below and providing the domain, username, password and search string:

	/settings.inc.php
	$polaroidRepository = new LDAPAuth('ldap://my_ldap.hostname/', 'ou=foo,dc=bar,dc=com', true, false);

### MySQL ###
You can also connect to a MySQL database to populate your data. This will scrap all fields in a given table, assuming the polaroid names are available in a field called 'name'.

To get MySQL records on your polaroids, you just need to connect to the database by uncommenting this line in the file below and providing the domain, database, username, password and table:

	/settings.inc.php
	$polaroidRepository = new DBAuth('my_domain', 'my_database', 'my_username', 'my_password', 'my_table');

You can quickly create the demo database by running this SQL:

	/DATABASE.txt

## Layout: Not So Random ##
The layout of the polaroids is random on first view. If you move or reorder any them then it caches the new location of those polaroids so they'll stay put next page load. Handy if you're trying to sort through the photos.

## Sorting ##
There's two ways to automatically sort the polaroids: order and chaos. Chaos will randomly push the polaroids around whereas order will arrange them in a predefined order.

### Default ###
The system automatically defaults to chaos on first load. Subsequent loads are based on what the user last used. You can change this by adding an option to polaroidStack:

	/javascript/setup.polaroids.js
	$(document).ready(function() {
		$('#polaroid-previewer').polaroidStack(sources, {
			'sort' : 'order' // otherwise will default to chaos.
		});
	});

A special exception is made for small screens. For screens that cannot fit more than two polaroids at once (think mobile devices) and when there are more than two polaroids being loaded, the system will default to order as the screen is too small for chaos to be much use (best case scenario the overlap average is 50%).

### Custom Ordered Sort ###
Order will sort alphabetically based on the name of each polaroid. However if you connect to LDAP or MySQL for more details about each polaroid (see Info Fields above) you can define a custom field to sort by:

	/javascript/setup.polaroids.js
	$(document).ready(function() {
		$('#polaroid-previewer').polaroidStack(sources, {
			'categories' : 'my_custom_field' // needs to be identical to the field name in either LDAP or MySQL
		});
	});

Order will always fall back to alphabetical by polaroid name if two polaroids have identical values in your custom field.

## Performance ##
Works best in the latest browsers IE9, FF6, Chrome13. Surprisingly, in that order! Chrome doesn't like fading in each polaroid individually (not sure why) so it seems slow/unresponsive on first load. The more polaroids the longer it takes. May need to fix this or add a loading icon.

It seems to run ok on Dual Core but chugs on slower processors (laptop). The biggest impact on performance is doing the HTML5 Canvas drawing, which unfortunately has to happen several times a second to respond to mouse movement (I will get to this in a sec). Some of the biggest performance offenders in HTML5 Canvas are:

* Gradients
* Drop shadows
* Text
* Rotations

(all the pretty things this system is using to make it look good!)

I've implemented caching on the polaroids. This works by drawing the polaroid on a hidden canvas once then drawing that image onto the primary canvas every redraw. This has significantly improved the performance, however it could do with more tweaking. Currently it still performs the rotation post-cache, there's no reason why this couldn't be cached as well, it'll just be a bit fiddly to implement.

The redraw happens on a setInterval (ie, constantly). However the actual interface changes only happen on mouse events. So in theory you could add a performance boost by removing the generic setInterval and only run it in the mouse events, however this would only improve performance when the user isn't doing anything.