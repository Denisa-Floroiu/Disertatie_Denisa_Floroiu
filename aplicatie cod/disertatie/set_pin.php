<?php
session_start();
require 'connection_db.php';
header("Content-Type: application/json");

$pin = $_POST['pin_code'] ?? '';
$email = $_POST['email'] ?? null;
$role = $_POST['role'] ?? null;

// Validare PIN
if (!preg_match('/^\d{4}$/', $pin)) {
  echo json_encode(['success' => false, 'error' => 'PIN-ul trebuie să conțină exact 4 cifre.']);
  exit();
}

// Caută userul după email și rol
if (!$email || !$role) {
  echo json_encode(['success' => false, 'error' => 'Email și rol lipsesc.']);
  exit();
}

try {
  $stmt = $conn->prepare("SELECT id FROM utilizatori WHERE email = ? AND role = ?");
  $stmt->execute([$email, $role]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    echo json_encode(['success' => false, 'error' => 'Utilizatorul nu a fost găsit.']);
    exit();
  }

  $user_id = $user['id'];

  // Salvează PIN-ul
  $stmt = $conn->prepare("UPDATE utilizatori SET pin_code = ? WHERE id = ?");
  $stmt->execute([$pin, $user_id]);

  echo json_encode(['success' => true]);
} catch (PDOException $e) {
  echo json_encode(['success' => false, 'error' => 'Eroare DB: ' . $e->getMessage()]);
}
