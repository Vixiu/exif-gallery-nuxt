import { db } from '@nuxthub/db'

const ENABLED_KEY = 'gallery_access_enabled'
const PASSWORD_HASH_KEY = 'gallery_access_password_hash'
const COOKIE_NAME = 'gallery_access'

let tableReady: Promise<void> | undefined

async function ensureSiteSettingsTable() {
  if (!tableReady) {
    tableReady = db.run(`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at INTEGER DEFAULT CURRENT_TIMESTAMP)`).then(() => undefined)
      .catch((error) => {
        tableReady = undefined
        throw error
      })
  }
  await tableReady
}

async function getSetting(key: string) {
  await ensureSiteSettingsTable()
  const result = await db.run(`SELECT value FROM site_settings WHERE key = ? LIMIT 1`, key)
  return result.rows[0]?.value as string | undefined
}

async function setSetting(key: string, value: string) {
  await ensureSiteSettingsTable()
  await db.run(
    `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    key,
    value,
  )
}

function getSecret() {
  const config = useRuntimeConfig()
  const secret = config.galleryAccessSecret as string | undefined
  if (!secret)
    throw new Error('NUXT_GALLERY_ACCESS_SECRET or NUXT_SESSION_PASSWORD must be configured')
  return secret
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashGalleryPassword(password: string) {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)))
}

async function createAccessToken(passwordHash: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`gallery:${passwordHash}`)))
}

export async function getGalleryAccessSettings() {
  const enabled = await getSetting(ENABLED_KEY)
  const passwordHash = await getSetting(PASSWORD_HASH_KEY)
  return {
    enabled: enabled === '1',
    passwordConfigured: Boolean(passwordHash),
  }
}

export async function getGalleryPasswordHash() {
  return await getSetting(PASSWORD_HASH_KEY) || null
}

export async function saveGalleryAccessSettings(enabled: boolean, password?: string) {
  if (password !== undefined) {
    if (password.length < 4)
      throw createError({ statusCode: 400, statusMessage: 'Password must be at least 4 characters' })
    await setSetting(PASSWORD_HASH_KEY, await hashGalleryPassword(password))
  }

  await setSetting(ENABLED_KEY, enabled ? '1' : '0')

  // Read back from D1 instead of trusting the request body. This makes the
  // admin UI immediately reflect what was actually persisted.
  const saved = await getGalleryAccessSettings()
  if (saved.enabled !== enabled || (password !== undefined && !saved.passwordConfigured))
    throw createError({ statusCode: 500, statusMessage: 'Gallery access settings were not persisted' })
}

export async function hasGalleryAccess(event: Parameters<typeof getCookie>[0]) {
  const session = await getUserSession(event)
  if (session.user?.role === 'admin')
    return true

  const settings = await getGalleryAccessSettings()
  if (!settings.enabled)
    return true

  const passwordHash = await getGalleryPasswordHash()
  const token = getCookie(event, COOKIE_NAME)
  if (!passwordHash || !token)
    return false

  return token === await createAccessToken(passwordHash)
}

export async function setGalleryAccessCookie(event: Parameters<typeof setCookie>[0], passwordHash: string) {
  setCookie(event, COOKIE_NAME, await createAccessToken(passwordHash), {
    httpOnly: true,
    secure: getRequestProtocol(event) === 'https',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearGalleryAccessCookie(event: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export async function requireGalleryAccess(event: Parameters<typeof getCookie>[0]) {
  if (!(await hasGalleryAccess(event)))
    throw createError({ statusCode: 401, statusMessage: 'Gallery access password required' })
}
