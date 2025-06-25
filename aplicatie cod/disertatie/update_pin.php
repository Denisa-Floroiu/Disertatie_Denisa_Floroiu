<?php
session_start();
require 'connection_db.php';
header('Content-Type: application/json');

// Verificăm dacă există datele necesare
$user_id = $_POST['user_id'] ?? null;
$new_pin = $_POST['pin_code'] ?? null;

// Validare: toate câmpurile necesare
if (!$user_id || !$new_pin) {
    echo json_encode(['success' => false, 'error' => 'Date lipsă.']);
    exit;
}

// Validare: PIN exact 4 cifre
if (!preg_match('/^\d{4}$/', $new_pin)) {
    echo json_encode(['success' => false, 'error' => 'PIN-ul trebuie să aibă exact 4 cifre.']);
    exit;
}

try {
    // Verifică dacă e același PIN ca anterior (opțional)
    $stmt = $conn->prepare("SELECT pin_code FROM utilizatori WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'error' => 'Utilizator inexistent.']);
        exit;
    }

    if ($user['pin_code'] === $new_pin) {
        echo json_encode(['success' => false, 'error' => 'PIN-ul este deja setat ca acesta.']);
        exit;
    }

    // Update PIN
    $update = $conn->prepare("UPDATE utilizatori SET pin_code = ?, update_at = NOW() WHERE id = ?");
    $update->execute([$new_pin, $user_id]);

    echo json_encode(['success' => true]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Eroare DB: ' . $e->getMessage()]);
}
