import { api } from './client.js';

/**
 * Uploads a file and returns its public URL.
 *
 *   const { file_url } = await UploadFile({ file });
 *
 * The URL is relative ("/uploads/…"), so stored records stay valid if the site
 * later moves to a different domain.
 */
export async function UploadFile({ file }) {
  if (!file) throw new Error('UploadFile requires a file');

  const form = new FormData();
  form.append('file', file);

  return api.post('/api/upload', form);
}
