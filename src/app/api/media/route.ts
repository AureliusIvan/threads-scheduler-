import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from our database
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 2MB limit' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = mediaType === 'video' ? ALLOWED_TYPES.video : ALLOWED_TYPES.image;
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `${dbUser.id}/${timestamp}-${Math.random().toString(36).substring(2)}.${extension}`;
    const storagePath = `uploads/${filename}`;

    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(storagePath);

      // Save to database
      const { data: mediaRecord, error: dbError } = await supabase
        .from('media_uploads')
        .insert({
          user_id: dbUser.id,
          filename: file.name,
          storage_path: storagePath,
          file_type: file.type,
          file_size: file.size,
          public_url: publicUrl,
          upload_status: 'completed',
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Try to clean up uploaded file
        await supabase.storage.from('media').remove([storagePath]);
        return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 });
      }

      return NextResponse.json({
        id: mediaRecord.id,
        filename: mediaRecord.filename,
        url: publicUrl,
        type: file.type,
        size: file.size,
        storage_path: storagePath,
      }, { status: 201 });

    } catch (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in media upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from our database
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const type = url.searchParams.get('type'); // 'image' or 'video'
    const offset = (page - 1) * limit;

    let query = supabase
      .from('media_uploads')
      .select('*')
      .eq('user_id', dbUser.id)
      .eq('upload_status', 'completed')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      const typeFilter = type === 'image' ? ALLOWED_TYPES.image : ALLOWED_TYPES.video;
      query = query.in('file_type', typeFilter);
    }

    const { data: media, error: mediaError } = await query;

    if (mediaError) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
    }

    // Get total count
    let countQuery = supabase
      .from('media_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', dbUser.id)
      .eq('upload_status', 'completed');

    if (type) {
      const typeFilter = type === 'image' ? ALLOWED_TYPES.image : ALLOWED_TYPES.video;
      countQuery = countQuery.in('file_type', typeFilter);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      media,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 