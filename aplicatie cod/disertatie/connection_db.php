<?php

$env = parse_ini_file('.env');

$host = $env['DB_HOST'];
$port = $env['DB_PORT'];
$dbname = $env['DB_NAME'];
$user = $env['DB_USER'];
$password = $env['DB_PASS'];

try {
    // Adăugăm sslmode=require pentru Supabase
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";
    
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Testăm conexiunea
    $conn = $pdo;
    $stmt = $pdo->query("SELECT NOW()");
    $data = $stmt->fetch();
    $date = new DateTime($data[0], new DateTimeZone('UTC'));
    $date->setTimezone(new DateTimeZone('Europe/Bucharest'));

} catch (PDOException $e) {
    echo "<p>Eroare conexiune: " . $e->getMessage() . "</p>";
}

?>
