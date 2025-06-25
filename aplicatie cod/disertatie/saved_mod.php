<?php
require 'connection_db.php';

$data = json_decode(file_get_contents("php://input"), true);
$mod = $data['mod'];
$emails = $data['emails'];
$interval = $data['interval'] ?? null;
$start = $interval['start'] ?? null;
$end = $interval['end'] ?? null;

if ($mod === 'normal') {
      // Ștergem toate accesurile și intervalele deoarece modul Normal înseamnă acces liber
    $conn->prepare("DELETE FROM acces_moduri")->execute();
    $conn->prepare("DELETE FROM interval_moduri")->execute();

    echo json_encode(["message" => "Modul Normal activează accesul pentru toți utilizatorii fără restricții. Setările au fost resetate."]);
    exit;
}

//  Luăm emailurile de admin pentru a nu le modifica
$adminStmt = $conn->query("SELECT email FROM utilizatori WHERE role = 'admin'");
$admini = array_column($adminStmt->fetchAll(PDO::FETCH_ASSOC), 'email');

//  Filtrăm doar utilizatori normali
$emails = array_filter($emails, fn($email) => !in_array($email, $admini));

//  Ștergem toate accesurile care nu aparțin modului curent
$conn->prepare("DELETE FROM acces_moduri WHERE mod != :mod")->execute(['mod' => $mod]);


$conn->prepare("DELETE FROM interval_moduri WHERE mod != :mod")->execute(['mod' => $mod]);
//  Ștergem accesările existente pentru mod curent (ca să evităm dubluri)
$conn->prepare("DELETE FROM acces_moduri WHERE mod = :mod")->execute(['mod' => $mod]);

//  Salvăm accesul doar pentru modul activ
$insertStmt = $conn->prepare("INSERT INTO acces_moduri (email, mod) VALUES (:email, :mod)");
foreach ($emails as $email) {
    $insertStmt->execute(['email' => $email, 'mod' => $mod]);
}

// 1. Verific dacă există deja o intrare pentru mod
$checkStmt = $conn->prepare("SELECT COUNT(*) FROM interval_moduri WHERE mod = :mod");
$checkStmt->execute(['mod' => $mod]);
$exists = $checkStmt->fetchColumn() > 0;
$startClean = str_replace('T', ' ', $start);
$endClean = str_replace('T', ' ', $end);
// verifică dacă sunt setate corect
if (empty($startClean) || empty($endClean)) {
    echo json_encode(["error" => "Datele pentru interval nu sunt completate."]);
    exit;
}
if ($exists) {
    // UPDATE
    
    $updateStmt = $conn->prepare("
        UPDATE interval_moduri 
        SET start = :start, \"end\" = :end
        WHERE mod = :mod
    ");
    $updateStmt->execute([
        'start' => $startClean,
        'end' => $endClean,
        'mod' => $mod
    ]);
} else {
    // INSERT
    $insertStmt = $conn->prepare("
        INSERT INTO interval_moduri (mod, start, \"end\")
        VALUES (:mod, :start, :end)
    ");
    $insertStmt->execute([
        'mod' => $mod,
        'start' => $startClean,
        'end' => $endClean
    ]);
}

echo json_encode(["message" => "Setările au fost salvate."]);
