<?php
require 'connection_db.php';

header('Content-Type: application/json'); 

$id = $_POST['id'] ?? null;
$status = $_POST['status'] ?? null;

if ($id && $status) {
    $stmt = $conn->prepare("UPDATE utilizatori SET status = :status WHERE id = :id");
    $stmt->execute(['status' => $status, 'id' => $id]);

    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false]);
}
