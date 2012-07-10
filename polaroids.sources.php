<?php
/**
 * @author Sarah Simmonds
 * 
 * This file is called first and tells the Polaroid javascript object where to download the photos 
 * from and what information is available about them. It sets the scene for everything to build off of.
 * 
 * The php just creates a basic javascript array to hold all the information coming from database, 
 * LDAP, where ever.
 * 
 * Couple of ideas for improvement:
 * - The obvious drawback is this solution doesn't scale very well for directories holding many photos
 *   and lots of information about each. Although I haven't found a need for it yet, a better solution
 *   might be to ajax in the details when someone zooms into a polaroid.
 * 
 * - Is it worth loading this from JSON query instead of directly from a javascript file? There's 
 *   nothing particularly sensitive about the contents of this array that needs to be encrypted
 *   and it doesn't need to update dynamicly so I'm not sure it's necessary.
 */
header('Content-type: text/javascript');
include('model/PolaroidDetails.php');
include('settings.inc.php');

error_reporting(E_ALL);
ini_set('display_errors','off');

$polaroids = new PolaroidDetails($polaroidDirectory, $polaroidRepository); 
?>
<?=$polaroids->drawJavascriptObjects();?>