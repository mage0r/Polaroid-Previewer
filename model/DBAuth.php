<?php
class DBAuth {

	private $conn;
	private $isConnected;
	private $server;
	private $queryString;

	public function __construct($server, $query) {
		$this->server = $server;
		$this->queryString = $query;

		$this->connect();
	}

	// Connecting to the DB
	private function connect() {
		$this->isConnected = false;

		$this->conn = mysql_connect('localhost','polaroids','abc123');
		if($this->conn) {
			mysql_select_db('polaroids');
			$this->isConnected = true;
		}
	}

	public function isConnected() {
		return $this->isConnected;
	}

	public function lookup($name) {
		$details = array();
		$sr = mysql_query("select * from polaroids where name = '$name'");
		while($row = mysql_fetch_assoc($sr)) {
			foreach($row as $key=>$value) {
				if($value) {
					$details[$key] = ucfirst($value);
				}
			}
		}

		return $details;
	}
}
