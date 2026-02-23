import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const KEY_FILE = path.join(process.cwd(), 'google-indexing-key.json');
const LOG_FILE = path.join(process.cwd(), 'google-indexing.log');

/**
 * Notifies Google Indexing API about a new or updated URL.
 *
 * @param url The full URL of the article to index
 * @param type The type of notification (URL_UPDATED or URL_DELETED)
 */
export async function notifyIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  if (!fs.existsSync(KEY_FILE)) {
    const msg = `[Indexing] Skip: Key file not found at ${KEY_FILE}`;
    console.warn(msg);
    // Log skipping too so user knows why it didn't happen
    // fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} - SKIP - ${url} - Key file not found\n`);
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_FILE,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    const client = await auth.getClient();
    const indexing = google.indexing({
      version: 'v3',
      auth: client as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    const res = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: type,
      },
    });

    const logEntry = `${new Date().toISOString()} - ${type} - ${url} - Status: ${res.statusText || 'OK'} - Response: ${JSON.stringify(res.data)}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
    console.log(`[Indexing] Successfully notified Google: ${url}`);
  } catch (error) {
    const errorMsg = (error as any)?.response?.data?.error?.message || (error as Error).message;
    const logEntry = `${new Date().toISOString()} - ERROR - ${url} - ${errorMsg}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
    console.error(`[Indexing] Error notifying Google for ${url}:`, errorMsg);
  }
}
