<?php
/**
 * Feedback API Endpoint
 *
 * POST /api/feedback.php - Submit new feedback (public)
 * GET  /api/feedback.php?product=quizmyself&public=true - Get public roadmap (public)
 * GET  /api/feedback.php?product=quizmyself&unprocessed=true - Get unprocessed feedback (requires token)
 * POST /api/feedback.php with action=mark_processed - Mark as processed (requires token)
 * PATCH /api/feedback.php - Update feedback status (requires token)
 */

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/helpers/database.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');

// Valid products
$VALID_PRODUCTS = ['quizmyself', 'transit_route_planner', 'vandromeda'];

// Product display names for emails
$PRODUCT_NAMES = [
    'quizmyself' => 'QuizMyself',
    'transit_route_planner' => 'Transit Route Planner',
    'vandromeda' => 'Vandromeda'
];

// Status display labels
$STATUS_LABELS = [
    'new' => 'Open',
    'reviewed' => 'Reviewed',
    'in_progress' => 'In Progress',
    'resolved' => 'Resolved',
    'wont_fix' => "Won't Fix"
];

// Global error handler
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

/**
 * Authenticate using Bearer token
 */
function authenticateToken() {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (empty($authHeader) || !preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];
    $pdo = getDbConnection();

    $stmt = $pdo->prepare("
        SELECT id, name, permissions FROM api_tokens
        WHERE token = ? AND (expires_at IS NULL OR expires_at > NOW())
    ");
    $stmt->execute([$token]);
    $tokenData = $stmt->fetch();

    if (!$tokenData) {
        return null;
    }

    $tokenData['permissions'] = json_decode($tokenData['permissions'] ?? '[]', true) ?: [];
    return $tokenData;
}

function hasPermission($tokenData, $permission) {
    $perms = $tokenData['permissions'] ?? [];
    return in_array('*', $perms) || in_array($permission, $perms);
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    $pdo = getDbConnection();

    // Handle GET requests
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        global $VALID_PRODUCTS, $STATUS_LABELS;

        $product = $_GET['product'] ?? null;
        $isPublic = isset($_GET['public']) && $_GET['public'] === 'true';

        // Public roadmap endpoint - no auth required
        if ($isPublic) {
            if (!$product || !in_array($product, $VALID_PRODUCTS)) {
                jsonResponse(['error' => 'Invalid product'], 400);
            }

            $limit = min((int)($_GET['limit'] ?? 50), 100);

            // Get feedback items with limited public info
            $stmt = $pdo->prepare("
                SELECT
                    id,
                    type,
                    CASE
                        WHEN LENGTH(message) > 100 THEN CONCAT(LEFT(message, 100), '...')
                        ELSE message
                    END as title,
                    status,
                    github_issue,
                    github_issue_url,
                    created_at,
                    processed_at,
                    resolved_at
                FROM feedback
                WHERE product = ?
                ORDER BY created_at DESC
                LIMIT ?
            ");
            $stmt->execute([$product, $limit]);
            $items = $stmt->fetchAll();

            // Format for roadmap display
            $feedback = array_map(function($item) use ($STATUS_LABELS) {
                return [
                    'id' => (int)$item['id'],
                    'type' => $item['type'],
                    'title' => $item['title'],
                    'status' => $item['status'] ?? 'new',
                    'status_label' => $STATUS_LABELS[$item['status'] ?? 'new'] ?? 'Open',
                    'github_issue' => $item['github_issue'] ? (int)$item['github_issue'] : null,
                    'github_issue_url' => $item['github_issue_url'],
                    'created_at' => $item['created_at'],
                    'is_resolved' => !empty($item['resolved_at'])
                ];
            }, $items);

            // Stats
            $statsStmt = $pdo->prepare("
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'resolved' OR resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN type = 'bug' THEN 1 ELSE 0 END) as bugs,
                    SUM(CASE WHEN type = 'feature' THEN 1 ELSE 0 END) as features
                FROM feedback WHERE product = ?
            ");
            $statsStmt->execute([$product]);
            $stats = $statsStmt->fetch();

            jsonResponse([
                'success' => true,
                'feedback' => $feedback,
                'stats' => [
                    'total' => (int)$stats['total'],
                    'resolved' => (int)$stats['resolved'],
                    'in_progress' => (int)$stats['in_progress'],
                    'open' => (int)$stats['total'] - (int)$stats['resolved'],
                    'bugs' => (int)$stats['bugs'],
                    'features' => (int)$stats['features']
                ]
            ]);
        }

        // Private endpoint - requires auth
        $tokenData = authenticateToken();
        if (!$tokenData || !hasPermission($tokenData, 'feedback:read')) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $unprocessed = isset($_GET['unprocessed']) && $_GET['unprocessed'] === 'true';
        $limit = min((int)($_GET['limit'] ?? 100), 500);

        $conditions = [];
        $params = [];

        if ($product) {
            $conditions[] = 'product = ?';
            $params[] = $product;
        }
        if ($unprocessed) {
            $conditions[] = 'processed_at IS NULL';
        }

        $where = empty($conditions) ? '' : 'WHERE ' . implode(' AND ', $conditions);

        $stmt = $pdo->prepare("SELECT * FROM feedback $where ORDER BY created_at DESC LIMIT ?");
        $params[] = $limit;
        $stmt->execute($params);
        $feedback = $stmt->fetchAll();

        foreach ($feedback as &$item) {
            $item['context'] = json_decode($item['context'] ?? '{}', true);
        }

        jsonResponse(['success' => true, 'feedback' => $feedback]);
    }

    // Handle PATCH requests (requires auth)
    if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
        $tokenData = authenticateToken();
        if (!$tokenData || !hasPermission($tokenData, 'feedback:write')) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? 0);
        $status = $input['status'] ?? null;
        $githubIssue = $input['github_issue'] ?? null;

        if ($id <= 0) {
            jsonResponse(['error' => 'id is required'], 400);
        }

        $validStatuses = ['new', 'reviewed', 'in_progress', 'resolved', 'wont_fix'];
        if ($status && !in_array($status, $validStatuses)) {
            jsonResponse(['error' => 'Invalid status'], 400);
        }

        $updates = [];
        $params = [];

        if ($status) {
            $updates[] = 'status = ?';
            $params[] = $status;
            if ($status === 'resolved') {
                $updates[] = 'resolved_at = NOW()';
            }
        }
        if ($githubIssue !== null) {
            $updates[] = 'github_issue = ?';
            $params[] = (int)$githubIssue;
        }
        if (isset($input['github_issue_url'])) {
            $updates[] = 'github_issue_url = ?';
            $params[] = $input['github_issue_url'];
        }

        if (empty($updates)) {
            jsonResponse(['error' => 'No fields to update'], 400);
        }

        $params[] = $id;
        $stmt = $pdo->prepare("UPDATE feedback SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);

        jsonResponse(['success' => true, 'message' => 'Feedback updated']);
    }

    // Handle POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        jsonResponse(['error' => 'Invalid JSON body'], 400);
    }

    // Check for mark_processed action (requires auth)
    if (($input['action'] ?? null) === 'mark_processed') {
        $tokenData = authenticateToken();
        if (!$tokenData || !hasPermission($tokenData, 'feedback:write')) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }

        $feedbackId = (int)($input['id'] ?? 0);
        $githubIssue = $input['github_issue'] ?? null;
        $githubIssueUrl = $input['github_issue_url'] ?? null;

        if ($feedbackId <= 0) {
            jsonResponse(['error' => 'id is required'], 400);
        }

        $stmt = $pdo->prepare("
            UPDATE feedback SET
                processed_at = NOW(),
                github_issue = ?,
                github_issue_url = ?,
                status = CASE WHEN status = 'new' THEN 'reviewed' ELSE status END
            WHERE id = ?
        ");
        $stmt->execute([$githubIssue, $githubIssueUrl, $feedbackId]);

        jsonResponse(['success' => true, 'message' => 'Feedback marked as processed']);
    }

    // Regular feedback submission (public)
    global $VALID_PRODUCTS, $PRODUCT_NAMES;

    $product = strtolower(trim($input['product'] ?? ''));
    if (empty($product) || !in_array($product, $VALID_PRODUCTS)) {
        jsonResponse(['error' => 'Invalid product'], 400);
    }

    $message = trim($input['message'] ?? '');
    if (empty($message)) {
        jsonResponse(['error' => 'Message is required'], 400);
    }

    $type = in_array($input['type'] ?? '', ['feedback', 'bug', 'feature', 'question']) ? $input['type'] : 'feedback';
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL) ? $input['email'] : null;
    $userAgent = substr($input['user_agent'] ?? '', 0, 2000);
    $url = substr($input['url'] ?? '', 0, 500);
    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    $context = isset($input['context']) && is_array($input['context']) ? json_encode($input['context']) : null;

    $stmt = $pdo->prepare("
        INSERT INTO feedback (product, type, message, email, user_agent, url, context, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$product, $type, $message, $email, $userAgent, $url, $context, $ipAddress]);
    $feedbackId = $pdo->lastInsertId();

    // Send email notification
    sendFeedbackNotification($feedbackId, $PRODUCT_NAMES[$product] ?? $product, $type, $message, $email, $context);

    jsonResponse(['success' => true, 'message' => 'Feedback submitted', 'id' => (int)$feedbackId]);

} catch (Throwable $e) {
    error_log("Feedback error: " . $e->getMessage());
    jsonResponse(['error' => 'Server error', 'debug' => $e->getMessage()], 500);
}

function sendFeedbackNotification($id, $productName, $type, $message, $email, $context) {
    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = $_ENV['SMTP_USERNAME'] ?? '';
        $mail->Password = $_ENV['SMTP_PASSWORD'] ?? '';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = intval($_ENV['SMTP_PORT'] ?? 587);
        $mail->setFrom($_ENV['SMTP_FROM'] ?? 'noreply@vandromeda.com', "$productName Feedback");
        $mail->addAddress('info@vandromeda.com');
        if ($email) $mail->addReplyTo($email);

        $typeLabels = ['feedback' => 'General Feedback', 'bug' => 'Bug Report', 'feature' => 'Feature Request', 'question' => 'Question'];
        $typeLabel = $typeLabels[$type] ?? 'Feedback';

        $mail->isHTML(true);
        $mail->Subject = "[$productName] New $typeLabel (#$id)";
        $mail->Body = "<h2>$productName Feedback (#$id)</h2><p><strong>Type:</strong> $typeLabel</p><p><strong>From:</strong> " . ($email ?: 'Anonymous') . "</p><h3>Message:</h3><pre>$message</pre>";
        $mail->AltBody = "New $typeLabel from $productName (#$id)\n\n$message";
        $mail->send();
    } catch (Exception $e) {
        error_log("Failed to send feedback email: " . $e->getMessage());
    }
}
