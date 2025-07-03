#!/usr/bin/env node

/**
 * Meta API Setup Validation Script
 * 
 * This script helps verify that your Meta API configuration is correct
 * before attempting to use the Threads API.
 */

require('dotenv').config({ path: '.env.local' });

const requiredEnvVars = [
  'THREADS_APP_ID',
  'THREADS_APP_SECRET', 
  'THREADS_REDIRECT_URI',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

const optionalEnvVars = [
  'THREADS_API_VERSION',
  'THREADS_API_BASE_URL',
  'THREADS_SCOPES',
  'NEXTAUTH_SECRET'
];

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...\n');
  
  let allValid = true;
  
  // Check required variables
  console.log('Required variables:');
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      allValid = false;
    }
  }
  
  console.log('\nOptional variables:');
  for (const varName of optionalEnvVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 30)}...`);
    } else {
      console.log(`⚠️  ${varName}: Not set (using defaults)`);
    }
  }
  
  return allValid;
}

function validateRedirectUri() {
  console.log('\n🔗 Validating redirect URI...\n');
  
  const redirectUri = process.env.THREADS_REDIRECT_URI;
  
  if (!redirectUri) {
    console.log('❌ THREADS_REDIRECT_URI is not set');
    return false;
  }
  
  try {
    const url = new URL(redirectUri);
    
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
      console.log('❌ Redirect URI must use HTTPS (except for localhost)');
      return false;
    }
    
    if (!url.pathname.includes('/api/auth/callback/meta')) {
      console.log('❌ Redirect URI should point to /api/auth/callback/meta');
      return false;
    }
    
    console.log(`✅ Redirect URI format looks good: ${redirectUri}`);
    return true;
    
  } catch (error) {
    console.log(`❌ Invalid redirect URI format: ${error.message}`);
    return false;
  }
}

async function testSupabaseConnection() {
  console.log('\n🗄️ Testing Supabase connection...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Supabase credentials missing');
    return false;
  }
  
  try {
    // Simple health check
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Supabase connection successful');
      return true;
    } else {
      console.log(`❌ Supabase connection failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Supabase connection error: ${error.message}`);
    return false;
  }
}

function validateAppId() {
  console.log('\n🆔 Validating App ID...\n');
  
  const appId = process.env.THREADS_APP_ID;
  
  if (!appId) {
    console.log('❌ THREADS_APP_ID is not set');
    return false;
  }
  
  if (!/^\d+$/.test(appId)) {
    console.log('❌ App ID should be numeric');
    return false;
  }
  
  if (appId.length < 10) {
    console.log('❌ App ID seems too short (should be 15+ digits)');
    return false;
  }
  
  console.log(`✅ App ID format looks correct: ${appId.substring(0, 6)}...`);
  return true;
}

function generateAuthUrl() {
  console.log('\n🔐 Generating test OAuth URL...\n');
  
  const appId = process.env.THREADS_APP_ID;
  const redirectUri = process.env.THREADS_REDIRECT_URI;
  const scopes = process.env.THREADS_SCOPES || 'threads_basic,threads_content_publish';
  
  if (!appId || !redirectUri) {
    console.log('❌ Cannot generate auth URL - missing App ID or Redirect URI');
    return;
  }
  
  const authUrl = new URL('https://www.threads.net/oauth/authorize');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', 'test-state-' + Date.now());
  
  console.log('✅ Test OAuth URL generated:');
  console.log(`   ${authUrl.toString()}`);
  console.log('\n💡 You can test this URL manually in your browser');
}

function printSummary() {
  console.log('\n📋 Setup Summary:\n');
  console.log('1. ✅ Create Meta Developer account');
  console.log('2. ✅ Create app and add Threads API product');
  console.log('3. ✅ Configure redirect URIs in Meta dashboard');
  console.log('4. ✅ Set environment variables');
  console.log('5. ⏳ Run database migration: npx supabase migration up');
  console.log('6. ⏳ Test authentication flow: visit /api/auth/signin');
  console.log('\n🔗 Next: Start your app with npm run dev and test the OAuth flow!');
}

async function main() {
  console.log('🚀 Meta API Setup Validation\n');
  console.log('=' .repeat(50));
  
  const envValid = checkEnvironmentVariables();
  const redirectValid = validateRedirectUri();
  const appIdValid = validateAppId();
  const supabaseValid = await testSupabaseConnection();
  
  console.log('\n' + '='.repeat(50));
  
  if (envValid && redirectValid && appIdValid && supabaseValid) {
    console.log('\n🎉 Configuration looks good! Ready to test OAuth flow.');
    generateAuthUrl();
  } else {
    console.log('\n⚠️  Some issues found. Please fix them before proceeding.');
    console.log('\n📖 Check META_API_SETUP.md for detailed setup instructions.');
  }
  
  printSummary();
}

// Run the validation
main().catch(error => {
  console.error('\n💥 Validation script failed:', error.message);
  process.exit(1);
}); 