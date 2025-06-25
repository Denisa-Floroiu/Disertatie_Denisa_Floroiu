<?php
require 'connection_db.php';

$stmt = $pdo->query("SELECT temperatura, umiditate FROM ambient ORDER BY timestamp DESC LIMIT 1");
$data = $stmt->fetch(PDO::FETCH_ASSOC);

header('Content-Type: application/json');
echo json_encode($data ?: []);
