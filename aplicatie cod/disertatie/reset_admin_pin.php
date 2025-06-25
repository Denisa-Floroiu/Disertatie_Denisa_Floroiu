<?php
require 'connection_db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = $_POST['user_id'] ?? null;

    if (!$userId) {
        echo json_encode(["success" => false, "error" => "ID lipsă"]);
        exit;
    }

    //  Generează PIN random 4 cifre
    $plainPin = strval(random_int(1000, 9999));
    $hash = password_hash($plainPin, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("UPDATE utilizatori SET admin_pin = ?, update_at = NOW() WHERE id = ?");
    $ok = $stmt->execute([$hash, $userId]);

    if ($ok) {
        echo json_encode(["success" => true, "pin" => $plainPin]);
    } else {
        echo json_encode(["success" => false, "error" => "Eroare DB"]);
    }
}
