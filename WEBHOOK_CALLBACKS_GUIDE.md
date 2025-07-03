# Meta API Callback URLs Complete Guide

This guide explains all the different callback URLs used in Meta API integration and how to implement them.

## 📋 Overview

| Callback Type | Purpose | Required | When It's Called |
|---------------|---------|----------|------------------|
| **Redirect Callback** | OAuth flow completion | ✅ Required | User authorizes your app |
| **Uninstall Callback** | App removal notification | ⚠️ Recommended | User removes your app |
| **Data Deletion** | GDPR compliance | ✅ Required for production | User requests data deletion |

## 🔗 1. Redirect Callback URLs (OAuth)

### Purpose
Handle the OAuth authorization flow when users sign in with Meta/Threads.

### Configuration Location
**Meta Dashboard**: App → Threads API → Settings → **Redirect URIs**

### URLs to Add
```
Development: https://localhost:3000/api/auth/callback/meta
Production:  https://yourapp.com/api/auth/callback/meta
```

### Implementation
```typescript
// File: src/app/api/auth/callback/meta/route.ts
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  
  if (error) {
    // Handle OAuth error
    return new Response(`OAuth error: ${error}`, { status: 400 });
  }
  
  // Exchange code for access token
  const tokenResponse = await exchangeCodeForToken(code);
  
  // Save user data to database
  // Redirect to dashboard
}
```

### Flow
1. User clicks "Sign in with Threads"
2. Redirected to Meta OAuth page
3. User authorizes your app
4. Meta redirects to your callback URL with authorization code
5. Your app exchanges code for access token
6. User is logged in and redirected to dashboard

## 🚪 2. Uninstall Callback URL

### Purpose
Receive notifications when users remove your app from their Meta account.

### Configuration Location
**Meta Dashboard**: App → Threads API → Settings → **Deauthorize Callback URL**

### URL to Add
```
https://yourapp.com/api/webhooks/uninstall
```

### Implementation
```typescript
// File: src/app/api/webhooks/uninstall/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Verify webhook signature for security
  const isValid = verifyWebhookSignature(body, signature, secret);
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Process uninstall event
  if (body.object === 'user' && body.entry) {
    for (const entry of body.entry) {
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'app_uninstall') {
            await handleAppUninstall(change.value.user_id);
          }
        }
      }
    }
  }
  
  return new Response('OK', { status: 200 });
}
```

### What to Do on Uninstall
1. **Mark user as inactive** in your database
2. **Clear access tokens** (security best practice)
3. **Cancel scheduled posts** for that user
4. **Optionally preserve data** for potential re-authorization
5. **Log the event** for analytics

### Sample Webhook Payload
```json
{
  "object": "user",
  "entry": [{
    "id": "USER_ID",
    "time": 1672531200,
    "changes": [{
      "field": "app_uninstall",
      "value": {
        "user_id": "USER_ID"
      }
    }]
  }]
}
```

## 🗑️ 3. Data Deletion Callback URL

### Purpose
Handle GDPR/privacy compliance when users request data deletion through Meta's interface.

### Configuration Location
**Meta Dashboard**: App → App Settings → Basic → **Data Deletion Request URL**

### URL to Add
```
https://yourapp.com/api/webhooks/data-deletion
```

### Implementation
```typescript
// File: src/app/api/webhooks/data-deletion/route.ts
export async function POST(request: NextRequest) {
  const { user_id, confirmation_code } = await request.json();
  
  // Verify webhook signature
  const isValid = verifyWebhookSignature(body, signature, secret);
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Process data deletion
  const result = await handleDataDeletion(user_id, confirmation_code);
  
  if (result.success) {
    // Return confirmation URL
    return Response.json({
      url: `${process.env.NEXTAUTH_URL}/data-deletion-status?code=${confirmation_code}`,
      confirmation_code: confirmation_code
    });
  }
  
  return new Response('Deletion failed', { status: 500 });
}
```

### What to Delete
1. **User profile data** (name, email, etc.)
2. **All user posts** and scheduled content
3. **Analytics data** tied to the user
4. **Media files** uploaded by the user
5. **User settings** and preferences
6. **Access tokens** and auth data

### Data Deletion Requirements
- **Complete within 30 days** of request
- **Delete ALL user data** from your systems
- **Provide confirmation URL** back to Meta
- **Log the deletion** for compliance records

### Sample Webhook Payload
```json
{
  "user_id": "USER_ID",
  "confirmation_code": "UNIQUE_CONFIRMATION_CODE"
}
```

## 🔐 Security Best Practices

### 1. Webhook Signature Verification
Always verify webhook signatures to ensure they're from Meta:

```typescript
import { verifyWebhookSignature } from '@/lib/webhook-security';

const signature = request.headers.get('x-hub-signature-256');
const isValid = verifyWebhookSignature(requestBody, signature, webhookSecret);

if (!isValid) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 2. Environment Variables
```env
# Add to your .env.local
THREADS_WEBHOOK_SECRET=your_webhook_secret_from_meta_dashboard
```

### 3. HTTPS Required
- All callback URLs **must use HTTPS** in production
- Use ngrok for local development testing
- Meta will reject HTTP URLs

### 4. Idempotency
Handle duplicate webhook deliveries gracefully:

```typescript
// Check if event was already processed
const existingEvent = await getWebhookEvent(eventId);
if (existingEvent) {
  return new Response('Already processed', { status: 200 });
}
```

## 🧪 Testing Your Webhooks

### 1. Using Meta's Webhook Tester
1. Go to your app dashboard
2. Navigate to Webhooks section
3. Use the "Test" button to send sample payloads

### 2. Manual Testing with ngrok
```bash
# Start your app
npm run dev

# In another terminal, expose via HTTPS
ngrok http 3000

# Update Meta dashboard with ngrok URL
# Test the webhook endpoints
```

### 3. Webhook Verification
```bash
# Test uninstall webhook
curl -X POST https://your-ngrok-url.ngrok.io/api/webhooks/uninstall \
  -H "Content-Type: application/json" \
  -d '{"object":"user","entry":[{"changes":[{"field":"app_uninstall","value":{"user_id":"test123"}}]}]}'

# Test data deletion webhook
curl -X POST https://your-ngrok-url.ngrok.io/api/webhooks/data-deletion \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test123","confirmation_code":"abc123"}'
```

## 📊 Monitoring & Logging

### 1. Webhook Event Logging
```typescript
// Log all webhook events for debugging
await supabase
  .from('webhook_events')
  .insert({
    event_type: 'app_uninstall',
    user_id: userId,
    payload: requestBody,
    status: 'processed'
  });
```

### 2. Error Tracking
```typescript
try {
  await processWebhook(body);
} catch (error) {
  console.error('Webhook processing failed:', error);
  
  // Log error for investigation
  await logWebhookError(eventId, error.message);
  
  // Return 500 so Meta retries
  return new Response('Internal error', { status: 500 });
}
```

## 🚨 Common Issues & Solutions

### "Invalid Redirect URI"
- Ensure exact match between Meta dashboard and your environment variable
- Include protocol (https://)
- No trailing slashes

### "Webhook Not Receiving Data"
- Check HTTPS requirement
- Verify URL is publicly accessible
- Confirm webhook secret is correct
- Check server logs for errors

### "Signature Verification Failed"
- Ensure webhook secret matches Meta dashboard
- Check payload is exactly as received (no JSON parsing before verification)
- Use raw request body for signature verification

### "Data Deletion Not Working"
- Ensure complete data removal (not just marking as deleted)
- Check all related tables and foreign keys
- Provide proper confirmation URL back to Meta

## 📝 Checklist for Production

- [ ] All callback URLs use HTTPS
- [ ] Webhook signature verification implemented
- [ ] Error handling and logging in place
- [ ] Data deletion removes ALL user data
- [ ] Uninstall callback properly deactivates users
- [ ] Test webhooks with Meta's testing tools
- [ ] Monitor webhook logs and success rates
- [ ] GDPR compliance documentation ready

## 🔗 Useful Links

- [Meta Webhooks Documentation](https://developers.facebook.com/docs/graph-api/webhooks)
- [Threads API Webhooks](https://developers.facebook.com/docs/threads/webhooks)
- [Data Deletion Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback)
- [Webhook Security](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests) 