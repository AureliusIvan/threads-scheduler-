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

    console.log('Data deletion request received:', body);

    const { user_id, confirmation_code } = body;

    if (!user_id || !confirmation_code) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Process data deletion request
    const deletionResult = await handleDataDeletion(user_id, confirmation_code);

    if (deletionResult.success) {
      // Respond with confirmation URL
      return Response.json({
        url: `${process.env.NEXTAUTH_URL}/data-deletion-status?code=${confirmation_code}`,
        confirmation_code: confirmation_code
      });
    } else {
      return new Response('Data deletion failed', { status: 500 });
    }
  } catch (error) {
    console.error('Data deletion webhook error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

async function handleDataDeletion(userId: string, confirmationCode: string) {
  const supabase = createClient();
  
  try {
    // Log the deletion request
    console.log(`Processing data deletion for user: ${userId}, confirmation: ${confirmationCode}`);

    // Start a transaction-like approach (Supabase doesn't have true transactions)
    // Delete user's posts and related data
    const { error: postsError } = await supabase
      .from('posts')
      .delete()
      .eq('user_id', userId);

    if (postsError) {
      console.error('Failed to delete posts:', postsError);
    }

    // Delete user's media files
    const { error: mediaError } = await supabase
      .from('media')
      .delete()
      .eq('user_id', userId);

    if (mediaError) {
      console.error('Failed to delete media:', mediaError);
    }

    // Delete user's analytics data
    const { error: analyticsError } = await supabase
      .from('analytics')
      .delete()
      .eq('user_id', userId);

    if (analyticsError) {
      console.error('Failed to delete analytics:', analyticsError);
    }

    // Delete user's settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId);

    if (settingsError) {
      console.error('Failed to delete settings:', settingsError);
    }

    // Finally, delete the user record
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('threads_user_id', userId);

    if (userError) {
      console.error('Failed to delete user:', userError);
      return { success: false, error: userError };
    }

    // Log successful deletion
    await logDataDeletion(userId, confirmationCode);

    console.log(`Data deletion completed for user: ${userId}`);
    return { success: true };

  } catch (error) {
    console.error(`Data deletion failed for user ${userId}:`, error);
    return { success: false, error };
  }
}

async function logDataDeletion(userId: string, confirmationCode: string) {
  const supabase = createClient();
  
  try {
    // Create a deletion log entry (this table would be separate and not tied to user)
    await supabase
      .from('data_deletion_logs')
      .insert({
        user_id: userId,
        confirmation_code: confirmationCode,
        deleted_at: new Date().toISOString(),
        status: 'completed'
      });
  } catch (error) {
    console.error('Failed to log data deletion:', error);
  }
}

// GET endpoint to check deletion status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const confirmationCode = searchParams.get('code');

  if (!confirmationCode) {
    return new Response('Missing confirmation code', { status: 400 });
  }

  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('data_deletion_logs')
      .select('*')
      .eq('confirmation_code', confirmationCode)
      .single();

    if (error || !data) {
      return Response.json({ 
        status: 'not_found',
        message: 'Deletion request not found' 
      });
    }

    return Response.json({
      status: data.status,
      deleted_at: data.deleted_at,
      confirmation_code: confirmationCode
    });

  } catch (error) {
    console.error('Error checking deletion status:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 