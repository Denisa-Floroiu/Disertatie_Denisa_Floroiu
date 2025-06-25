<?php
require 'connection_db.php';
header('Content-Type: application/json');
header('Content-Type: application/json');
date_default_timezone_set('Europe/Bucharest');
$now = date('Y-m-d H:i:s');
$id = $_POST['id'] ?? null;
$email = $_POST['email'] ?? '';
$rfid = $_POST['rfid_code'] ?? '';
$pin = $_POST['pin_code'] ?? '';
$password = $_POST['password'] ?? null;

if (!$id || !$email) {
  echo json_encode(['success' => false, 'error' => 'Date lipsă']);
  exit();
}
$stmt = $conn->prepare("SELECT role FROM utilizatori WHERE id = :id");
$stmt->execute(['id' => $id]);
$user = $stmt->fetch();

$isAdmin = $user && $user['role'] === 'admin';
try {
  if (!empty($password)) {
    $hashed = password_hash($password, PASSWORD_DEFAULT);

    if ($isAdmin) {
        $stmt = $conn->prepare("UPDATE utilizatori 
            SET email = :email, rfid_code = :rfid, pin_code = :pin, password = :pass,   update_at = :update_at 
            WHERE id = :id");
    } else {
        $stmt = $conn->prepare("UPDATE utilizatori 
            SET email = :email, rfid_code = :rfid, pin_code = :pin, password = :pass, must_change_password = true,   update_at = :update_at 
            WHERE id = :id");
    }

    $stmt->execute([
        'email' => $email,
        'rfid' => $rfid ?: null,
        'pin' => $pin ?: null,
        'pass' => $hashed,
        'id' => $id,
        'update_at' => $now
    ]);
  }
     else {
    $stmt = $conn->prepare("UPDATE utilizatori SET email = :email, rfid_code = :rfid, pin_code = :pin,   update_at = :update_at  WHERE id = :id");
    $stmt->execute([
      'email' => $email,
      'rfid' => $rfid ?: null,
      'pin' => $pin ?: null,
      'id' => $id,
      'update_at' => $now
    ]);
  }

  echo json_encode(['success' => true]);
} catch (PDOException $e) {
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
