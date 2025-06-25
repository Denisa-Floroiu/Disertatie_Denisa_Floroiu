<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['email'])) {
    echo json_encode(['success' => false]);
    exit;
}

echo json_encode([
    'success' => true,
    'role' => $_SESSION['role']
]);
