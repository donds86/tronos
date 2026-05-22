import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

const SETTING_KEY = 'GOOGLE_DRIVE_BACKUP';
const STATE_KEY = 'GOOGLE_DRIVE_OAUTH_STATE';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const USERINFO_SCOPE = 'openid email';

function parseJson(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function publicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/g, '');
  if (configured) return configured;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${req.headers.host}`;
}

export function googleDriveRedirectUri(req, baseUrl = '') {
  return `${(baseUrl || publicBaseUrl(req)).replace(/\/+$/g, '')}/api/settings/google-drive/oauth/callback`;
}

function credentialsFrom(input = {}, current = {}) {
  let clientId = String(input.clientId || current.clientId || process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim();
  let clientSecret = String(input.clientSecret || current.clientSecret || process.env.GOOGLE_DRIVE_CLIENT_SECRET || '').trim();
  const credentialsJson = String(input.credentialsJson || '').trim();
  if (credentialsJson) {
    const parsed = parseJson(credentialsJson);
    const web = parsed.web || parsed.installed || parsed;
    clientId = String(web.client_id || clientId).trim();
    clientSecret = String(web.client_secret || clientSecret).trim();
  }
  return { clientId, clientSecret };
}

export async function readGoogleDriveSettings(prisma, req) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  const cloudflareSetting = await prisma.systemSetting.findUnique({ where: { key: 'CLOUDFLARE_TUNNEL' } });
  const value = parseJson(setting?.value);
  const cloudflare = parseJson(cloudflareSetting?.value);
  const baseUrl = cloudflare.enabled && cloudflare.publicUrl ? String(cloudflare.publicUrl).trim() : '';
  const { clientId, clientSecret } = credentialsFrom({}, value);
  return {
    enabled: !!value.enabled,
    folderName: value.folderName || 'TronFire Backups',
    folderId: value.folderId || '',
    clientId,
    redirectUri: req ? googleDriveRedirectUri(req, baseUrl) : '',
    accountEmail: value.accountEmail || '',
    connected: !!value.refreshToken,
    hasClientSecret: !!clientSecret,
    updatedAt: value.updatedAt || null,
    updatedBy: value.updatedBy || null
  };
}

async function readPrivateSettings(prisma) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  const value = parseJson(setting?.value);
  const creds = credentialsFrom({}, value);
  return { ...value, ...creds, folderName: value.folderName || 'TronFire Backups' };
}

export async function writeGoogleDriveSettings(prisma, input, user) {
  const current = await readPrivateSettings(prisma);
  const { clientId, clientSecret } = credentialsFrom(input, current);
  const next = {
    ...current,
    enabled: !!input.enabled,
    folderName: String(input.folderName || current.folderName || 'TronFire Backups').trim() || 'TronFire Backups',
    folderId: String(input.folderId || current.folderId || '').trim(),
    clientId,
    clientSecret,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.email || user?.name || null
  };
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTING_KEY, value: JSON.stringify(next) }
  });
  return readGoogleDriveSettings(prisma);
}

function requireConfigured(settings) {
  if (!settings.clientId || !settings.clientSecret) {
    throw new Error('Informe Client ID e Client Secret do OAuth Google Drive');
  }
}

export async function createGoogleDriveAuthUrl(prisma, req) {
  const settings = await readPrivateSettings(prisma);
  const cloudflareSetting = await prisma.systemSetting.findUnique({ where: { key: 'CLOUDFLARE_TUNNEL' } });
  const cloudflare = parseJson(cloudflareSetting?.value);
  const redirectUri = googleDriveRedirectUri(req, cloudflare.enabled && cloudflare.publicUrl ? cloudflare.publicUrl : '');
  requireConfigured(settings);
  const state = cryptoRandom();
  await prisma.systemSetting.upsert({
    where: { key: STATE_KEY },
    update: { value: JSON.stringify({ state, userId: req.user.id, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }) },
    create: { key: STATE_KEY, value: JSON.stringify({ state, userId: req.user.id, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }) }
  });
  const params = new URLSearchParams({
    client_id: settings.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: `${DRIVE_SCOPE} ${USERINFO_SCOPE}`,
    state
  });
  return { ok: true, authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, redirectUri };
}

function cryptoRandom() {
  return randomBytes(32).toString('hex');
}

async function exchangeCode(settings, code, redirectUri) {
  const body = new URLSearchParams({
    code,
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error_description || payload.error || 'Falha ao trocar autorizacao Google');
  return payload;
}

async function refreshAccessToken(settings) {
  if (!settings.refreshToken) throw new Error('Conta Google Drive ainda nao conectada');
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
  if (settings.accessToken && settings.expiryDate && new Date(settings.expiryDate).getTime() > Date.now() + 60000) {
    return settings.accessToken;
  }
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

async function loadAccountEmail(accessToken) {
  try {
    const info = await googleFetch('https://openidconnect.googleapis.com/v1/userinfo', {}, accessToken);
    return info.email || '';
  } catch {
    return '';
  }
}

export async function completeGoogleDriveOAuth(prisma, query, req) {
  const { code, state, error } = query || {};
  if (error) throw new Error(String(error));
  const stateSetting = await prisma.systemSetting.findUnique({ where: { key: STATE_KEY } });
  const expected = parseJson(stateSetting?.value);
  if (!state || state !== expected.state || new Date(expected.expiresAt || 0) < new Date()) {
    throw new Error('Estado OAuth invalido ou expirado');
  }
  const settings = await readPrivateSettings(prisma);
  const cloudflareSetting = await prisma.systemSetting.findUnique({ where: { key: 'CLOUDFLARE_TUNNEL' } });
  const cloudflare = parseJson(cloudflareSetting?.value);
  const redirectUri = googleDriveRedirectUri(req, cloudflare.enabled && cloudflare.publicUrl ? cloudflare.publicUrl : '');
  requireConfigured(settings);
  const token = await exchangeCode(settings, String(code || ''), redirectUri);
  const next = {
    ...settings,
    enabled: true,
    accessToken: token.access_token,
    refreshToken: token.refresh_token || settings.refreshToken,
    expiryDate: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
    accountEmail: await loadAccountEmail(token.access_token),
    updatedAt: new Date().toISOString()
  };
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTING_KEY, value: JSON.stringify(next) }
  });
  await prisma.systemSetting.deleteMany({ where: { key: STATE_KEY } });
  return { ok: true, accountEmail: next.accountEmail };
}

async function ensureFolder(prisma, settings, accessToken) {
  if (settings.folderId) return settings.folderId;
  const metadata = { name: settings.folderName || 'TronFire Backups', mimeType: 'application/vnd.google-apps.folder' };
  const folder = await googleFetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata)
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
  const settings = await readPrivateSettings(prisma);
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
  const uploadUrl = session.headers.get('location');
  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/gzip', 'Content-Length': String(stat.size) },
    body: Readable.toWeb(fs.createReadStream(filePath)),
    duplex: 'half'
  });
  const uploaded = await upload.json().catch(() => ({}));
  if (!upload.ok) throw new Error(uploaded.error?.message || 'Falha ao enviar backup ao Google Drive');
  return {
    skipped: false,
    fileId: uploaded.id,
    fileName: uploaded.name || fileName,
    webViewLink: uploaded.webViewLink || ''
  };
}

export async function testGoogleDriveConnection(prisma) {
  const testFile = `/tmp/tronfire-google-drive-test-${Date.now()}.txt`;
  fs.writeFileSync(testFile, `TronFire Google Drive test ${new Date().toISOString()}\n`);
  try {
    const uploaded = await uploadBackupToGoogleDrive(prisma, testFile);
    const settings = await readPrivateSettings(prisma);
    const accessToken = await getAccessToken(prisma, settings);
    if (uploaded.fileId) {
      await googleFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(uploaded.fileId)}`, { method: 'DELETE' }, accessToken);
    }
    return { ok: true, fileName: uploaded.fileName, folderName: settings.folderName || 'TronFire Backups' };
  } finally {
    fs.rmSync(testFile, { force: true });
  }
}
