<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';
require_once 'connection_db.php'; //  legătura la baza de date

function trimiteAlertaPin($rfid) {
    global $conn;

    //  Obține adresa de email a adminului
    $stmt = $conn->prepare("SELECT email FROM utilizatori WHERE role = 'admin' LIMIT 1");
    $stmt->execute();
    $admin = $stmt->fetch();

    if (!$admin) {
        error_log(" Nu s-a găsit un utilizator admin.");
        return;
    }

    $adminEmail = $admin['email'];

    $mail = new PHPMailer(true);

    try {
        //  Configurare Mailtrap
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'securelighthome@gmail.com';
            $mail->Password   = 'tljcbunqulpgrgdp';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;

            $mail->setFrom('securelighthome@gmail.com', 'SecureLightHome');
            $mail->addAddress($adminEmail);


        // Conținut
        $mail->isHTML(true);
        $mail->Subject = 'Alerta: PIN introdus gresit de 3 ori';
        $mail->Body    = "
            <h2>Alertă de securitate</h2>
            <p>Cardul cu RFID <strong>$rfid</strong> a introdus un PIN greșit de 3 ori consecutiv.</p>
            <p><em>Data: " . date('Y-m-d H:i:s') . "</em></p>
        ";

        $mail->send();
    } catch (Exception $e) {
        error_log(" Eroare PHPMailer: " . $mail->ErrorInfo);
    }
}
