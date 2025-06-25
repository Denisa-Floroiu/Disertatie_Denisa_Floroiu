<?php
session_start();
require 'connection_db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? null;
    $password = $_POST['password'] ?? null;

    if (!$email || !$password) {
        die(" Email și parolă sunt obligatorii.");
    }

    $stmt = $conn->prepare("SELECT * FROM utilizatori WHERE email = :email");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password'])) {

            // Verificare dacă utilizatorul este activ
        if ($user['status'] !== 'activ') {
            echo json_encode(['success' => false, 'error' => 'Contul tău este inactiv.']);
            exit();
        }
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role'] = $user['role'];
        $pin_code = $user['pin_code']; 
      
        // Dacă trebuie să schimbe parola, setează flag false și trimite răspuns special
        if (!empty($user['must_change_password'])) {
            echo json_encode(['success' => true, 'must_change_password' => true,  'role' => $user['role'],  'status' => $user['status'], 'pin_code' => $pin_code ]);
            exit();
        }

        echo json_encode(['success' => true, 'must_change_password' => false, 'role' => $user['role'],  'status' => $user['status']]);
        exit();
    } else {
        echo json_encode(['success' => false, 'error' => 'Email sau parolă incorectă.']);
    exit();
       
    }
}

?>
