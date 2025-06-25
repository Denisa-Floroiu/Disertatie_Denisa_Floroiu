<?php
require 'connection_db.php';
require_once 'alerta_email.php'; // pentru trimiteAlertaPin()

date_default_timezone_set('Europe/Bucharest');
$now = date('Y-m-d H:i:s');

$rfid = $_POST['rfid_code'] ?? null;
$pin = $_POST['pin'] ?? null;

if (!$rfid) {
    die(" Lipsesc datele necesare.");
}


// Funcția de verificare acces pe moduri și intervale
function verificaAcces($email, $role, $conn) {
    // Adminul are acces automat
    if ($role === 'admin') {
        return true;
    }

    // Află modul curent activ
    $stmt = $conn->query("SELECT mod, start, \"end\" FROM interval_moduri LIMIT 1");
    $modData = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$modData) {
        // Niciun mod activ => acces liber
        return true;
    }

    $modCurent = $modData['mod'];

    // Verificăm dacă utilizatorul are acces la modul curent
    $stmt = $conn->prepare("SELECT COUNT(*) FROM acces_moduri WHERE email = :email AND mod = :mod");
    $stmt->execute(['email' => $email, 'mod' => $modCurent]);
    $hasAccess = $stmt->fetchColumn() > 0;

    if (!$hasAccess) {
        return false;
    }

    // Dacă există interval, verificăm timpul
    if ($modData['start'] && $modData['end']) {
        $now = new DateTime("now", new DateTimeZone("Europe/Bucharest"));
        $start = new DateTime($modData['start'], new DateTimeZone("Europe/Bucharest"));
        $end = new DateTime($modData['end'], new DateTimeZone("Europe/Bucharest"));

        return ($now >= $start && $now <= $end);
    }

    return true;
}

// === Caz special: Admin fara card - asociere automata
if ($rfid && !$pin) {
    $stmt = $conn->prepare("SELECT * FROM utilizatori WHERE role = 'admin' AND (rfid_code IS NULL OR rfid_code = '') LIMIT 1");
    $stmt->execute();
    $admin = $stmt->fetch();

    if ($admin) {
        $update = $conn->prepare("UPDATE utilizatori SET rfid_code = ? WHERE id = ?");
        $update->execute([$rfid, $admin['id']]);
        echo " Card asociat automat contului de admin fără RFID.";
        exit();
    }
}

// === Enroll mode activ (fără PIN)
if (!$pin && file_exists("enroll_mode.tmp")) {
    $data = json_decode(file_get_contents("enroll_mode.tmp"), true);

    if (time() - $data['time'] > 180) {
        unlink("enroll_mode.tmp");
        echo " Timpul pentru înregistrare a expirat.";
        exit();
    }

    $stmt = $conn->prepare("SELECT * FROM utilizatori WHERE rfid_code = ?");
    $stmt->execute([$rfid]);
    if ($stmt->fetch()) {
        unlink("enroll_mode.tmp");
        echo " Cardul este deja asociat.";
        exit();
    }

    $stmt = $conn->prepare("SELECT * FROM rfid_asteptare WHERE rfid_code = ?");
    $stmt->execute([$rfid]);
    if ($stmt->fetch()) {
        unlink("enroll_mode.tmp");
        echo "Cardul este deja în lista de așteptare.";
        exit();
    }

    $insert = $conn->prepare("INSERT INTO rfid_asteptare (rfid_code, detected_at) VALUES (?, ?)");
    $insert->execute([$rfid, $now]);
    unlink("enroll_mode.tmp");
    echo " Card nou adăugat în lista de așteptare.";
    exit();
}

// === Card cunoscut dar fara PIN - trimitem semnal catre ESP32 sa ceara PIN
if ($rfid && !$pin) {
    $stmt = $conn->prepare("SELECT * FROM utilizatori WHERE rfid_code = ?");
    $stmt->execute([$rfid]);
    $user = $stmt->fetch();

    if ($user) {
       if (!verificaAcces($user['email'], $user['role'], $conn)) {
        echo " Acces interzis în modul curent sau în afara intervalului permis.";
        exit();
    }
        if ($user['status'] === 'inactiv') {
            if ($user['blocked_until'] && strtotime($user['blocked_until']) < time()) {
                $stmt = $conn->prepare("UPDATE utilizatori SET status = 'activ', blocked_until = NULL WHERE id = ?");
                $stmt->execute([$user['id']]);
                $user['status'] = 'activ';
            } else {
                echo " Cont inactiv. Acces interzis.";
                exit();
            }
        }
        echo "CERE_PIN";
        exit();
    } else {
        echo " Card necunoscut.";
        exit();
    }
}

// === Scanare cu PIN trimis
if ($rfid && $pin) {
    $stmt = $conn->prepare("SELECT * FROM utilizatori WHERE rfid_code = ?");
    $stmt->execute([$rfid]);
    $user = $stmt->fetch();

    if (!$user) {
        echo " Card necunoscut.";
        exit();
    }
    // Verificăm accesul pe moduri și intervale
   if (!verificaAcces($user['email'], $user['role'], $conn)){
        echo " Acces interzis în modul curent sau în afara intervalului permis.";
        exit();
    }
    // === ADMIN
    if ($user['role'] === 'admin') {
        $adminPinValid = password_verify($pin, $user['admin_pin']);
        $userPinValid = $user['pin_code'] && $user['pin_code'] === $pin;

        if ($adminPinValid) {
            $conn->prepare("DELETE FROM pin_attempts WHERE rfid_code = ?")->execute([$rfid]);

            if ($rfid === $user['rfid_code']) {
                file_put_contents("enroll_mode.tmp", json_encode([
                    "rfid" => $rfid,
                    "time" => time()
                ]));
                echo " Mod înregistrare activat. Scanează card nou.";
            } else {
                echo " ACCESS_GRANTED";
            }
            exit();
        }

        if ($userPinValid) {
            $conn->prepare("DELETE FROM pin_attempts WHERE rfid_code = ?")->execute([$rfid]);
            echo " ACCESS_GRANTED";
            exit();
        }

        handleFailedPin($conn, $rfid);
        echo " ACCESS_DENIED";
        exit();
    }

    // === UTILIZATOR NORMAL
    if ($user['pin_code'] === $pin) {
        $conn->prepare("DELETE FROM pin_attempts WHERE rfid_code = ?")->execute([$rfid]);
        echo " ACCESS_GRANTED";
    } else {
        handleFailedPin($conn, $rfid);
        echo " ACCESS_DENIED";
    }
    exit();
}

echo " ACCESS_DENIED";

// === Funcție pentru contorizare PIN greșit
function handleFailedPin($conn, $rfid)
{
    $maxFails = 3;
    $intervalSecunde = 120;

    $stmt = $conn->prepare("SELECT failed_count, last_attempt FROM pin_attempts WHERE rfid_code = ?");
    $stmt->execute([$rfid]);
    $attempt = $stmt->fetch();

    $nowFormatted = date('Y-m-d H:i:s');
    $now = strtotime($nowFormatted);

    if ($attempt) {
        $last = strtotime($attempt['last_attempt']);
        $failed = ($now - $last > $intervalSecunde) ? 1 : $attempt['failed_count'] + 1;

        $conn->prepare("UPDATE pin_attempts SET failed_count = ?, last_attempt = ? WHERE rfid_code = ?")
            ->execute([$failed, $nowFormatted, $rfid]);

        if ($failed >= $maxFails) {
            trimiteAlertaPin($rfid);

            $blockedUntil = date('Y-m-d H:i:s', time() + 180);
            $conn->prepare("UPDATE utilizatori SET status = 'inactiv', blocked_until = ? WHERE rfid_code = ?")
                ->execute([$blockedUntil, $rfid]);
        }
    } else {
        $conn->prepare("INSERT INTO pin_attempts (rfid_code, failed_count, last_attempt) VALUES (?, 1, ?)")
            ->execute([$rfid, $nowFormatted]);
    }
}
