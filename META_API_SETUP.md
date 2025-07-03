# Meta API Platform Setup Guide

This guide walks you through setting up the Meta API platform for Threads API integration.

## 🚀 Step-by-Step Setup

### 1. Create Meta Developer Account

1. Visit [Meta for Developers](https://developers.facebook.com/)
2. Click **"Get Started"** or log in with your Meta/Facebook account
3. Complete the developer account verification if prompted

### 2. Create a New App

1. In the Meta Developer dashboard, click **"Create App"**
2. Select **"Consumer"** as app type
3. Fill in app details:
   - **App Name**: Your application name (e.g., "My Threads Scheduler")
   - **App Contact Email**: Your email address
   - **Business Account**: Optional but recommended for production

### 3. Add Threads API

1. In your app dashboard, find **"Add Products to Your App"**
2. Locate **"Threads API"** and click **"Set up"**
3. This adds the Threads API product to your app

### 4. Configure App Settings

1. Go to **"App Settings" → "Basic"**
2. Note your **App ID** and **App Secret** (keep these secure!)
3. Add **App Domains**:
   ```
   localhost
   your-production-domain.com
   ```
4. Set required URLs for production:
   - **Privacy Policy URL**: Required for app review
   - **Terms of Service URL**: Required for app review

### 5. Configure Threads API Settings

1. Navigate to **"Threads API" → "Settings"**
2. Add **Redirect URIs**:
   ```
   https://localhost:3000/api/auth/callback/meta
   https://your-domain.com/api/auth/callback/meta
   ```
3. Set **Deauthorize Callback URL** (optional):
   ```
   https://your-domain.com/api/auth/deauthorize
   ```
4. Set **Data Deletion Request URL** (required for production):
   ```
   https://your-domain.com/api/auth/data-deletion
   ```

## 🔧 Environment Configuration

### 1. Copy Environment Template

```bash
cp env.example .env.local
```

### 2. Fill in Your Credentials

Edit `.env.local` with your Meta app credentials:

```env
# Meta/Threads API Configuration
THREADS_APP_ID=your_app_id_from_meta_dashboard
THREADS_APP_SECRET=your_app_secret_from_meta_dashboard
THREADS_REDIRECT_URI=https://localhost:3000/api/auth/callback/meta

# Threads API Settings
THREADS_API_VERSION=v1.0
THREADS_API_BASE_URL=https://graph.threads.net

# OAuth Scopes (don't change unless you know what you're doing)
THREADS_SCOPES=threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies

# App Settings
NEXTAUTH_URL=https://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string_here

# Database (Supabase) - from your Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 🗄️ Database Setup

### 1. Run Migration

Apply the Threads authentication migration:

```bash
npx supabase migration up
```

### 2. Verify Tables

Check that the `users` table has the new fields:
- `threads_user_id`
- `threads_access_token`
- `threads_token_expires_at`
- `username`
- `display_name`

## 🔐 Local Development with HTTPS

Threads API requires HTTPS for OAuth callbacks. For local development:

### Option 1: Use ngrok (Recommended)

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, expose it via HTTPS
ngrok http 3000
```

Then update your Meta app's redirect URI to use the ngrok URL.

### Option 2: Self-signed certificates

```bash
# Install mkcert
brew install mkcert  # macOS
# or
sudo apt install mkcert  # Ubuntu

# Create certificates
mkcert localhost

# Update your Next.js config to use HTTPS in development
```

## 🧪 Testing the Setup

### 1. Start Your Application

```bash
npm run dev
```

### 2. Test Authentication Flow

1. Visit `/api/auth/signin`
2. You should be redirected to Threads/Meta OAuth
3. After authorizing, you should be redirected back to `/dashboard`
4. Check your database to see if user data was stored

### 3. Test API Client

```typescript
import { createThreadsClient } from '@/lib/threads-api';

// In your component or API route
const client = createThreadsClient(userAccessToken, true); // debug mode
const userInfo = await client.getMe();
console.log('User info:', userInfo);
```

## 🚨 Common Issues

### "Invalid Redirect URI"
- Make sure your redirect URI in Meta dashboard exactly matches your environment variable
- Include the protocol (https://)
- Don't include trailing slashes

### "App Not Approved for Public Use"
- During development, only you can test the app
- For production, submit for Meta review
- Add test users in Meta dashboard for beta testing

### "Invalid Scopes"
- Make sure you've added the Threads API product to your app
- Verify the scopes in your environment match what's configured

### HTTPS Issues in Development
- Use ngrok or set up proper SSL certificates
- Threads API requires HTTPS for all OAuth callbacks

## 📝 Next Steps

1. ✅ Complete this setup guide
2. ✅ Test authentication flow
3. ✅ Implement posting functionality
4. ✅ Add scheduling features
5. ✅ Submit for Meta app review (for production)

## 🔗 Useful Links

- [Meta for Developers](https://developers.facebook.com/)
- [Threads API Documentation](https://developers.facebook.com/docs/threads)
- [Meta App Review Process](https://developers.facebook.com/docs/app-review)
- [Threads API Permissions](https://developers.facebook.com/docs/threads/overview#permissions)

## 🆘 Need Help?

If you encounter issues:
1. Check the Meta Developer docs
2. Review your app's webhook logs in Meta dashboard
3. Check browser network tab for OAuth errors
4. Verify all environment variables are set correctly 