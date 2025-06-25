<?php
session_start();
require 'connection_db.php';

// Verifică dacă utilizatorul este autentificat
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Nu ești autentificat.']);
    exit();
}

// Preia datele JSON trimise
$data = json_decode(file_get_contents('php://input'), true);
$newPassword = $data['password'] ?? '';

if (!$newPassword || strlen($newPassword) < 6) {
    echo json_encode(['success' => false, 'error' => 'Parola trebuie să aibă cel puțin 6 caractere.']);
    exit();
}

$userId = $_SESSION['user_id'];

try {

    // Preia parola veche hash-uită
    $stmt = $conn->prepare("SELECT password FROM utilizatori WHERE id = ?");
    $stmt->execute([$userId]);
    $oldHash = $stmt->fetchColumn();

    // Verifică dacă noua parolă coincide cu cea veche
    if (password_verify($newPassword, $oldHash)) {
        echo json_encode(['success' => false, 'error' => 'Noua parolă nu poate fi aceeași cu parola veche.']);
        exit();
    }
    // Hash-uiește parola nouă
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

    // Actualizează parola și resetează flag-ul must_change_password
    $stmt = $conn->prepare("UPDATE utilizatori SET password = ?, must_change_password = FALSE WHERE id = ?");
    $stmt->execute([$hashedPassword, $userId]);

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Eroare la actualizarea parolei.']);
}
