<?php
session_start();
require 'connection_db.php';

if (isset($_POST['email'], $_POST['parolaVeche'], $_POST['parolaNoua'])) {
    $email = $_POST['email'];
    $parolaVeche = $_POST['parolaVeche'];
    $parolaNoua = $_POST['parolaNoua'];

    $stmt = $pdo->prepare("SELECT password FROM utilizatori WHERE email = :email");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user) {
        echo "Utilizatorul nu a fost găsit.";
        exit;
    }

    
    if (!password_verify($parolaVeche, $user['password'])) {
        echo "Parola veche este incorectă.";
        exit;
    }

    $nouHash = password_hash($parolaNoua, PASSWORD_DEFAULT);

    $update = $pdo->prepare("UPDATE utilizatori SET password = :password WHERE email = :email");
    if ($update->execute([':password' => $nouHash, ':email' => $email])) {
        echo "Parola a fost schimbată cu succes.";
    } else {
        echo "Eroare la actualizare.";
    }
} else {
    echo "Date lipsă.";
}
?>
