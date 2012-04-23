============================
POLAROID PREVIEWER
============================

== ADD/REMOVE ==
The system uses the photos in polaroids directory as the primary record. To add or remove a photo, you can simply add or remove it from the image directory.

I've noticed the javascript has a little trouble with vertical photos even though it should be scaling and cropping regardless of the original photo size and proportions. Haven't gotten around to addressing what's going wrong with drawImage. So just to be on the safe side try only add horizontal photos.

== PERFORMANCE ==
Works best in the latest browsers IE9, FF6, Chrome13. Surprisingly, in that order! Chrome doesn't like fading in each polaroid individually (not sure why) so it seems slow/unresponsive on first load. The more polaroids the longer it takes. May need to fix this or add a loading icon.

It seems to run ok on Dual Core but chugs on slower processors (laptop). The biggest impact on performance is doing the HTML5 Canvas drawing, which unfortunately has to happen several times a second to respond to mouse movement (I will get to this in a sec). Some of the biggest performance offenders in HTML5 Canvas are:

- gradients
- drop shadows
- text
- rotations
(all the pretty things this system is using to make it look good!)

I've implemented caching on the polaroids. This works by drawing the polaroid on a hidden canvas once then drawing that image onto the primary canvas every redraw. This has significantly improved the performance, however it could do with more tweaking. Currently it still performs the rotation post-cache, there's no reason why this couldn't be cached as well, it'll just be a bit fiddly to implement.

The redaw happens on a setInterval (ie, constantly). However the actual interface changes only happen on mouse events. So in theory you could add a performance boost by removing the generic setInterval and only run it in the mouse events, however this would only improve performance when the user isn't doing anything.

== INFO FIELDS ==
There's currently two way to populate the information panel that slides out when you click the '>info' link on each polaroid:

= LDAP =
I've written a class for authenticating to an LDAP server to collect whatever data is available using the polaroid image names to search. This works great in an office that uses LDAP authentication and the collection of staff photos is stored seperately from the intranet.

Set the username/password/LDAP details here: index.php

= DATABASE =
I've also written a simple database retrieval that searches a table for the image name and displays all available tuples.

Set the username/password/database here: model\DBAuth.php

== LAYOUT: NOT SO RANDOM ==
The layout of the polaroids is random on first view. If you move or reorder any them then it caches the new location of those polaroids so they'll stay put next page load. Handy if you're trying to sort through the photos.

== SORTING ==
There's now two sorts: order and chaos. Chaos will randomly push the polaroids around whereas order will put them in their designated spaces based on a sort.

The ordered sort is first based on alphabetical sort of categories if one is set at init, for example the demo has a 'type' column in the database and 'type' is defined as the category. After categories the polaroids are then sorted by name. 

I would like it to be much smarter about fitting all the polaroids on screen. Currently if there are too many polaroids they will disappear off screen. Ideally they either overlap until they all fit or the canvas grows in size to accommodate thus causing a page scroll (probably the better option for mobile).

== IDEA: TAGGING ==
The search feature is designed to be very flexible, it does a string search on all available fields. So it may be quite handy to implement searchable tags on photos.
