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
