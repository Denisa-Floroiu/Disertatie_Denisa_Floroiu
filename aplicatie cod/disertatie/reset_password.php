<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';
require_once 'connection_db.php';

function generateRandomPassword($length = 10) {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
    return substr(str_shuffle(str_repeat($chars, ceil($length / strlen($chars)))), 0, $length);
}

function trimiteParolaResetata($userId) {
    global $conn;

    // 1. Preluăm email-ul userului
    $stmt = $conn->prepare("SELECT email FROM utilizatori WHERE id = ?");
    $stmt->execute([$userId]);
    $email = $stmt->fetchColumn();

    if (!$email) {
        error_log(" Utilizatorul cu ID $userId nu există.");
        echo json_encode(['success' => false, 'error' => 'Utilizator inexistent']);
        exit;
    }

    // 2. Generează parola nouă și o salvează în DB (hash-uită)
    $newPassword = generateRandomPassword(10);
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

    $update = $conn->prepare("UPDATE utilizatori SET password = ? WHERE id = ?");
    $update->execute([$hashedPassword, $userId]);
    $updateFlag = $conn->prepare("UPDATE utilizatori SET must_change_password = TRUE WHERE id = ?");
    $updateFlag->execute([$userId]);

    // 3. Trimite email cu parola nouă
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'securelighthome@gmail.com';
        $mail->Password   = 'tljcbunqulpgrgdp'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom('securelighthome@gmail.com', 'SecureLightHome');
        $mail->addAddress($email);

        $mail->isHTML(true);
        $mail->Subject = 'Resetare parola SecureLightHome';
        $mail->Body    = "
            <h2>Resetarea parolei</h2>
            <p>Parola ta noua este: <strong>$newPassword</strong></p>
            <p>Te rugam sa o schimbi dupa ce te autentifici.</p>
        ";

        $mail->send();

        echo json_encode(['success' => true, 'pin' => $newPassword]);
    } catch (Exception $e) {
        error_log(" Eroare PHPMailer: " . $mail->ErrorInfo);
        echo json_encode(['success' => false, 'error' => 'Eroare la trimiterea emailului']);
    }
}

// Preluarea user_id din POST
$userId = $_POST['user_id'] ?? null;
if (!$userId) {
    echo json_encode(['success' => false, 'error' => 'ID utilizator lipsă']);
    exit;
}

trimiteParolaResetata($userId);
