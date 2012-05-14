<?php
/*
 * This is the list of directories you want Polaroid Previewer to scrape for photos. Often it'll be
 * just one directory, but if you want to categorise the photos in any way it can be convenient to
 * store them in multiple directories that are themselves searchable and optionally listed in the more 
 * information area for each photo.
 */
$polaroidDirectory = array('polaroids');

/*
 * This is the repository you want Polaroid Previewer to scrape for more information about each photo.
 * To connect to LDAP simply replace the below line with this and include your ldap connection details:
 *
 * $polaroidRepository = new LDAPAuth('ldap://ldap.hostname/', 'ou=foo,dc=bar,dc=com', true, false);
 */
$polaroidRepository = new DBAuth('localhost', 'polaroids', 'polaroids', 'abc123', 'polaroids');
?>