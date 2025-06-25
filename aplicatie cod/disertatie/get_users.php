<?php
require 'connection_db.php';

$stmt = $conn->query("SELECT id, email FROM utilizatori WHERE role = 'user'");
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($users);
