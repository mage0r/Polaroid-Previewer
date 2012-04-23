<?php
error_reporting(E_ALL);
ini_set('display_errors','off');

include('model/LDAPAuth.php');
include('model/DBAuth.php');
include('model/PolaroidDetails.php');

// To connect to LDAP simply replace the below line with this and include the ldap connection details:
// $polaroids = new PolaroidDetails(array('polaroids'), new LDAPAuth('ldap://ldap.hostname/', 'ou=foo,dc=bar,dc=com', true, false));
$polaroids = new PolaroidDetails(array('polaroids'), new DBAuth('localhost', 'polaroids')); 
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html>
<head>
	<title>Polaroid Previewer</title>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=0.7, maximum-scale=0.7, user-scalable=0"/>
	<link rel="stylesheet" type="text/css" href="main.css">
	<script type="text/javascript">
	var sources = [];
	<?=$polaroids->drawJavascriptObjects();?>
	</script>
	<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js" type="text/javascript"></script>
	<script type="text/javascript" src="javascript/Polaroid.js"></script>
	<script type="text/javascript" src="javascript/jquery.polaroidStack.js"></script>
	<script type="text/javascript" src="javascript/jquery.cookie.js"></script>
	<script type="text/javascript" src="javascript/setup.polaroids.js"></script>
</head>

<body>
	<canvas id="canvas" width="500" height="500">
		<br/><br/>
		<div style="background-color:white;"><br/>
			&nbsp;&nbsp;Sorry, your browser does not support <strong>HTML5 Canvas</strong>.<br/><br/>
			&nbsp;&nbsp;Works best in the latest browsers<br/>
			&nbsp;&nbsp;<strong>Internet Explorer 9</strong>, <strong>Firefox 6</strong> and <strong>Chrome 13</strong>.<br/><br/>
			&nbsp;&nbsp;If you can't dance on the cutting edge in your spare time, when	can you?<br/><br/>
		</div>
	</canvas>
	<div id="infoPolaroid">
		<p><span class="title" id="email_title">Email address</span> <span class="selectableField" id="email">firstname.lastname@hitwise.com</span></p>
	</div>
	<canvas id="zoomPolaroid" width="500" height="500"></canvas>
	<div id="header">
		<div id="intro">
			<strong>Polaroid Previewer</strong>
		</div>
		<center>
		<div id="sort">
			<button id="sort-order">Order</button><button id="sort-chaos">Chaos</button>
		</div>
		</center>
		<div id="search">
			<span id="search-icon"></span><input id="search-field" type="text"/><span id="search-cancel"></span>
		</div>
	</div>
	<div id="footer">
		photos courtesy of http://www.sxc.hu
	</div>
</body>
</html>
