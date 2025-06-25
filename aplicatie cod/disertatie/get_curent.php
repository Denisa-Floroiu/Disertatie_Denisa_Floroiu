<?php
require 'connection_db.php';
header('Content-Type: application/json');

$start = $_POST['start'] ?? null;
$end   = $_POST['end']   ?? null;

if (!$start || !$end) {
    http_response_code(400);
    echo json_encode(['error' => 'Interval lipsă']);
    exit;
}

try {
    // Extragem toate sesiunile pe intervalul dat
    $sql = "
        SELECT 
            id,
            timestamp,
            curent_total,
            curent_total * 230 AS energie_wh,
            durata_secunde,
            mod
        FROM sesiuni_consum
        WHERE timestamp BETWEEN :start AND :end
        ORDER BY timestamp ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':start' => $start, ':end' => $end]);
    $sesiuni = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Inițializăm variabilele de sumar per modul
    $totalAhAuto    = 0; $totalWhAuto    = 0; $countAuto    = 0;
    $totalAhManual  = 0; $totalWhManual  = 0; $countManual  = 0;

    // Iterăm prin fiecare sesiune și acumulăm valorile pe mod
    foreach ($sesiuni as $s) {
        $ah = floatval($s['curent_total']);
        $wh = $ah * 230.0;

        if ($s['mod'] === 'automat') {
            $totalAhAuto   += $ah;
            $totalWhAuto   += $wh;
            $countAuto++;
        } else {
            $totalAhManual += $ah;
            $totalWhManual += $wh;
            $countManual++;
        }
    }

    // Generăm răspunsul JSON cu toate datele
    echo json_encode([
        'auto' => [
            'count'   => $countAuto,
            'totalAh' => round($totalAhAuto, 4),
            'totalWh' => round($totalWhAuto, 2),
        ],
        'manual' => [
            'count'   => $countManual,
            'totalAh' => round($totalAhManual, 4),
            'totalWh' => round($totalWhManual, 2),
        ],
        'sesiuni' => $sesiuni,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Eroare DB: ' . $e->getMessage()]);
}
