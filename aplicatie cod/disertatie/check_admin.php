<?php
require 'connection_db.php';

if (!$conn) {
    echo json_encode(['exists' => false, 'error' => 'no connection']);
    exit();
  }
$stmt = $conn->query("SELECT COUNT(*) FROM utilizatori WHERE role = 'admin'");
$adminCount = $stmt->fetchColumn();

echo json_encode(['exists' => $adminCount > 0]);
