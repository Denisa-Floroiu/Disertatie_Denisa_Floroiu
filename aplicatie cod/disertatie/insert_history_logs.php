<?php
require 'connection_db.php';
$rfid_code = $_POST['rfid_code'] ?? null;
$pin = $_POST['pin'] ?? null;
$status = $_POST['status'] ??  null;

if (empty($rfid_code) || empty($status)) {
    http_response_code(400);
    echo json_encode(['error' => 'Lipsesc parametrii necesari (rfid_code, status).']);
    exit;
}
    // Căutăm emailul corespunzător din tabelul utilizatori
    $sql_user = "SELECT email FROM utilizatori WHERE rfid_code = :rfid_code LIMIT 1";
    $stmt_user = $pdo->prepare($sql_user);
    $stmt_user->execute([':rfid_code' => $rfid_code]);
    $user = $stmt_user->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'Utilizatorul cu acest RFID nu a fost găsit.']);
        exit;
    }

    $email = $user['email'];
    // Inserăm logul în history_logs
    $sql_log = "INSERT INTO history_logs (rfid_code, email, pin, status) VALUES (:rfid_code, :email, :pin, :status)";
    $stmt_log = $pdo->prepare($sql_log);
    $stmt_log->execute([
        ':rfid_code' => $rfid_code,
        ':email' => $email,
        ':pin' => $pin,
        ':status' => $status
    ]);

    echo json_encode(['success' => true, 'message' => 'Log salvat cu succes.']);