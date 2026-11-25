<?php
declare(strict_types=1);

/**
 * TÖPFERKURS shared-state API (PHP 8.2+, SQLite).
 * Deploy ONLY this API file on a PHP-capable HTTPS server.
 * Private config and the SQLite DB MUST stay outside the public web root.
 * GitHub Pages cannot execute PHP.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Max-Age: 600');

function reply(int $code, array $payload): never {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$configFile = getenv('TOEPFERKURS_CONFIG') ?: dirname(__DIR__, 2) . '/wg-private/toepferkurs-config.php';
if (!is_file($configFile)) {
    reply(503, ['error' => 'API noch nicht eingerichtet.']);
}

$config = require $configFile;
$secret = is_array($config) ? ($config['shared_secret'] ?? '') : '';
$dbFile = is_array($config) ? ($config['database_file'] ?? '') : '';
$allowedOrigin = is_array($config) ? ($config['allowed_origin'] ?? '') : '';
if (!is_string($secret) || strlen($secret) < 20 ||
    str_contains($secret, 'REPLACE') ||
    !is_string($dbFile) || $dbFile === '' ||
    !is_string($allowedOrigin) || !preg_match('~^https://[^/]+$~', $allowedOrigin)) {
    reply(503, ['error' => 'API-Konfiguration ist unvollständig.']);
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !hash_equals($allowedOrigin, $origin)) {
    reply(403, ['error' => 'Origin nicht zugelassen.']);
}
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
}
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($method !== 'GET' && $method !== 'PUT') {
    header('Allow: GET, PUT, OPTIONS');
    reply(405, ['error' => 'Methode nicht unterstützt.']);
}

$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('~^Bearer\s+(.+)$~i', $authorization, $matches)
    || !hash_equals($secret, trim($matches[1]))) {
    header('WWW-Authenticate: Bearer');
    reply(401, ['error' => 'Falscher WG-Zugangscode.']);
}

try {
    if (!extension_loaded('pdo_sqlite') || !is_dir(dirname($dbFile))) {
        reply(503, ['error' => 'SQLite oder privates Datenverzeichnis fehlt.']);
    }

    $db = new PDO('sqlite:' . $dbFile, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 10,
    ]);
    $db->exec('PRAGMA busy_timeout = 10000');
    $db->exec('CREATE TABLE IF NOT EXISTS wg_state (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        revision INTEGER NOT NULL,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )');

    $read = static function () use ($db): array {
        $row = $db->query('SELECT revision, state_json FROM wg_state WHERE singleton = 1')->fetch(PDO::FETCH_ASSOC);
        return $row
            ? ['revision' => (int)$row['revision'], 'state' => json_decode($row['state_json'], true, 512, JSON_THROW_ON_ERROR)]
            : ['revision' => 0, 'state' => null];
    };

    if ($method === 'GET') {
        reply(200, $read());
    }

    if (isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 1500000) {
        reply(413, ['error' => 'Datenpaket zu groß.']);
    }
    $input = file_get_contents('php://input', false, null, 0, 1500001);
    if ($input === false || strlen($input) > 1500000) {
        reply(413, ['error' => 'Datenpaket zu groß.']);
    }
    try {
        $body = json_decode($input, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        reply(400, ['error' => 'Ungültiges JSON.']);
    }
    if (!is_array($body) || !isset($body['base_revision']) ||
        !is_int($body['base_revision']) || $body['base_revision'] < 0 ||
        !isset($body['state']) || !is_array($body['state'])) {
        reply(400, ['error' => 'Fehlerhafte Revision oder Daten.']);
    }
    $state = $body['state'];
    foreach (['shopping', 'pantry', 'events', 'chores', 'receipts'] as $key) {
        if (!array_key_exists($key, $state) || !is_array($state[$key]) || !array_is_list($state[$key]) || count($state[$key]) > 1000) {
            reply(400, ['error' => 'Fehlerhafter Datenbereich: ' . $key]);
        }
    }
    if (isset($state['meals']) && (!is_array($state['meals']) || !array_is_list($state['meals']) || count($state['meals']) > 1000)) {
        reply(400, ['error' => 'Fehlerhafte Mahlzeiten.']);
    }
    $canonicalJson = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if (strlen($canonicalJson) > 1450000) {
        reply(413, ['error' => 'Datenpaket zu groß.']);
    }

    $db->exec('BEGIN IMMEDIATE TRANSACTION');
    $current = $read();
    if ($body['base_revision'] !== $current['revision']) {
        $db->exec('ROLLBACK');
        reply(409, [
            'error' => 'Der WG-Datenbestand wurde inzwischen geändert.',
            'revision' => $current['revision'],
            'state' => $current['state'],
        ]);
    }

    $nextRevision = $current['revision'] + 1;
    if ($current['revision'] === 0) {
        $stmt = $db->prepare('INSERT INTO wg_state (singleton, revision, state_json) VALUES (1, ?, ?)');
    } else {
        $stmt = $db->prepare('UPDATE wg_state SET revision = ?, state_json = ?, updated_at = CURRENT_TIMESTAMP WHERE singleton = 1');
    }
    $stmt->execute([$nextRevision, $canonicalJson]);
    $db->exec('COMMIT');
    reply(200, ['revision' => $nextRevision, 'state' => $state]);

} catch (Throwable $error) {
    // Errors are logged server side, not exposed to unauthenticated browser users.
    error_log('Toepferkurs API: ' . $error->getMessage());
    reply(500, ['error' => 'Serverfehler. Bitte Hosting-Protokoll prüfen.']);
}
