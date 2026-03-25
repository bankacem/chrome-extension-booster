import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const KEY_FILE = path.join(process.cwd(), 'service-account.json');
const ALT_KEY_FILE = path.join(process.cwd(), 'google-indexing-key.json');
const LOG_FILE = path.join(process.cwd(), 'google-indexing.log');

/**
 * Notifies Google Indexing API about a new or updated URL.
 *
 * @param url The full URL of the article to index
 * @param type The type of notification (URL_UPDATED or URL_DELETED)
 */
export async function notifyIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED') {
  const authOptions: any = {
    scopes: ['https://www.googleapis.com/auth/indexing'],
  };

  if (process.env.GOOGLE_INDEXING_KEY) {
    try {
      const creds = JSON.parse(process.env.GOOGLE_INDEXING_KEY);
      if (creds.private_key) {
        creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      }
      authOptions.credentials = creds;
    } catch (e) {
      console.error('[Indexing] Error parsing GOOGLE_INDEXING_KEY environment variable:', (e as Error).message);
      return;
    }
  } else if (fs.existsSync(KEY_FILE)) {
    try {
      const creds = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
      if (creds.private_key) {
        creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      }
      authOptions.credentials = creds;
    } catch (e) {
      console.error('[Indexing] Error parsing service-account.json:', (e as Error).message);
      return;
    }
  } else if (fs.existsSync(ALT_KEY_FILE)) {
    try {
      const creds = JSON.parse(fs.readFileSync(ALT_KEY_FILE, 'utf8'));
      if (creds.private_key) {
        creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      }
      authOptions.credentials = creds;
    } catch (e) {
      console.error('[Indexing] Error parsing google-indexing-key.json:', (e as Error).message);
      return;
    }
  } else {
    console.warn(`[Indexing] Skip: No key found (env GOOGLE_INDEXING_KEY or ${KEY_FILE} not found)`);
    return;
  }

  try {
    const auth = new google.auth.GoogleAuth(authOptions);

    const client = await auth.getClient();
    const indexing = google.indexing({
      version: 'v3',
      auth: client as any,
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
    return res.data;
  } catch (error) {
    const errorResponse = error as { response?: { data?: { error?: { message?: string } } } };
    const errorMsg = errorResponse.response?.data?.error?.message || (error as Error).message;
    const logEntry = `${new Date().toISOString()} - ERROR - ${url} - ${errorMsg}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
    console.error(`[Indexing] Error notifying Google for ${url}:`, errorMsg);
    throw error;
  }
}
