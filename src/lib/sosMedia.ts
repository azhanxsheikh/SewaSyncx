import { supabase } from './supabaseClient';
import type { DispatchAttachment } from '../types/dispatch';

const BUCKET = 'sos-media';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function extensionFor(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : undefined;
  const fromType = file.type.split('/')[1];
  return (fromName || fromType || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
}

/**
 * Uploads SOS evidence for a real request: object at
 * `sos-media/{request_id}/{uuid}.{ext}` (DATABASE §13 path convention, which
 * the storage INSERT policy keys on), then a `request_attachments` row
 * pointing at that path. Only the storage path is persisted — never file
 * bytes. Files that fail are logged and skipped so one bad upload doesn't
 * drop the rest.
 */
export async function uploadSosMedia(
  requestId: string,
  userId: string,
  files: File[],
): Promise<DispatchAttachment[]> {
  const uploaded: DispatchAttachment[] = [];

  for (const file of files) {
    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    const storagePath = `${requestId}/${crypto.randomUUID()}.${extensionFor(file)}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error('[sos-media] upload failed', file.name, uploadError.message);
      continue;
    }

    const { data: row, error: rowError } = await supabase
      .from('request_attachments')
      .insert({
        request_id: requestId,
        kind,
        phase: 'pre_work',
        storage_path: storagePath,
        file_name: file.name,
        uploaded_by: userId,
      })
      .select('id')
      .single();
    if (rowError || !row) {
      console.error('[sos-media] attachment row failed', file.name, rowError?.message);
      continue;
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (signError || !signed) {
      console.error('[sos-media] signed URL failed', file.name, signError?.message);
      continue;
    }

    uploaded.push({ id: row.id, name: file.name, type: kind, url: signed.signedUrl, storagePath });
  }

  return uploaded;
}

/**
 * Fetches pre-work evidence media for a given request from `request_attachments`
 * and generates authenticated signed URLs from the private `sos-media` bucket.
 */
export async function fetchRequestAttachments(requestId: string): Promise<DispatchAttachment[]> {
  try {
    const { data: rows, error } = await supabase
      .from('request_attachments')
      .select('id, kind, file_name, storage_path')
      .eq('request_id', requestId);

    if (error || !rows || rows.length === 0) {
      return [];
    }

    const attachments: DispatchAttachment[] = [];
    for (const r of rows) {
      let url = '';
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, SIGNED_URL_TTL_SECONDS);

      if (signed?.signedUrl) {
        url = signed.signedUrl;
      } else {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(r.storage_path);
        url = pub.publicUrl;
      }

      attachments.push({
        id: r.id,
        name: r.file_name || 'pre-job-media',
        type: r.kind === 'video' ? 'video' : 'image',
        url,
        storagePath: r.storage_path,
      });
    }

    return attachments;
  } catch (err) {
    console.error('[sos-media] fetchRequestAttachments error:', err);
    return [];
  }
}

/**
 * Uploads technician post-work verification photo(s) to Supabase Storage
 * (request-attachments or sos-media) and creates corresponding rows in
 * public.request_attachments with phase='post_work'.
 */
export async function uploadPostWorkMedia(
  requestId: string,
  userId: string,
  files: File[],
): Promise<DispatchAttachment[]> {
  const uploaded: DispatchAttachment[] = [];
  const primaryBucket = 'request-attachments';
  const fallbackBucket = 'sos-media';

  for (const file of files) {
    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    const storagePath = `${requestId}/${crypto.randomUUID()}.${extensionFor(file)}`;

    let activeBucket = primaryBucket;
    let { error: uploadError } = await supabase.storage
      .from(activeBucket)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      activeBucket = fallbackBucket;
      const fallbackRes = await supabase.storage
        .from(activeBucket)
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      uploadError = fallbackRes.error;
    }

    if (uploadError) {
      console.error('[post-work-media] upload failed', file.name, uploadError.message);
      continue;
    }

    const { data: row, error: rowError } = await supabase
      .from('request_attachments')
      .insert({
        request_id: requestId,
        kind,
        phase: 'post_work',
        storage_path: storagePath,
        file_name: file.name,
        uploaded_by: userId,
      })
      .select('id')
      .single();

    if (rowError || !row) {
      console.error('[post-work-media] attachment row failed', file.name, rowError?.message);
      continue;
    }

    const { data: signed } = await supabase.storage
      .from(activeBucket)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    const url = signed?.signedUrl || supabase.storage.from(activeBucket).getPublicUrl(storagePath).data.publicUrl;
    uploaded.push({ id: row.id, name: file.name, type: kind, url, storagePath });
  }

  return uploaded;
}

