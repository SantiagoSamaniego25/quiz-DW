<?php

declare(strict_types=1);

require __DIR__ . '/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => false,
    ]);
    session_start();
}

$action = $_GET['action'] ?? '';

try {
    if ($action === 'session') {
        if (empty($_SESSION['user_id'])) {
            json_response(['authenticated' => false]);
        }

        json_response([
            'authenticated' => true,
            'username' => $_SESSION['username'],
            'role' => $_SESSION['role'],
        ]);
    }

    if ($action === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if (strlen($username) < 3 || strlen($username) > 50) {
            json_response(['ok' => false, 'message' => 'El usuario debe tener entre 3 y 50 caracteres.'], 422);
        }
        if (strlen($password) < 6) {
            json_response(['ok' => false, 'message' => 'La contraseña debe tener al menos 6 caracteres.'], 422);
        }

        $pdo = database();
        $statement = $pdo->prepare('SELECT usuario FROM clientes WHERE LOWER(usuario) = LOWER(?) LIMIT 1');
        $statement->execute([$username]);
        if ($statement->fetch()) {
            json_response(['ok' => false, 'message' => 'Ese usuario ya existe. Elige otro.'], 409);
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $statement = $pdo->prepare('INSERT INTO clientes (usuario, `contraseña`, `conf_contraseña`) VALUES (?, ?, ?)');
        $statement->execute([$username, $passwordHash, $passwordHash]);

        json_response(['ok' => true, 'message' => 'Cuenta creada. Inicia sesión para continuar.']);
    }

    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        $pdo = database();

        $statement = $pdo->prepare('SELECT * FROM clientes WHERE LOWER(usuario) = LOWER(?) LIMIT 1');
        $statement->execute([$username]);
        $customer = $statement->fetch();

        if ($customer) {
            $storedPassword = (string) $customer['contraseña'];
            $passwordMatches = password_verify($password, $storedPassword)
                || hash_equals($storedPassword, $password);

            if ($passwordMatches) {
                if (!password_get_info($storedPassword)['algo']) {
                    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
                    $update = $pdo->prepare('UPDATE clientes SET `contraseña` = ?, `conf_contraseña` = ? WHERE usuario = ?');
                    $update->execute([$passwordHash, $passwordHash, $customer['usuario']]);
                }

                session_regenerate_id(true);
                $_SESSION['user_id'] = $customer['id'] ?? $customer['usuario'];
                $_SESSION['username'] = $customer['usuario'];
                $_SESSION['role'] = 'customer';

                json_response(['ok' => true, 'username' => $customer['usuario'], 'role' => 'customer']);
            }
        }

        $statement = $pdo->prepare('SELECT * FROM admin WHERE LOWER(usuario) = LOWER(?) LIMIT 1');
        $statement->execute([$username]);
        $administrator = $statement->fetch();

        if ($administrator && hash_equals((string) $administrator['contraseña'], $password)) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = $administrator['id'] ?? $administrator['usuario'];
            $_SESSION['username'] = $administrator['usuario'];
            $_SESSION['role'] = 'admin';

            json_response(['ok' => true, 'username' => $administrator['admin'], 'role' => 'admin']);
        }

        json_response(['ok' => false, 'message' => 'Usuario o contraseña incorrectos.'], 401);
    }

    if ($action === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        json_response(['ok' => true]);
    }

    json_response(['ok' => false, 'message' => 'Acción no válida.'], 400);
} catch (PDOException $error) {
    json_response(['ok' => false, 'message' => 'No se pudo conectar con la base de datos.'], 500);
}
