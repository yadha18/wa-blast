import { Boom } from '@hapi/boom';
import path from 'path';
import { createRequire } from 'module';
import pino from 'pino';
import QRCode from 'qrcode';
import { DATA_DIR } from './config.js';

// Baileys is CommonJS; importing it via a plain ESM default/named import is
// unreliable across versions (named exports sometimes end up undefined after
// interop). Loading it through createRequire sidesteps that entirely.
const require = createRequire(import.meta.url);
const baileysPkg = require('@whiskeysockets/baileys');
const makeWASocket = baileysPkg.default || baileysPkg.makeWASocket || baileysPkg;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileysPkg;

const AUTH_DIR = path.join(DATA_DIR, 'sessions');

const logger = pino({ level: 'silent' });

class WhatsAppManager {
  constructor(io) {
    this.io = io;
    this.sock = null;
    this.status = 'disconnected'; // disconnected | connecting | qr | connected
    this.qrDataUrl = null;
  }

  async start() {
    console.log('[WA] Memulai koneksi ke WhatsApp...');

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Pinning the protocol version avoids silent handshake failures when
    // Baileys' bundled default version drifts out of sync with WhatsApp's
    // current multi-device protocol.
    let version;
    try {
      const v = await fetchLatestBaileysVersion();
      version = v.version;
      console.log(`[WA] Menggunakan versi Baileys protokol: ${version.join('.')} (terbaru: ${v.isLatest})`);
    } catch (err) {
      console.warn('[WA] Gagal mengambil versi terbaru, memakai default bawaan library:', err.message);
    }

    this.sock = makeWASocket({
      auth: state,
      logger,
      version,
      printQRInTerminal: false,
      browser: ['WA Bulk Blast', 'Chrome', '1.0'],
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (connection) {
        console.log(`[WA] connection.update -> ${connection}`);
      }

      if (qr) {
        console.log('[WA] QR baru diterima, menunggu di-scan.');
        this.status = 'qr';
        this.qrDataUrl = await QRCode.toDataURL(qr);
        this.io.emit('wa:status', { status: this.status, qr: this.qrDataUrl });
      }

      if (connection === 'connecting') {
        this.status = 'connecting';
        this.io.emit('wa:status', { status: this.status });
      }

      if (connection === 'open') {
        console.log('[WA] Terhubung sebagai', this.sock.user?.id);
        this.status = 'connected';
        this.qrDataUrl = null;
        this.io.emit('wa:status', { status: this.status, phone: this.sock.user?.id });
      }

      if (connection === 'close') {
        const errPayload = lastDisconnect?.error;
        const statusCode = new Boom(errPayload)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.error(
          `[WA] Koneksi tertutup. statusCode=${statusCode} pesan="${errPayload?.message || 'tidak diketahui'}" willReconnect=${shouldReconnect}`
        );
        this.status = 'disconnected';
        this.io.emit('wa:status', {
          status: this.status,
          willReconnect: shouldReconnect,
          error: errPayload?.message || null,
        });
        if (shouldReconnect) {
          console.log('[WA] Mencoba menyambung ulang dalam 3 detik...');
          setTimeout(() => this.start(), 3000);
        } else {
          console.error('[WA] Sesi logged out. Hapus folder "sessions" lalu restart server untuk login ulang.');
        }
      }
    });
  }

  async logout() {
    if (this.sock) {
      try { await this.sock.logout(); } catch (e) { /* ignore */ }
    }
    this.status = 'disconnected';
    this.io.emit('wa:status', { status: this.status });
  }

  getStatus() {
    return { status: this.status, qr: this.qrDataUrl };
  }

  /**
   * Sends a single text message. Returns { success, error }.
   */
  async sendText(jid, text) {
    if (this.status !== 'connected' || !this.sock) {
      return { success: false, error: 'WhatsApp belum terhubung' };
    }
    try {
      // Verify number is registered on WhatsApp before sending
      const [result] = await this.sock.onWhatsApp(jid);
      if (!result?.exists) {
        return { success: false, error: 'Nomor tidak terdaftar di WhatsApp' };
      }
      await this.sock.sendMessage(result.jid, { text });
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err?.message || 'Gagal mengirim pesan' };
    }
  }

  /**
   * Sends an image with an optional caption (used as a "banner" message).
   * `imageBuffer` must be a Buffer of the image file contents.
   */
  async sendImage(jid, imageBuffer, caption) {
    if (this.status !== 'connected' || !this.sock) {
      return { success: false, error: 'WhatsApp belum terhubung' };
    }
    try {
      const [result] = await this.sock.onWhatsApp(jid);
      if (!result?.exists) {
        return { success: false, error: 'Nomor tidak terdaftar di WhatsApp' };
      }
      await this.sock.sendMessage(result.jid, { image: imageBuffer, caption: caption || '' });
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: err?.message || 'Gagal mengirim gambar' };
    }
  }
}

let instance = null;

export function initWhatsApp(io) {
  instance = new WhatsAppManager(io);
  instance.start().catch((err) => {
    console.error('[WA] Gagal memulai koneksi WhatsApp (fatal, tidak akan retry otomatis):', err);
    instance.status = 'disconnected';
    io.emit('wa:status', { status: 'disconnected', error: err.message });
  });
  return instance;
}

export function getWhatsApp() {
  return instance;
}
