import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * All persistent state (WhatsApp session, SQLite DB, uploaded banners) lives
 * under DATA_DIR. Locally this defaults to the project root so nothing extra
 * is needed. On Railway, attach a Volume and set DATA_DIR to its mount path
 * (e.g. /data) so this survives restarts/redeploys — Railway's regular
 * filesystem is wiped on every deploy.
 */
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
