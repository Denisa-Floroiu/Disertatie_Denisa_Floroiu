<?php
require 'connection_db.php';
header('Content-Type: application/json');
date_default_timezone_set('Europe/Bucharest');
$createdAt = date('Y-m-d H:i:s');

//  Preluare date
$email = trim($_POST['email'] ?? '');
$password = trim($_POST['password'] ?? '');
$rfid = trim($_POST['rfid_code'] ?? '');
$pin = trim($_POST['pin_code'] ?? '');
$role = $_POST['role'] ?? 'user';
$status = $_POST['status'] ?? 'inactive';

//  Verificare câmpuri obligatorii
if (empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'error' => 'Email și parola sunt obligatorii.']);
    exit();
}

// Verifică dacă emailul există deja
$checkEmail = $conn->prepare("SELECT COUNT(*) FROM utilizatori WHERE email = ?");
$checkEmail->execute([$email]);
if ($checkEmail->fetchColumn() > 0) {
    echo json_encode(['success' => false, 'error' => 'Acest email este deja folosit.']);
    exit();
}

// Verifică dacă RFID-ul există deja (doar dacă e completat)
if (!empty($rfid)) {
    $checkRFID = $conn->prepare("SELECT COUNT(*) FROM utilizatori WHERE rfid_code = ?");
    $checkRFID->execute([$rfid]);
    if ($checkRFID->fetchColumn() > 0) {
        echo json_encode(['success' => false, 'error' => 'Acest cod RFID este deja înregistrat.']);
        exit();
    }
}

//  Criptează parola
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

//  Pregătește inserarea
try {
    $stmt = $conn->prepare("INSERT INTO utilizatori (email, password, rfid_code, pin_code, role, status, must_change_password, created_at)VALUES (:email, :password, :rfid, :pin, :role, :status, true, :created_at)");


$stmt->execute([
    'email' => $email,
    'password' => $hashedPassword,
    'rfid' => !empty($rfid) ? $rfid : null,
    'pin' => !empty($pin) ? $pin : null,
    'role' => $role,
    'status' => $status,
    'created_at' => $createdAt
]);


    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    //  În caz de eroare SQL (ex: rfid duplicat)
    if ($e->getCode() === '23505') {
        echo json_encode(['success' => false, 'error' => 'Valoare duplicată (email sau RFID).']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Eroare la salvare: ' . $e->getMessage()]);
    }
}
