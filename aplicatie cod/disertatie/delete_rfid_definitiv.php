<?php
require 'connection_db.php';
header("Content-Type: application/json");

$rfid_code = $_POST['rfid_code'] ?? '';

if (!$rfid_code) {
  echo json_encode(['success' => false, 'error' => 'Codul RFID este lipsă.']);
  exit;
}

try {
  $stmt = $conn->prepare("DELETE FROM rfid_asteptare WHERE rfid_code = ?");
  $stmt->execute([$rfid_code]);

  echo json_encode(['success' => true]);
} catch (PDOException $e) {
  echo json_encode(['success' => false, 'error' => 'Eroare DB: ' . $e->getMessage()]);
}
