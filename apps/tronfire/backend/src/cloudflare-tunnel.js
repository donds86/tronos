const SETTING_KEY = 'CLOUDFLARE_TUNNEL';
const CONTAINER_NAME = 'tronfire_cloudflared';
const NETWORK_NAME = 'tronfire_net';

function parseJson(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function normalize(input = {}, current = {}) {
  const token = String(input.token || current.token || '').trim();
  let publicUrl = String(Object.hasOwn(input, 'publicUrl') ? input.publicUrl : (current.publicUrl || '')).trim().replace(/\/+$/g, '');
  if (publicUrl && !/^https?:\/\//i.test(publicUrl)) publicUrl = `https://${publicUrl}`;
  if (/^http:\/\//i.test(publicUrl) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(publicUrl)) {
    publicUrl = publicUrl.replace(/^http:\/\//i, 'https://');
  }
  return {
    enabled: !!input.enabled,
    publicUrl,
    token,
    updatedAt: new Date().toISOString()
  };
}

async function inspectStatus(docker) {
  try {
    const { stdout } = await docker(['inspect', CONTAINER_NAME, '--format', '{{.State.Status}}']);
    return stdout.trim() || 'unknown';
  } catch {
    return 'not_created';
  }
}

async function readLogs(docker) {
  try {
    const out = await docker(['logs', '--tail', '80', CONTAINER_NAME], { timeout: 120000, maxBuffer: 1024 * 1024 * 2 });
    return `${out.stdout || ''}${out.stderr || ''}`.trim();
  } catch (err) {
    return err.message;
  }
}

export async function readCloudflareTunnelSettings(prisma, docker) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  const value = parseJson(setting?.value);
  return {
    enabled: !!value.enabled,
    publicUrl: value.publicUrl || '',
    tokenConfigured: !!value.token,
    container: CONTAINER_NAME,
    status: await inspectStatus(docker),
    logs: await readLogs(docker),
    updatedAt: value.updatedAt || null,
    updatedBy: value.updatedBy || null
  };
}

export async function readCloudflarePublicUrl(prisma) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  const value = parseJson(setting?.value);
  return value.enabled && value.publicUrl ? String(value.publicUrl).replace(/\/+$/g, '') : '';
}

export async function writeCloudflareTunnelSettings(prisma, input, user, docker) {
  const currentSetting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  const current = parseJson(currentSetting?.value);
  const next = {
    ...normalize(input, current),
    updatedBy: user?.email || user?.name || null
  };
  await prisma.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTING_KEY, value: JSON.stringify(next) }
  });
  return readCloudflareTunnelSettings(prisma, docker);
}

export async function startCloudflareTunnel(prisma, docker) {
  const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
  const value = parseJson(setting?.value);
  if (!value.enabled) throw new Error('Ative o Cloudflare Tunnel antes de iniciar');
  if (!value.token) throw new Error('Informe o token do Cloudflare Tunnel');
  await docker(['rm', '-f', CONTAINER_NAME], { timeout: 120000, maxBuffer: 1024 * 1024 * 2 }).catch(() => null);
  await docker([
    'run',
    '-d',
    '--name', CONTAINER_NAME,
    '--restart', 'unless-stopped',
    '--network', NETWORK_NAME,
    'cloudflare/cloudflared:latest',
    'tunnel',
    '--no-autoupdate',
    'run',
    '--token',
    value.token
  ], { timeout: 180000, maxBuffer: 1024 * 1024 * 4 });
  return readCloudflareTunnelSettings(prisma, docker);
}

export async function stopCloudflareTunnel(prisma, docker) {
  await docker(['rm', '-f', CONTAINER_NAME], { timeout: 120000, maxBuffer: 1024 * 1024 * 2 }).catch(() => null);
  return readCloudflareTunnelSettings(prisma, docker);
}
