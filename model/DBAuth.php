<?php
class DBAuth {

	private $conn;
	private $isConnected;
	private $server;
	private $db;
	private $user;
	private $pass;
	private $table;

	public function __construct($server, $db, $user, $pass, $table) {
		$this->server = $server;
		$this->db = $db;
		$this->user = $user;
		$this->pass = $pass;
		$this->table = $table;

		$this->connect();
	}

	// Connecting to the DB
	private function connect() {
		$this->isConnected = false;

		$this->conn = mysql_connect($this->server,$this->user,$this->pass);
		if($this->conn) {
			mysql_select_db($this->db);
			$this->isConnected = true;
		}
	}

	public function isConnected() {
		return $this->isConnected;
	}

	public function lookup($name) {
		$details = array();
		$sr = mysql_query("select * from {$this->table} where name = '$name'");
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