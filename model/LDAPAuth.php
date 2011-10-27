<?php
class LDAPAuth {

	private $conn;
	private $isConnected;
	private $server;
	private $queryString;
	private $usingTSL;

	public function __construct($server, $query, $tsl, $checkCert) {
		$this->server = $server;
		$this->queryString = $query;
		$this->usingTSL = $tsl;

		// useful for error checking
		define('LDAP_OPT_DIAGNOSTIC_MESSAGE', 0x0032);
		
		// never check the server's certificate
		if(!$checkCert) {
			putenv('LDAPTLS_REQCERT=never');
		}

		if (!isset($_SERVER['PHP_AUTH_USER'])) {
			$this->basicAuth();
		}

		$this->connect();
	}

	// Connecting to LDAP
	private function connect() {
		$this->isConnected = false;

		// if the user didn't authenticate then don't bother connecting
		if(isset($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW'])) {
			$this->conn = ldap_connect($this->server) or die("Could not connect to $ldaphost");
			ldap_set_option( $this->conn, LDAP_OPT_PROTOCOL_VERSION, 3);
			ldap_set_option( $this->conn, LDAP_OPT_REFERRALS, 0);

			// We're using a secure TLS connection
			if($this->usingTSL) {
				if ( !@ldap_start_tls( $this->conn ) ) {
					return false;
				}
			}
		
			$bind = ldap_bind($this->conn, 'cn='.$_SERVER['PHP_AUTH_USER'].','.$this->queryString, $_SERVER['PHP_AUTH_PW']);
		
			// LDAP didn't accept username/password. Try again
			if (!$bind) {
				$this->basicAuth();
			}
			$this->isConnected = true;
		}
	}

	public function isConnected() {
		return $this->isConnected;
	}

	public function lookup($name) {
		$jt = array('uid','mail','title');
		$details = array();
		$sr = ldap_search($this->conn, $this->queryString, '(displayname='.$name.')',$jt);
		$entry = ldap_get_entries($this->conn, $sr);
		if(isset($entry[0])) {
			foreach($entry[0] as $key=>$row) {
				if(is_array($row)) {
					$details[$key] = $row[0];
				}
			}
		}
		return $details;
	}

	/*
	 * Basic Authentication is a very insecure way to get username/password.
	 * This should at *least* be implemented over an SSL connection.
	 */
	private function basicAuth() {
		header('WWW-Authenticate: Basic realm="Hitwise LDAP Authentication"');
		header('HTTP/1.0 401 Unauthorized');
		// if the user hits cancel on the basic authentication
		// then allow the rest of the page to work. It just means
		// LDAP isn't connected.
	}

}
