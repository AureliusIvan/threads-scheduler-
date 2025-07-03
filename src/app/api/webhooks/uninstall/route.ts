import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature (recommended for production)
    // const signature = request.headers.get('x-hub-signature-256');
    // if (!verifyWebhookSignature(body, signature)) {
    //   return new Response('Invalid signature', { status: 401 });
    // }

    console.log('Uninstall webhook received:', body);

    // Process uninstall events
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
  } catch (error) {
    console.error('Uninstall webhook error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

async function handleAppUninstall(userId: string) {
  const supabase = createClient();
  
  try {
    // Mark user as inactive and clear sensitive data
    const { error } = await supabase
      .from('users')
      .update({
        threads_access_token: null,
        threads_token_expires_at: null,
        is_active: false,
        uninstalled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('threads_user_id', userId);

    if (error) {
      console.error('Failed to update user on uninstall:', error);
      return;
    }

    // Cancel any scheduled posts for this user
    await supabase
      .from('posts')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'scheduled');

    console.log(`App uninstalled for user: ${userId}`);
  } catch (error) {
    console.error(`Failed to handle uninstall for user ${userId}:`, error);
  }
} 