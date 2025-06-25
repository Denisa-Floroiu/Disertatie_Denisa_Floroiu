<?php
require 'connection_db.php';

$temperatura = $_POST['temperatura'] ?? null;
$umiditate = $_POST['umiditate'] ?? null;

if ($temperatura === null || $umiditate === null) {
  http_response_code(400);
  echo " Date lipsă";
  exit;
}

try {
  $stmt = $pdo->prepare("INSERT INTO ambient (temperatura, umiditate) VALUES (:t, :u)");
  $stmt->execute([
    ':t' => $temperatura,
    ':u' => $umiditate
  ]);
  echo " Inserat";
} catch (PDOException $e) {
  http_response_code(500);
  echo " Eroare: " . $e->getMessage();
}
