# Vandromeda Feedback API

PHP API endpoints for the feedback integration system. These files handle feedback management, GitHub issue linking, and user notifications for QuizMyself and other Vandromeda products.

## Files

| File | Description |
|------|-------------|
| `feedback.php` | Main API endpoint for CRUD operations on feedback |
| `feedback-notify.php` | Sends email notifications to feedback submitters |
| `generate-token.php` | CLI script to generate API authentication tokens |
| `.env.example` | Example environment configuration |

## Deployment

### 1. Upload Files

Upload all PHP files to your Vandromeda server's web-accessible directory:

```bash
scp *.php user@vandromeda.com:/var/www/api/feedback/
```

### 2. Create Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
chmod 600 .env  # Restrict permissions
```

Edit `.env` with your database and mail settings.

### 3. Database Setup

Run the following SQL to create the required tables:

```sql
-- Feedback storage table
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    email VARCHAR(255),
    user_agent TEXT,
    url VARCHAR(500),
    context JSON,
    status VARCHAR(20) DEFAULT 'pending',
    github_issue INT,
    github_issue_url VARCHAR(500),
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_product (product),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    INDEX idx_processed (processed_at)
);

-- API tokens table
CREATE TABLE api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(100),
    permissions JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
);

-- Optional: Notification log table (auto-created by feedback-notify.php)
CREATE TABLE IF NOT EXISTS feedback_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feedback_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    INDEX idx_feedback_id (feedback_id)
);
```

### 4. Generate API Token

Generate a token for authenticating API requests:

```bash
php generate-token.php --name="GitHub Actions CI" --permissions="feedback:read,feedback:write"
```

Save the generated token securely - it won't be shown again.

## Environment Variables

Create a `.env` file in the same directory as the PHP files:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vandromeda
DB_USER=your_username
DB_PASS=your_password

# Mail Configuration (optional - for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
MAIL_FROM=noreply@vandromeda.com
MAIL_FROM_NAME=Vandromeda Feedback
```

## API Reference

### Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer your_api_token_here
```

### Permissions

| Permission | Description |
|------------|-------------|
| `feedback:read` | Read feedback entries |
| `feedback:write` | Create/update feedback entries |
| `feedback:notify` | Send notification emails |
| `*` | All permissions |

---

## Endpoints

### GET /feedback.php

Retrieve feedback entries.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | int | Fetch a single feedback item by ID |
| `history` | boolean | Set to "true" to include lifecycle history events |
| `product` | string | Filter by product (e.g., "quizmyself") |
| `unprocessed` | boolean | Set to "true" to get only unprocessed feedback |
| `status` | string | Filter by status (pending, processing, resolved, etc.) |
| `limit` | int | Max entries to return (default: 100, max: 500) |
| `offset` | int | Pagination offset (default: 0) |

**Example - List feedback:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.vandromeda.com/feedback.php?product=quizmyself&unprocessed=true"
```

**Example - Get single item with history:**

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.vandromeda.com/feedback.php?id=123&history=true"
```

**Response (list):**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "product": "quizmyself",
      "type": "bug",
      "message": "Login button not working",
      "email": "user@example.com",
      "user_agent": "Mozilla/5.0...",
      "url": "https://quizmyself.com/login",
      "context": {"browser": "Chrome", "os": "Windows"},
      "status": "pending",
      "github_issue": null,
      "github_issue_url": null,
      "processed_at": null,
      "created_at": "2025-01-15 10:30:00"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 100,
    "offset": 0,
    "has_more": false
  }
}
```

**Response (single item with history):**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "product": "quizmyself",
    "type": "bug",
    "message": "Login button not working",
    "status": "resolved",
    "github_issue": 456,
    "github_issue_url": "https://github.com/org/repo/issues/456",
    "processed_at": "2025-01-16 09:00:00",
    "created_at": "2025-01-15 10:30:00",
    "history": [
      {
        "type": "created",
        "description": "Bug submitted",
        "timestamp": "2025-01-15 10:30:00"
      },
      {
        "type": "processed",
        "description": "Linked to GitHub issue #456",
        "timestamp": "2025-01-16 09:00:00",
        "github_issue": 456,
        "github_issue_url": "https://github.com/org/repo/issues/456"
      },
      {
        "type": "status_change",
        "description": "Resolved and deployed",
        "status": "resolved",
        "timestamp": "2025-01-16 09:00:00"
      }
    ]
  }
}
```

---

### POST /feedback.php

Mark feedback as processed and link to GitHub issue.

**Request Body:**

```json
{
  "action": "mark_processed",
  "feedback_id": 123,
  "github_issue": 456,
  "github_issue_url": "https://github.com/org/repo/issues/456"
}
```

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"mark_processed","feedback_id":123,"github_issue":456,"github_issue_url":"https://github.com/org/repo/issues/456"}' \
  "https://api.vandromeda.com/feedback.php"
```

**Response:**

```json
{
  "success": true,
  "message": "Feedback marked as processed",
  "data": {
    "id": 123,
    "status": "processing",
    "github_issue": 456,
    "github_issue_url": "https://github.com/org/repo/issues/456",
    "processed_at": "2025-01-15 11:00:00"
  }
}
```

---

### PATCH /feedback.php

Update feedback status.

**Request Body:**

```json
{
  "feedback_id": 123,
  "status": "resolved",
  "github_issue_url": "https://github.com/org/repo/issues/456"
}
```

**Valid Status Values:**
- `pending` - Not yet reviewed
- `processing` - Being worked on
- `resolved` - Fixed/addressed
- `wontfix` - Won't be fixed
- `duplicate` - Duplicate of another issue
- `invalid` - Not a valid issue

**Example:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feedback_id":123,"status":"resolved"}' \
  "https://api.vandromeda.com/feedback.php"
```

---

### POST /feedback-notify.php

Send email notification to feedback submitter.

**Request Body:**

```json
{
  "feedback_id": 123,
  "message": "Thank you for your feedback! We've fixed the login issue in our latest update.",
  "subject": "Your feedback has been addressed"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `feedback_id` | Yes | ID of the feedback entry |
| `message` | Yes | Message to send to the user (max 5000 chars) |
| `subject` | No | Custom email subject (auto-generated if omitted) |

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feedback_id":123,"message":"We have fixed this issue. Thank you!"}' \
  "https://api.vandromeda.com/feedback-notify.php"
```

**Response:**

```json
{
  "success": true,
  "message": "Notification email sent successfully",
  "data": {
    "feedback_id": 123,
    "email": "user@example.com",
    "subject": "Update on your Bug Report - QuizMyself"
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": true,
  "message": "Description of the error"
}
```

**HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Token lacks required permission |
| 404 | Not Found - Feedback entry not found |
| 405 | Method Not Allowed |
| 500 | Internal Server Error |

---

## Token Management

### Generate a New Token

```bash
# Default token with all feedback permissions
php generate-token.php

# Named token with specific permissions
php generate-token.php --name="CI/CD Pipeline" --permissions="feedback:read,feedback:write"

# Token with expiration
php generate-token.php --name="Temp Access" --permissions="feedback:read" --expires=30

# Admin token with all permissions
php generate-token.php --name="Admin" --permissions="*"
```

### Token Options

| Option | Description |
|--------|-------------|
| `--name=NAME` | Descriptive name for the token |
| `--permissions=PERMS` | Comma-separated list of permissions |
| `--expires=DAYS` | Token expiration in days |
| `--help` | Show help message |

---

## Integration Example

Here's how the feedback system integrates with a GitHub Actions workflow:

```yaml
name: Process Feedback

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  process-feedback:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch unprocessed feedback
        id: fetch
        run: |
          response=$(curl -s -H "Authorization: Bearer ${{ secrets.VANDROMEDA_TOKEN }}" \
            "https://api.vandromeda.com/feedback.php?product=quizmyself&unprocessed=true")
          echo "feedback=$response" >> $GITHUB_OUTPUT

      - name: Create GitHub issues
        run: |
          # Process feedback and create issues...
          # Then mark as processed via POST to feedback.php
```

---

## Security Considerations

1. **Token Storage**: Never commit tokens to version control. Use environment variables or secrets management.

2. **File Permissions**: Restrict `.env` file permissions:
   ```bash
   chmod 600 .env
   ```

3. **HTTPS**: Always use HTTPS in production to protect token transmission.

4. **Token Rotation**: Periodically rotate API tokens, especially after team member departures.

5. **Minimal Permissions**: Grant tokens only the permissions they need.

---

## Troubleshooting

### Database Connection Failed

- Verify `.env` file exists and has correct credentials
- Check MySQL is running: `systemctl status mysql`
- Verify database and user exist

### Token Authentication Fails

- Ensure token hasn't expired
- Check Authorization header format: `Bearer <token>`
- Verify token exists in database: `SELECT * FROM api_tokens WHERE token='...'`

### Email Not Sending

- Check mail server configuration
- Verify `mail()` function is enabled in PHP
- Check server mail logs: `/var/log/mail.log`
- Consider using a dedicated SMTP service

### Permission Denied

- Verify token has required permission in database
- Check permissions JSON format: `["feedback:read", "feedback:write"]`
