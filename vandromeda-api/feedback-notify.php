<?php
/**
 * Feedback Notification Endpoint
 *
 * Sends email notifications to feedback submitters when their feedback
 * has been addressed or requires follow-up.
 *
 * POST - Send email notification to feedback submitter
 * Body: { "feedback_id": 123, "message": "Your feedback has been addressed!" }
 */

declare(strict_types=1);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => true, 'message' => 'Method not allowed']);
    exit;
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
 * Send a JSON response and exit
 */
function jsonResponse(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send an error response and exit
 */
function errorResponse(string $message, int $statusCode = 400): void {
    jsonResponse(['error' => true, 'message' => $message], $statusCode);
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

    try {
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        return new PDO($dsn, $username, $password, $options);
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        errorResponse('Database connection failed', 500);
    }
}

/**
 * Authenticate the request using Bearer token
 */
function authenticate(PDO $db): array {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (empty($authHeader)) {
        errorResponse('Authorization header required', 401);
    }

    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        errorResponse('Invalid authorization format. Use: Bearer <token>', 401);
    }

    $token = $matches[1];

    $stmt = $db->prepare("
        SELECT id, name, permissions, expires_at
        FROM api_tokens
        WHERE token = ?
        AND (expires_at IS NULL OR expires_at > NOW())
    ");
    $stmt->execute([$token]);
    $tokenData = $stmt->fetch();

    if (!$tokenData) {
        errorResponse('Invalid or expired token', 401);
    }

    $permissions = json_decode($tokenData['permissions'] ?? '[]', true) ?: [];

    return [
        'id' => $tokenData['id'],
        'name' => $tokenData['name'],
        'permissions' => $permissions,
    ];
}

/**
 * Check if token has required permission
 */
function hasPermission(array $tokenData, string $permission): bool {
    $permissions = $tokenData['permissions'];
    return in_array('*', $permissions) || in_array($permission, $permissions);
}

/**
 * Send email using PHP mail() or SMTP
 */
function sendEmail(string $to, string $subject, string $htmlBody, string $textBody): bool {
    $smtpHost = getenv('SMTP_HOST');
    $smtpPort = getenv('SMTP_PORT') ?: 587;
    $smtpUser = getenv('SMTP_USER');
    $smtpPass = getenv('SMTP_PASS');
    $fromEmail = getenv('MAIL_FROM') ?: 'noreply@vandromeda.com';
    $fromName = getenv('MAIL_FROM_NAME') ?: 'Vandromeda Feedback';

    // If SMTP is configured, try to use it via PHPMailer or similar
    // For now, we'll use the native mail() function with proper headers
    // In production, you might want to integrate PHPMailer or similar

    $boundary = md5(uniqid((string)time()));

    $headers = [
        'MIME-Version: 1.0',
        "From: $fromName <$fromEmail>",
        'Reply-To: ' . $fromEmail,
        'X-Mailer: PHP/' . phpversion(),
        "Content-Type: multipart/alternative; boundary=\"$boundary\"",
    ];

    $body = "--$boundary\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $textBody . "\r\n\r\n";
    $body .= "--$boundary\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $htmlBody . "\r\n\r\n";
    $body .= "--$boundary--";

    // Try mail() function
    $result = @mail($to, $subject, $body, implode("\r\n", $headers));

    if (!$result) {
        error_log("Failed to send email to: $to");
    }

    return $result;
}

/**
 * Build email content from template
 */
function buildEmailContent(array $feedback, string $message, string $productName): array {
    $feedbackType = ucfirst($feedback['type'] ?? 'feedback');
    $feedbackId = $feedback['id'];
    $status = ucfirst($feedback['status'] ?? 'unknown');

    $textBody = <<<TEXT
Hello,

Thank you for submitting your $feedbackType for $productName.

$message

---
Feedback Reference: #$feedbackId
Status: $status

If you have any questions, please don't hesitate to reach out.

Best regards,
The $productName Team
TEXT;

    $htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; }
        .message { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #4f46e5; margin: 15px 0; }
        .meta { font-size: 13px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">$productName Feedback Update</h2>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Thank you for submitting your <strong>$feedbackType</strong> for $productName.</p>

            <div class="message">
                <p style="margin: 0;">$message</p>
            </div>

            <div class="meta">
                <p><strong>Feedback Reference:</strong> #$feedbackId<br>
                <strong>Status:</strong> $status</p>
            </div>

            <p>If you have any questions, please don't hesitate to reach out.</p>

            <p>Best regards,<br>The $productName Team</p>
        </div>
        <div class="footer">
            <p style="margin: 0;">This email was sent regarding your feedback submission. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
HTML;

    return [
        'text' => $textBody,
        'html' => $htmlBody,
    ];
}

/**
 * Log notification to database (optional - creates table if needed)
 */
function logNotification(PDO $db, int $feedbackId, string $email, bool $success, ?string $error = null): void {
    try {
        // Check if notifications table exists, create if not
        $db->exec("
            CREATE TABLE IF NOT EXISTS feedback_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                feedback_id INT NOT NULL,
                email VARCHAR(255) NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT TRUE,
                error_message TEXT,
                INDEX idx_feedback_id (feedback_id)
            )
        ");

        $stmt = $db->prepare("
            INSERT INTO feedback_notifications (feedback_id, email, success, error_message)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$feedbackId, $email, $success ? 1 : 0, $error]);
    } catch (PDOException $e) {
        // Log but don't fail if notification logging fails
        error_log("Failed to log notification: " . $e->getMessage());
    }
}

// Main execution
try {
    $db = getDbConnection();
    $tokenData = authenticate($db);

    if (!hasPermission($tokenData, 'feedback:notify')) {
        errorResponse('Permission denied: feedback:notify required', 403);
    }

    // Parse request body
    $input = json_decode(file_get_contents('php://input'), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        errorResponse('Invalid JSON in request body');
    }

    // Validate required fields
    $feedbackId = (int)($input['feedback_id'] ?? 0);
    $message = trim($input['message'] ?? '');

    if ($feedbackId <= 0) {
        errorResponse('feedback_id is required and must be a positive integer');
    }

    if (empty($message)) {
        errorResponse('message is required and cannot be empty');
    }

    if (strlen($message) > 5000) {
        errorResponse('message must be 5000 characters or less');
    }

    // Optional subject override
    $subject = trim($input['subject'] ?? '');

    // Fetch feedback record
    $stmt = $db->prepare("SELECT * FROM feedback WHERE id = ?");
    $stmt->execute([$feedbackId]);
    $feedback = $stmt->fetch();

    if (!$feedback) {
        errorResponse('Feedback not found', 404);
    }

    $email = $feedback['email'] ?? '';

    if (empty($email)) {
        errorResponse('Feedback has no email address associated', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        errorResponse('Invalid email address in feedback record', 400);
    }

    // Determine product name for email
    $productNames = [
        'quizmyself' => 'QuizMyself',
        // Add more product mappings as needed
    ];
    $productName = $productNames[$feedback['product'] ?? ''] ?? ucfirst($feedback['product'] ?? 'Our Product');

    // Build email subject
    if (empty($subject)) {
        $feedbackType = ucfirst($feedback['type'] ?? 'Feedback');
        $subject = "Update on your $feedbackType - $productName";
    }

    // Build email content
    $emailContent = buildEmailContent($feedback, $message, $productName);

    // Send the email
    $sent = sendEmail($email, $subject, $emailContent['html'], $emailContent['text']);

    // Log the notification attempt
    logNotification($db, $feedbackId, $email, $sent, $sent ? null : 'mail() function returned false');

    if ($sent) {
        jsonResponse([
            'success' => true,
            'message' => 'Notification email sent successfully',
            'data' => [
                'feedback_id' => $feedbackId,
                'email' => $email,
                'subject' => $subject,
            ],
        ]);
    } else {
        errorResponse('Failed to send notification email. Please check server mail configuration.', 500);
    }

} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    errorResponse('Database error occurred', 500);
} catch (Exception $e) {
    error_log("Unexpected error: " . $e->getMessage());
    errorResponse('An unexpected error occurred', 500);
}
