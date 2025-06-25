<?php
require 'connection_db.php';

$rfid = $_POST['rfid_code'] ?? null;
$user_id = $_POST['user_id'] ?? null;

if (!$rfid || !$user_id) {
    die("Date lipsă!");
}

// verifici dacă cardul nu e deja asociat
$stmt = $pdo->prepare("SELECT * FROM utilizatori WHERE rfid_code = ?");
$stmt->execute([$rfid]);
if ($stmt->fetch()) {
    die("Cardul este deja asociat!");
}

// asociezi cardul
$update = $pdo->prepare("UPDATE utilizatori SET rfid_code = ? WHERE id = ?");
$update->execute([$rfid, $user_id]);

// ștergi din pending
$delete = $pdo->prepare("DELETE FROM rfid_asteptare WHERE rfid_code = ?");
$delete->execute([$rfid]);

echo "✅ Card asociat cu succes!";
