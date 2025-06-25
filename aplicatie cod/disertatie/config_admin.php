<?php
require 'connection_db.php';
session_start();
date_default_timezone_set('Europe/Bucharest');
$createdAt = date('Y-m-d H:i:s');
// Verifică dacă există deja un admin
$stmt = $conn->query("SELECT COUNT(*) FROM utilizatori WHERE role = 'admin'");
$adminExists = $stmt->fetchColumn();

    if ($adminExists > 0) {
        header('Location: public/login.html');
        exit();
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? null;
    $passwordInput = $_POST['password'] ?? null;
    $confirmPassword = $_POST['confirm_password'] ?? null;


    if (!$email || !$passwordInput || !$confirmPassword) {
        die(" Toate câmpurile sunt obligatorii.");
    }

    if ($passwordInput !== $confirmPassword) {
       echo "Parolele nu coincid."; 
      exit;
    }

    $password = password_hash($passwordInput, PASSWORD_DEFAULT);

    // Generează un PIN admin random (ex: între 1000–9999)
    $adminPinPlain = strval(random_int(1000, 9999));
    $adminPinHash = password_hash($adminPinPlain, PASSWORD_DEFAULT);

    // Salvează în DB
    $stmt = $pdo->prepare("INSERT INTO utilizatori (email, password, admin_pin, role, created_at) VALUES (?, ?, ?, 'admin', ?)");

    if ($stmt->execute([$email, $password, $adminPinHash, $createdAt]) ) {
        // Salvăm pin-ul în sesiune, ca să îl afișăm o singură dată
        header("Location: index.html?success=1&pin=$adminPinPlain&email=$email&role=admin");
        exit();
    } else {
        echo " Eroare la creare!";
    }
}
?>
