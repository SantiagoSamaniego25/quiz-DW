<?php

declare(strict_types=1);

const DB_HOST = 'localhost';
const DB_NAME = 'inicio_sesion';
const DB_USER = 'inicio_sesion_app';
const DB_PASSWORD = 'base123';

function database(): PDO
{
    static $connection;

    if (!$connection instanceof PDO) {
        $dsn = 'mysql:host=' . DB_HOST . ';port=3308;dbname=' . DB_NAME . ';charset=utf8mb4';
        $connection = new PDO($dsn, DB_USER, DB_PASSWORD, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    return $connection;
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
