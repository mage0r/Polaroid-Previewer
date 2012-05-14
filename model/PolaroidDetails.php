<?php
/*
 * This class gets information from two places:
 *  Image Directories
 *   Firstly it gets the primary list of polaroids from the polaroids image
 *   directory. It supports having multiple polaroids directories if so needed.
 *   To add a new polaroid or delete one it's a simple matter of adding or 
 *   removing the photo from the respective directory.
 *
 *  LDAP or DB Details
 *   Secondly it attempts to connect to either an LDAP server or DB server
 *   to aquire the details of each polaroid based on the name on the image file.
 *   Connecting to a server isn't critical, it'll work if a connection cannot be
 *   established. Just means the details are a little sparse.
 */
include('model/LDAPAuth.php');
include('model/DBAuth.php');
 
class PolaroidDetails {
	private $paths = array();
	private $names = array();

	public function __construct($paths, $auth=null) {
		$this->paths = $paths;
		$this->loadFromImages();
		if($auth) {
			$this->loadFromSource($auth);
		}
	}

	private function loadFromImages() {
		foreach($this->paths as $path) {
			if ($handle = opendir($path)) {
				while (false !== ($file = readdir($handle))) {
					if(strstr($file, '.jpg')) {
						$name = str_replace('.jpg','',$file);
						$this->names[$name] = array();
						$this->names[$name]['location'] = $path;
					}
				}
			}
		}
	}

	/*
	 * Accepts an LDAPAuth or DBAuth object and retrieves the details based
	 * on the query string passed in.
	 */
	public function loadFromSource($auth) {
		if($auth->isConnected()) {
			foreach($this->names as $name=>$val) {
				$this->names[$name] = array_merge($this->names[$name],$auth->lookup($name));
			}
		} 
	}

	/*
	 * Takes the php array of polaroids and turns it into something Javascript
	 * can understand.
	 */
	public function drawJavascriptObjects() {
		$count = 0;
		$output = '';
		foreach($this->names as $name=>$arr) {
			$output .= "sources[$count] = {";
			$output .= "name: \"$name\"";
			if(strlen($name) > 0) {
				foreach($this->names[$name] as $key=>$val) {
					if($key != 'name') {
						$output .= ", $key: \"".str_replace("\r\n","<br/>",addslashes($val))."\"";
					}
				}
			}
			$count++;
			$output .= "};\n";
		}
		return $output;
	}
}
