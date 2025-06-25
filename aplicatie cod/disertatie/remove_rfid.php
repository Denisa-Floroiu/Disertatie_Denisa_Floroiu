<?php
session_start();
require 'connection_db.php';


$id = $_POST['user_id'] ?? null;

if (!$id) {
    echo json_encode(['success' => false, 'error' => 'ID invalid']);
    exit;
}

try {
    //  Ia codul RFID curent al utilizatorului
    $stmt = $pdo->prepare("SELECT rfid_code FROM utilizatori WHERE id = ?");
    $stmt->execute([$id]);
    $rfid = $stmt->fetchColumn();

    if ($rfid) {
        //  Inserează în tabela de așteptare
        $insert = $pdo->prepare("INSERT INTO rfid_asteptare (rfid_code) VALUES (?)");
        $insert->execute([$rfid]);
    }

    //  Șterge codul din tabela utilizatori
    $update = $pdo->prepare("UPDATE utilizatori SET rfid_code = NULL WHERE id = ?");
    $update->execute([$id]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
