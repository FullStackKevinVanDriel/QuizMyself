<?php
/**
 * Feedback API Endpoint
 *
 * Handles feedback operations for the QuizMyself product integration.
 *
 * GET  ?product=quizmyself&unprocessed=true - Returns unprocessed feedback
 * POST action=mark_processed               - Marks feedback as processed with GitHub issue link
 * PATCH                                     - Updates feedback status
 */

declare(strict_types=1);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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
 * Build lifecycle history events from feedback item data
 * Infers status changes from available timestamps
 */
function buildLifecycleHistory(array $item): array {
    $events = [];

    // Birth event (created)
    if (!empty($item['created_at'])) {
        $events[] = [
            'type' => 'created',
            'description' => ucfirst($item['type'] ?? 'Item') . ' submitted',
            'timestamp' => $item['created_at'],
        ];
    }

    // Processed event (linked to GitHub)
    if (!empty($item['processed_at'])) {
        $description = 'Linked to GitHub';
        if (!empty($item['github_issue'])) {
            $description .= ' issue #' . $item['github_issue'];
        }
        $events[] = [
            'type' => 'processed',
            'description' => $description,
            'timestamp' => $item['processed_at'],
            'github_issue' => $item['github_issue'] ?? null,
            'github_issue_url' => $item['github_issue_url'] ?? null,
        ];
    }

    // Infer status changes based on current status
    $statusDescriptions = [
        'pending' => 'Awaiting review',
        'processing' => 'Development started',
        'resolved' => 'Resolved and deployed',
        'wontfix' => 'Marked as won\'t fix',
        'duplicate' => 'Marked as duplicate',
        'invalid' => 'Marked as invalid',
    ];

    // If status is not pending, add a status change event
    if (!empty($item['status']) && $item['status'] !== 'pending') {
        $statusTime = $item['processed_at'] ?? $item['created_at'];
        $events[] = [
            'type' => 'status_change',
            'description' => $statusDescriptions[$item['status']] ?? 'Status updated to ' . $item['status'],
            'status' => $item['status'],
            'timestamp' => $statusTime,
        ];
    }

    // Sort events by timestamp
    usort($events, function($a, $b) {
        return strtotime($a['timestamp']) - strtotime($b['timestamp']);
    });

    return $events;
}

/**
 * Handle GET requests - retrieve feedback
 */
function handleGet(PDO $db, array $tokenData): void {
    if (!hasPermission($tokenData, 'feedback:read')) {
        errorResponse('Permission denied: feedback:read required', 403);
    }

    // Check for single item fetch by ID
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $includeHistory = isset($_GET['history']) && $_GET['history'] === 'true';

    // Single item fetch
    if ($id !== null && $id > 0) {
        $stmt = $db->prepare("
            SELECT id, product, type, message, email, user_agent, url, context,
                   status, github_issue, github_issue_url, processed_at, created_at
            FROM feedback
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $item = $stmt->fetch();

        if (!$item) {
            errorResponse('Feedback not found', 404);
        }

        // Parse JSON context field
        $item['context'] = json_decode($item['context'] ?? '{}', true);

        // Include lifecycle history if requested
        if ($includeHistory) {
            $item['history'] = buildLifecycleHistory($item);
        }

        jsonResponse([
            'success' => true,
            'data' => $item,
        ]);
        return;
    }

    $product = $_GET['product'] ?? null;
    $unprocessed = isset($_GET['unprocessed']) && $_GET['unprocessed'] === 'true';
    $status = $_GET['status'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 100), 500);
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    $conditions = [];
    $params = [];

    if ($product) {
        $conditions[] = 'product = ?';
        $params[] = $product;
    }

    if ($unprocessed) {
        $conditions[] = 'processed_at IS NULL';
    }

    if ($status) {
        $conditions[] = 'status = ?';
        $params[] = $status;
    }

    $whereClause = '';
    if (!empty($conditions)) {
        $whereClause = 'WHERE ' . implode(' AND ', $conditions);
    }

    // Get total count
    $countStmt = $db->prepare("SELECT COUNT(*) as total FROM feedback $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    // Get feedback items
    $sql = "
        SELECT id, product, type, message, email, user_agent, url, context,
               status, github_issue, github_issue_url, processed_at, created_at
        FROM feedback
        $whereClause
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ";

    $stmt = $db->prepare($sql);
    $params[] = $limit;
    $params[] = $offset;
    $stmt->execute($params);
    $feedback = $stmt->fetchAll();

    // Parse JSON context field and optionally include history
    foreach ($feedback as &$item) {
        $item['context'] = json_decode($item['context'] ?? '{}', true);
        if ($includeHistory) {
            $item['history'] = buildLifecycleHistory($item);
        }
    }

    jsonResponse([
        'success' => true,
        'data' => $feedback,
        'pagination' => [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total,
        ],
    ]);
}

/**
 * Handle POST requests - mark feedback as processed
 */
function handlePost(PDO $db, array $tokenData): void {
    if (!hasPermission($tokenData, 'feedback:write')) {
        errorResponse('Permission denied: feedback:write required', 403);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        // Try form data
        $input = $_POST;
    }

    $action = $input['action'] ?? null;

    if ($action !== 'mark_processed') {
        errorResponse('Invalid action. Supported: mark_processed');
    }

    $feedbackId = (int)($input['feedback_id'] ?? 0);
    $githubIssue = isset($input['github_issue']) ? (int)$input['github_issue'] : null;
    $githubIssueUrl = $input['github_issue_url'] ?? null;

    if ($feedbackId <= 0) {
        errorResponse('feedback_id is required and must be a positive integer');
    }

    // Validate GitHub issue URL if provided
    if ($githubIssueUrl && !filter_var($githubIssueUrl, FILTER_VALIDATE_URL)) {
        errorResponse('Invalid github_issue_url format');
    }

    // Check if feedback exists
    $checkStmt = $db->prepare("SELECT id FROM feedback WHERE id = ?");
    $checkStmt->execute([$feedbackId]);
    if (!$checkStmt->fetch()) {
        errorResponse('Feedback not found', 404);
    }

    // Update the feedback
    $stmt = $db->prepare("
        UPDATE feedback
        SET processed_at = NOW(),
            github_issue = ?,
            github_issue_url = ?,
            status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END
        WHERE id = ?
    ");
    $stmt->execute([$githubIssue, $githubIssueUrl, $feedbackId]);

    // Fetch updated record
    $fetchStmt = $db->prepare("SELECT * FROM feedback WHERE id = ?");
    $fetchStmt->execute([$feedbackId]);
    $updated = $fetchStmt->fetch();
    $updated['context'] = json_decode($updated['context'] ?? '{}', true);

    jsonResponse([
        'success' => true,
        'message' => 'Feedback marked as processed',
        'data' => $updated,
    ]);
}

/**
 * Handle PATCH requests - update feedback status
 */
function handlePatch(PDO $db, array $tokenData): void {
    if (!hasPermission($tokenData, 'feedback:write')) {
        errorResponse('Permission denied: feedback:write required', 403);
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        errorResponse('Invalid JSON in request body');
    }

    $feedbackId = (int)($input['feedback_id'] ?? 0);
    $status = $input['status'] ?? null;

    if ($feedbackId <= 0) {
        errorResponse('feedback_id is required and must be a positive integer');
    }

    $validStatuses = ['pending', 'processing', 'resolved', 'wontfix', 'duplicate', 'invalid'];
    if (!$status || !in_array($status, $validStatuses)) {
        errorResponse('Invalid status. Allowed: ' . implode(', ', $validStatuses));
    }

    // Check if feedback exists
    $checkStmt = $db->prepare("SELECT id FROM feedback WHERE id = ?");
    $checkStmt->execute([$feedbackId]);
    if (!$checkStmt->fetch()) {
        errorResponse('Feedback not found', 404);
    }

    // Build update query
    $updates = ['status = ?'];
    $params = [$status];

    // Optional fields to update
    if (isset($input['github_issue'])) {
        $updates[] = 'github_issue = ?';
        $params[] = (int)$input['github_issue'];
    }

    if (isset($input['github_issue_url'])) {
        if ($input['github_issue_url'] && !filter_var($input['github_issue_url'], FILTER_VALIDATE_URL)) {
            errorResponse('Invalid github_issue_url format');
        }
        $updates[] = 'github_issue_url = ?';
        $params[] = $input['github_issue_url'];
    }

    $params[] = $feedbackId;

    $sql = "UPDATE feedback SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    // Fetch updated record
    $fetchStmt = $db->prepare("SELECT * FROM feedback WHERE id = ?");
    $fetchStmt->execute([$feedbackId]);
    $updated = $fetchStmt->fetch();
    $updated['context'] = json_decode($updated['context'] ?? '{}', true);

    jsonResponse([
        'success' => true,
        'message' => 'Feedback status updated',
        'data' => $updated,
    ]);
}

// Main execution
try {
    $db = getDbConnection();
    $tokenData = authenticate($db);

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            handleGet($db, $tokenData);
            break;
        case 'POST':
            handlePost($db, $tokenData);
            break;
        case 'PATCH':
            handlePatch($db, $tokenData);
            break;
        default:
            errorResponse('Method not allowed', 405);
    }
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    errorResponse('Database error occurred', 500);
} catch (Exception $e) {
    error_log("Unexpected error: " . $e->getMessage());
    errorResponse('An unexpected error occurred', 500);
}
