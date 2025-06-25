<?php

require 'connection_db.php'; 

if (!$pdo) {
    http_response_code(500);
    die(" Eroare conectare la baza de date");
}

$curentTotal = $_POST['curent_total'] ?? null;
$durataSec = $_POST['durata_sec'] ?? null;
$mod = $_POST['mod'] ?? 'necunoscut';

if ($curentTotal !== null && $durataSec !== null) {
    $stmt = $pdo->prepare("INSERT INTO sesiuni_consum (curent_total, durata_secunde, mod)
                        VALUES (:curent_total, :durata_secunde, :mod)");

    $stmt->execute([
        ':curent_total' => floatval($curentTotal),
        ':durata_secunde' => intval($durataSec),
        ':mod' => $mod
    ]);
    echo " Sesiune salvată.";
} else {
    http_response_code(400);
    echo " Date lipsă.";
}
?>