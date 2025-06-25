<?php
session_start();
require 'connection_db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['user_id'] ?? null;

    if (!$id) {
        echo json_encode(['success' => false, 'error' => 'ID lipsă']);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM utilizatori WHERE id = ?");
    $success = $stmt->execute([$id]);

    echo json_encode(['success' => $success]);
} else {
    echo json_encode(['success' => false, 'error' => 'Doar POST permis']);
}
