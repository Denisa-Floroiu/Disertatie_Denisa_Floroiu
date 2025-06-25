<?php
require __DIR__ . '/../connection_db.php';


$sql = "SELECT * FROM history_logs ORDER BY timestamp ASC";
$stmt = $pdo->query($sql);
$logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($logs);
