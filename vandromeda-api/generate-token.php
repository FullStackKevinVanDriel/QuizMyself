#!/usr/bin/env php
<?php
/**
 * API Token Generator CLI Script
 *
 * Generates a new API token for authenticating with the feedback API.
 *
 * Usage:
 *   php generate-token.php [options]
 *
 * Options:
 *   --name=NAME           Token name/description (default: "CLI Generated Token")
 *   --permissions=PERMS   Comma-separated permissions (default: "feedback:read,feedback:write,feedback:notify")
 *   --expires=DAYS        Token expiration in days (default: no expiration)
 *   --help                Show this help message
 *
 * Examples:
 *   php generate-token.php
 *   php generate-token.php --name="GitHub Actions" --permissions="feedback:read,feedback:write"
 *   php generate-token.php --name="Admin Token" --permissions="*" --expires=365
 */

declare(strict_types=1);

// Ensure CLI execution
if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line.\n");
}

// Load environment variables from .env file if it exists
function loadEnv(string $path): void {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            if (!getenv($name)) {
                putenv("$name=$value");
                $_ENV[$name] = $value;
            }
        }
    }
}

loadEnv(__DIR__ . '/.env');

/**
 * Parse command line arguments
 */
function parseArgs(array $argv): array {
    $options = [
        'name' => 'CLI Generated Token',
        'permissions' => 'feedback:read,feedback:write,feedback:notify',
        'expires' => null,
        'help' => false,
    ];

    foreach ($argv as $arg) {
        if ($arg === '--help' || $arg === '-h') {
            $options['help'] = true;
        } elseif (preg_match('/^--name=(.+)$/', $arg, $m)) {
            $options['name'] = $m[1];
        } elseif (preg_match('/^--permissions=(.+)$/', $arg, $m)) {
            $options['permissions'] = $m[1];
        } elseif (preg_match('/^--expires=(\d+)$/', $arg, $m)) {
            $options['expires'] = (int)$m[1];
        }
    }

    return $options;
}

/**
 * Show help message
 */
function showHelp(): void {
    echo <<<HELP
API Token Generator for Vandromeda Feedback API

Usage:
  php generate-token.php [options]

Options:
  --name=NAME           Token name/description
                        Default: "CLI Generated Token"

  --permissions=PERMS   Comma-separated list of permissions
                        Available permissions:
                          - feedback:read   (read feedback entries)
                          - feedback:write  (update feedback entries)
                          - feedback:notify (send notification emails)
                          - *               (all permissions)
                        Default: "feedback:read,feedback:write,feedback:notify"

  --expires=DAYS        Token expiration in days from now
                        Default: no expiration (never expires)

  --help, -h            Show this help message

Examples:
  php generate-token.php
    Generate a token with default settings

  php generate-token.php --name="GitHub Actions"
    Generate a token named "GitHub Actions"

  php generate-token.php --permissions="feedback:read"
    Generate a read-only token

  php generate-token.php --name="Admin" --permissions="*" --expires=365
    Generate an admin token that expires in 1 year

Environment Variables:
  The script reads database credentials from .env file or environment:
    DB_HOST     Database host (default: localhost)
    DB_PORT     Database port (default: 3306)
    DB_NAME     Database name (default: vandromeda)
    DB_USER     Database username (default: root)
    DB_PASS     Database password (default: empty)


HELP;
}

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(int $length = 64): string {
    // Generate random bytes
    $bytes = random_bytes($length / 2);
    return bin2hex($bytes);
}

/**
 * Get database connection
 */
function getDbConnection(): PDO {
    $host = getenv('DB_HOST') ?: 'localhost';
    $port = getenv('DB_PORT') ?: '3306';
    $dbname = getenv('DB_NAME') ?: 'vandromeda';
    $username = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASS') ?: '';

    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    return new PDO($dsn, $username, $password, $options);
}

/**
 * Format output with colors for terminal
 */
function colorize(string $text, string $color): string {
    $colors = [
        'green' => "\033[32m",
        'red' => "\033[31m",
        'yellow' => "\033[33m",
        'blue' => "\033[34m",
        'cyan' => "\033[36m",
        'reset' => "\033[0m",
        'bold' => "\033[1m",
    ];

    // Check if terminal supports colors
    if (!stream_isatty(STDOUT)) {
        return $text;
    }

    return ($colors[$color] ?? '') . $text . $colors['reset'];
}

// Main execution
try {
    $options = parseArgs($argv);

    if ($options['help']) {
        showHelp();
        exit(0);
    }

    echo colorize("\n=== Vandromeda API Token Generator ===\n\n", 'bold');

    // Validate permissions
    $permissions = array_map('trim', explode(',', $options['permissions']));
    $validPermissions = ['feedback:read', 'feedback:write', 'feedback:notify', '*'];

    foreach ($permissions as $perm) {
        if (!in_array($perm, $validPermissions)) {
            echo colorize("Error: ", 'red') . "Invalid permission: $perm\n";
            echo "Valid permissions: " . implode(', ', $validPermissions) . "\n";
            exit(1);
        }
    }

    // Connect to database
    echo "Connecting to database... ";
    try {
        $db = getDbConnection();
        echo colorize("OK\n", 'green');
    } catch (PDOException $e) {
        echo colorize("FAILED\n", 'red');
        echo colorize("Error: ", 'red') . $e->getMessage() . "\n\n";
        echo "Please ensure your .env file contains valid database credentials:\n";
        echo "  DB_HOST=localhost\n";
        echo "  DB_PORT=3306\n";
        echo "  DB_NAME=vandromeda\n";
        echo "  DB_USER=your_username\n";
        echo "  DB_PASS=your_password\n";
        exit(1);
    }

    // Generate secure token
    echo "Generating secure token... ";
    $token = generateSecureToken(64);
    echo colorize("OK\n", 'green');

    // Calculate expiration
    $expiresAt = null;
    if ($options['expires'] !== null && $options['expires'] > 0) {
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$options['expires']} days"));
    }

    // Insert token into database
    echo "Saving to database... ";
    try {
        $stmt = $db->prepare("
            INSERT INTO api_tokens (token, name, permissions, expires_at, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $token,
            $options['name'],
            json_encode($permissions),
            $expiresAt,
        ]);
        $tokenId = $db->lastInsertId();
        echo colorize("OK\n", 'green');
    } catch (PDOException $e) {
        echo colorize("FAILED\n", 'red');
        echo colorize("Error: ", 'red') . $e->getMessage() . "\n";

        if (strpos($e->getMessage(), "doesn't exist") !== false) {
            echo "\nThe api_tokens table does not exist. Run the following SQL to create it:\n\n";
            echo colorize("CREATE TABLE api_tokens (\n", 'cyan');
            echo colorize("    id INT AUTO_INCREMENT PRIMARY KEY,\n", 'cyan');
            echo colorize("    token VARCHAR(64) UNIQUE,\n", 'cyan');
            echo colorize("    name VARCHAR(100),\n", 'cyan');
            echo colorize("    permissions JSON,\n", 'cyan');
            echo colorize("    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n", 'cyan');
            echo colorize("    expires_at DATETIME\n", 'cyan');
            echo colorize(");\n", 'cyan');
        }
        exit(1);
    }

    // Display results
    echo "\n" . colorize("Token created successfully!\n", 'green');
    echo str_repeat('-', 60) . "\n\n";

    echo colorize("Token ID:     ", 'bold') . $tokenId . "\n";
    echo colorize("Name:         ", 'bold') . $options['name'] . "\n";
    echo colorize("Permissions:  ", 'bold') . implode(', ', $permissions) . "\n";
    echo colorize("Expires:      ", 'bold') . ($expiresAt ?? 'Never') . "\n";

    echo "\n" . colorize("Your API Token:\n", 'bold');
    echo colorize($token, 'cyan') . "\n";

    echo "\n" . str_repeat('-', 60) . "\n";
    echo colorize("IMPORTANT: ", 'yellow') . "Save this token securely. It will not be shown again.\n\n";

    echo colorize("Usage Example:\n", 'bold');
    echo "curl -H \"Authorization: Bearer $token\" \\\n";
    echo "     https://your-domain.com/feedback.php?product=quizmyself&unprocessed=true\n\n";

    echo colorize("Environment Variable:\n", 'bold');
    echo "export VANDROMEDA_API_TOKEN=\"$token\"\n\n";

} catch (Exception $e) {
    echo colorize("\nFatal Error: ", 'red') . $e->getMessage() . "\n";
    exit(1);
}
