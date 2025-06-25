<?php
require 'connection_db.php';

$stmt = $conn->query("SELECT * FROM rfid_asteptare ORDER BY detected_at DESC");
$rfids = $stmt->fetchAll(PDO::FETCH_ASSOC);
$stmt = $conn->query("SELECT id, email FROM utilizatori WHERE role = 'user' and rfid_code is NULL");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);
header('Content-Type: application/json');
echo json_encode(["rfids" => $rfids, "users" => $users]);