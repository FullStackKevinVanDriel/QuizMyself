# QuizMyself API Reference

> **Base URL:** `https://www.vandromeda.com/api`
> **Version:** 1.0
> **Last Updated:** January 2026

---

## Table of Contents

1. [Authentication](#authentication)
2. [Feedback API](#feedback-api)
3. [Quiz Data API](#quiz-data-api)
4. [AI Generation API](#ai-generation-api)
5. [License API](#license-api)
6. [Error Handling](#error-handling)
7. [Rate Limits](#rate-limits)

---

## Authentication

### Methods

#### 1. Bearer Token (Server-to-Server)

Used for automated systems and GitHub Actions.

```http
Authorization: Bearer <64-character-token>
```

**Generating tokens:**
```bash
php generate-token.php --name="My Token" --permissions="feedback:read,feedback:write"
```

**Permissions:**
| Permission | Description |
|------------|-------------|
| `feedback:read` | Read feedback entries |
| `feedback:write` | Create/update feedback |
| `feedback:notify` | Send email notifications |
| `*` | All permissions |

#### 2. Firebase Token (User Authentication)

Used for authenticated user requests.

```http
Authorization: Bearer <firebase-id-token>
```

Obtained via Firebase SDK:
```javascript
const token = await firebase.auth().currentUser.getIdToken();
```

#### 3. Keyword Authentication (Guest Mode)

Used for keyword-only users (no login).

```http
X-Quiz-Keyword: myquiz123
```

Or as query parameter:
```
?keyword=myquiz123
```

---

## Feedback API

### Submit Feedback

Create a new feedback entry. **No authentication required.**

```http
POST /feedback.php
Content-Type: application/json
```

**Request Body:**
```json
{
  "product": "quizmyself",
  "type": "bug",
  "message": "Description of the issue...",
  "email": "user@example.com",
  "user_agent": "Mozilla/5.0...",
  "url": "https://example.com/page",
  "context": {
    "keyword": "myquiz",
    "browser": "Chrome"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| product | string | Yes | Product identifier (`quizmyself`) |
| type | string | Yes | `bug`, `feature`, `question`, `feedback` |
| message | string | Yes | Feedback content |
| email | string | No | User's email for follow-up |
| user_agent | string | No | Browser user agent |
| url | string | No | Page URL where feedback was submitted |
| context | object | No | Additional context data |

**Response:**
```json
{
  "success": true,
  "message": "Feedback submitted",
  "id": 123
}
```

---

### Get Public Roadmap

Retrieve public feedback list for in-app display. **No authentication required.**

```http
GET /feedback.php?product=quizmyself&public=true&limit=50
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| product | string | Required | Product identifier |
| public | string | Required | Must be `true` |
| limit | integer | 50 | Max items (1-100) |

**Response:**
```json
{
  "success": true,
  "feedback": [
    {
      "id": 123,
      "type": "bug",
      "title": "Message truncated to 100 chars...",
      "status": "new",
      "status_label": "Open",
      "github_issue": 456,
      "github_issue_url": "https://github.com/.../issues/456",
      "created_at": "2026-01-18 12:00:00",
      "is_resolved": false
    }
  ],
  "stats": {
    "total": 25,
    "resolved": 10,
    "in_progress": 3,
    "open": 12,
    "bugs": 15,
    "features": 10
  }
}
```

**Status Values:**
| Status | Label | Description |
|--------|-------|-------------|
| new | Open | Newly submitted |
| reviewed | Reviewed | Seen by team |
| in_progress | In Progress | Being worked on |
| resolved | Resolved | Fixed/completed |
| wont_fix | Won't Fix | Will not be addressed |

---

### Get Unprocessed Feedback

Retrieve feedback not yet synced to GitHub. **Requires `feedback:read` permission.**

```http
GET /feedback.php?product=quizmyself&unprocessed=true
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| product | string | Optional | Filter by product |
| unprocessed | string | false | Only unprocessed items |
| status | string | Optional | Filter by status |
| limit | integer | 100 | Max items (1-500) |
| offset | integer | 0 | Pagination offset |

**Response:**
```json
{
  "success": true,
  "feedback": [
    {
      "id": 123,
      "product": "quizmyself",
      "type": "bug",
      "message": "Full message content...",
      "email": "user@example.com",
      "user_agent": "Mozilla/5.0...",
      "url": "https://example.com",
      "context": {"keyword": "myquiz"},
      "status": "new",
      "github_issue": null,
      "github_issue_url": null,
      "processed_at": null,
      "created_at": "2026-01-18 12:00:00"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 100,
    "offset": 0,
    "has_more": false
  }
}
```

---

### Mark Feedback as Processed

Link feedback to a GitHub issue. **Requires `feedback:write` permission.**

```http
POST /feedback.php
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "mark_processed",
  "id": 123,
  "github_issue": 456,
  "github_issue_url": "https://github.com/owner/repo/issues/456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| action | string | Yes | Must be `mark_processed` |
| id | integer | Yes | Feedback ID |
| github_issue | integer | No | GitHub issue number |
| github_issue_url | string | No | Full GitHub issue URL |

**Response:**
```json
{
  "success": true,
  "message": "Feedback marked as processed"
}
```

---

### Update Feedback Status

Update feedback status or link to GitHub. **Requires `feedback:write` permission.**

```http
PATCH /feedback.php
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "id": 123,
  "status": "resolved",
  "github_issue": 456,
  "github_issue_url": "https://github.com/owner/repo/issues/456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | Yes | Feedback ID |
| status | string | No | new, reviewed, in_progress, resolved, wont_fix |
| github_issue | integer | No | GitHub issue number |
| github_issue_url | string | No | Full GitHub issue URL |

**Response:**
```json
{
  "success": true,
  "message": "Feedback updated"
}
```

---

### Send Notification

Send email notification to feedback submitter. **Requires `feedback:notify` permission.**

```http
POST /feedback-notify.php
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "feedback_id": 123,
  "subject": "Update on your feedback",
  "message": "Your issue has been resolved..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification sent"
}
```

---

## Quiz Data API

### Get Progress

Retrieve user's quiz progress.

```http
GET /quizmyself/progress.php?keyword=myquiz
Authorization: Bearer <firebase-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mastered": [1, 2, 3],
    "answerCounts": {"1": 3, "2": 3, "3": 3},
    "questions": [
      {"id": 1, "question": "...", "answer": "..."}
    ],
    "sources": [
      {"id": 1, "name": "source.pdf", "type": "application/pdf"}
    ],
    "exam_progress": {
      "index": 5,
      "correct": 4,
      "questions": [...]
    }
  }
}
```

---

### Save Progress

Save user's quiz progress.

```http
POST /quizmyself/progress.php
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "keyword": "myquiz",
  "mastered": [1, 2, 3],
  "answerCounts": {"1": 3, "2": 3, "3": 3},
  "questions": [...],
  "exam_progress": {...}
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Upload Source

Upload source material for AI generation.

```http
POST /quizmyself/source.php
Authorization: Bearer <firebase-token>
Content-Type: multipart/form-data
```

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| keyword | string | Yes | Quiz keyword |
| file | file | Yes | Source file (PDF, TXT, etc.) |
| name | string | No | Display name |

**Response:**
```json
{
  "success": true,
  "source_id": 123,
  "name": "document.pdf"
}
```

---

### Link Source to Quiz

Associate a source with questions.

```http
POST /quizmyself/link-source.php
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "keyword": "myquiz",
  "source_id": 123,
  "question_ids": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true
}
```

---

## AI Generation API

### Check Usage

Check AI generation limits.

```http
POST /quizmyself/usage.php
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "keyword": "myquiz",
  "action": "check"
}
```

**Response:**
```json
{
  "success": true,
  "generations_today": 2,
  "generations_limit": 3,
  "refinements_today": 1,
  "refinements_limit": 3,
  "is_pro": false,
  "can_generate": true,
  "can_refine": true
}
```

---

### Generate Questions

Generate questions from source material.

```http
POST /quizmyself/generate-questions.php
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "keyword": "myquiz",
  "source_id": 123,
  "count": 10,
  "difficulty": "medium",
  "focus": "main concepts"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| keyword | string | Yes | Quiz keyword |
| source_id | integer | Yes | Source material ID |
| count | integer | No | Number of questions (5-20, default 10) |
| difficulty | string | No | easy, medium, hard |
| focus | string | No | Focus area or keywords |

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "question": "What is the capital of France?",
      "answer": "Paris"
    }
  ],
  "usage": {
    "generations_today": 3,
    "generations_limit": 3
  }
}
```

---

### Refine Questions

Refine generated questions via chat.

```http
POST /quizmyself/refine-questions.php
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "keyword": "myquiz",
  "questions": [...],
  "instruction": "Make the questions harder and add more detail"
}
```

**Response:**
```json
{
  "success": true,
  "questions": [...],
  "usage": {
    "refinements_today": 2,
    "refinements_limit": 3
  }
}
```

---

## License API

### Validate License

Check if a license key is valid.

```http
POST /license/validate.php
Content-Type: application/json
```

**Request Body:**
```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product": "quizmyself"
}
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "plan": "pro_yearly",
  "expires_at": "2027-01-18",
  "features": ["unlimited_imports", "unlimited_ai", "priority_support"]
}
```

---

### Get License by Session

Retrieve license after Stripe checkout.

```http
GET /license/by-session.php?session_id=cs_xxxx
```

**Response:**
```json
{
  "success": true,
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "email": "user@example.com",
  "plan": "pro_monthly"
}
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": true,
  "message": "Human-readable error description",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Request body is malformed |
| `MISSING_FIELD` | Required field not provided |
| `INVALID_TOKEN` | Authentication token invalid |
| `TOKEN_EXPIRED` | Authentication token expired |
| `PERMISSION_DENIED` | Token lacks required permission |
| `NOT_FOUND` | Requested resource not found |
| `RATE_LIMITED` | Too many requests |
| `QUOTA_EXCEEDED` | Usage limit reached |

---

## Rate Limits

### Global Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints | 100 requests | 1 minute |
| Feedback submit | 10 requests | 1 minute |
| AI generation | 3 requests | 24 hours (free) |

### Pro Tier Limits

Pro users have elevated limits:
- AI generation: Unlimited
- Storage: 50MB
- API requests: 1000/minute

### Rate Limit Headers

Responses include rate limit info:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705569600
```

### Handling Rate Limits

When rate limited, wait and retry:

```javascript
if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 60;
    await sleep(retryAfter * 1000);
    return retry(request);
}
```

---

## Webhooks (Future)

Planned webhook support for:
- Feedback status changes
- License activations
- Usage threshold alerts

---

## SDK Support

### JavaScript (Browser)

```javascript
const VANDROMEDA_API = 'https://www.vandromeda.com/api';

async function submitFeedback(data) {
    const response = await fetch(`${VANDROMEDA_API}/feedback.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}
```

### cURL Examples

```bash
# Submit feedback
curl -X POST https://www.vandromeda.com/api/feedback.php \
  -H "Content-Type: application/json" \
  -d '{"product":"quizmyself","type":"bug","message":"Test"}'

# Get roadmap (public)
curl "https://www.vandromeda.com/api/feedback.php?product=quizmyself&public=true"

# Get unprocessed (auth required)
curl -H "Authorization: Bearer TOKEN" \
  "https://www.vandromeda.com/api/feedback.php?product=quizmyself&unprocessed=true"
```

---

*API Reference v1.0 - January 2026*
