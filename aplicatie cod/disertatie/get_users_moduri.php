<?php
require 'connection_db.php';

$mod = $_GET['mod'] ?? 'vacanta';

$sql = "
  SELECT u.email, u.role,
         CASE 
           WHEN u.role = 'admin' THEN TRUE
           WHEN :mod = 'normal' THEN TRUE
           WHEN a.acces IS TRUE THEN TRUE
           ELSE FALSE
         END AS are_acces
  FROM utilizatori u
  LEFT JOIN acces_moduri a ON u.email = a.email AND a.mod = :mod
  WHERE u.status = 'activ'
";

$stmt = $conn->prepare($sql);
$stmt->execute(['mod' => $mod]);
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 2. Preluăm intervalul pentru modul cerut
$intervalSql = "SELECT start, \"end\" FROM interval_moduri WHERE LOWER(mod) = LOWER(:mod) LIMIT 1";
$intervalStmt = $conn->prepare($intervalSql);
$intervalStmt->execute(['mod' => $mod]);
$interval = $intervalStmt->fetch(PDO::FETCH_ASSOC);

if ($interval) {
    $interval['start'] = date('Y-m-d\TH:i', strtotime($interval['start']));
    $interval['end'] = date('Y-m-d\TH:i', strtotime($interval['end']));
}
// 4. Setăm header JSON și returnăm totul
header('Content-Type: application/json');
echo json_encode([
    'users' => $users,
    'interval' => $interval
]);
?>
