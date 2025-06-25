<?php
require 'connection_db.php';

$valoare = $_POST['valoare'] ?? null;
if ($valoare === null) {
    http_response_code(400);
    echo " Valoare lipsă";
    exit;
}

$stmt = $pdo->prepare("INSERT INTO lumina_digitala (valoare) VALUES (?)");
$stmt->execute([$valoare]);

echo " Lumina salvată.";
?>
