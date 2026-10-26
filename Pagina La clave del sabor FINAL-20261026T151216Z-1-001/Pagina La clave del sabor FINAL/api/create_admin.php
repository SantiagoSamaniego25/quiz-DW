<?php

declare(strict_types=1);

require __DIR__ . '/config.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('Este script solo puede ejecutarse desde la consola.');
}

$username = trim((string) ($argv[1] ?? 'Admin123'));
$password = (string) ($argv[2] ?? '');

if ($password === '') {
    fwrite(STDERR, "Uso: C:\\xampp\\php\\php.exe api\\create_admin.php USUARIO CONTRASENA\n");
    exit(1);
}

$pdo = database();
$statement = $pdo->prepare('SELECT id FROM users WHERE role = ? LIMIT 1');
$statement->execute(['admin']);

if ($statement->fetch()) {
    fwrite(STDERR, "Ya existe un administrador. Usa phpMyAdmin para gestionar cuentas.\n");
    exit(1);
}

$statement = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = ?');
$statement->execute([$username, password_hash($password, PASSWORD_DEFAULT), 'admin', 'admin']);

fwrite(STDOUT, "Administrador creado.\n");
