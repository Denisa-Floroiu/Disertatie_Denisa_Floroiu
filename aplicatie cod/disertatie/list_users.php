<?php
require 'connection_db.php';

if (!$conn) {
    http_response_code(500);
    echo json_encode(['error' => 'Conexiunea la baza de date a eșuat.']);
    exit;
}

try {
    $stmt = $conn->query("SELECT * FROM utilizatori ORDER BY created_at ASC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($users as &$user) {
        if (!empty($user['created_at'])) {
            $date = new DateTime($user['created_at'], new DateTimeZone('Europe/Bucharest'));
            $user['created_at'] = $date->format('Y-m-d H:i:s');
        }
    }

    header('Content-Type: application/json');
    echo json_encode($users);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
