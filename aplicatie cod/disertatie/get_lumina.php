<?php
require 'connection_db.php';

$stmt = $pdo->query("SELECT valoare FROM lumina_digitala ORDER BY timestamp DESC LIMIT 1");
$row = $stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode([
  "valoare" => $row["valoare"] ?? null
]);
?>
