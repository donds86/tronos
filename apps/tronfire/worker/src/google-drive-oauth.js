import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const SETTING_KEY = 'GOOGLE_DRIVE_BACKUP';

function parseJson(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

async function readSettings(prisma) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  const value = parseJson(setting?.value);
  return {
    ...value,
    clientId: value.clientId || process.env.GOOGLE_DRIVE_CLIENT_ID || '',
    clientSecret: value.clientSecret || process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
    folderName: value.folderName || 'TronFire Backups'
  };
}

function requireConfigured(settings) {
  if (!settings.clientId || !settings.clientSecret) throw new Error('Informe Client ID e Client Secret do OAuth Google Drive');
  if (!settings.refreshToken) throw new Error('Conta Google Drive ainda nao conectada');
}

async function refreshAccessToken(settings) {
  const body = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    refresh_token: settings.refreshToken,
    grant_type: 'refresh_token'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error_description || payload.error || 'Falha ao renovar token Google Drive');
  return payload;
}

async function getAccessToken(prisma, settings) {
  requireConfigured(settings);
  if (settings.accessToken && settings.expiryDate && new Date(settings.expiryDate).getTime() > Date.now() + 60000) return settings.accessToken;
  const refreshed = await refreshAccessToken(settings);
  const next = {
    ...settings,
    accessToken: refreshed.access_token,
    expiryDate: new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString()
  };
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTING_KEY, value: JSON.stringify(next) }
  });
  return next.accessToken;
}

async function googleFetch(url, options, accessToken) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) }
  });
  const text = await res.text();
  const payload = text ? parseJson(text) : {};
  if (!res.ok) throw new Error(payload.error?.message || payload.error_description || payload.error || `Erro Google Drive HTTP ${res.status}`);
  return payload;
}

async function ensureFolder(prisma, settings, accessToken) {
  if (settings.folderId) return settings.folderId;
  const folder = await googleFetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: settings.folderName || 'TronFire Backups', mimeType: 'application/vnd.google-apps.folder' })
  }, accessToken);
  const next = { ...settings, folderId: folder.id };
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTING_KEY, value: JSON.stringify(next) }
  });
  return folder.id;
}

export async function uploadBackupToGoogleDrive(prisma, filePath) {
  const settings = await readSettings(prisma);
  if (!settings.enabled) return { skipped: true, reason: 'Backup externo desativado' };
  if (!fs.existsSync(filePath)) throw new Error(`Backup local nao encontrado: ${filePath}`);
  const accessToken = await getAccessToken(prisma, settings);
  const folderId = await ensureFolder(prisma, settings, accessToken);
  const fileName = path.basename(filePath);
  const stat = fs.statSync(filePath);
  const session = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'application/gzip',
      'X-Upload-Content-Length': String(stat.size)
    },
    body: JSON.stringify({ name: fileName, parents: [folderId] })
  });
  if (!session.ok) {
    const payload = await session.json().catch(() => ({}));
    throw new Error(payload.error?.message || 'Falha ao iniciar upload Google Drive');
  }
  const upload = await fetch(session.headers.get('location'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/gzip', 'Content-Length': String(stat.size) },
    body: Readable.toWeb(fs.createReadStream(filePath)),
    duplex: 'half'
  });
  const uploaded = await upload.json().catch(() => ({}));
  if (!upload.ok) throw new Error(uploaded.error?.message || 'Falha ao enviar backup ao Google Drive');
  return { skipped: false, fileId: uploaded.id, fileName: uploaded.name || fileName, webViewLink: uploaded.webViewLink || '' };
}
