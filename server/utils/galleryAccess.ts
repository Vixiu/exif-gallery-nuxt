import { eq } from 'drizzle-orm'
import { db } from '@nuxthub/db'

const ENABLED_KEY = 'gallery_access_enabled'
const PASSWORD_HASH_KEY = 'gallery_access_password_hash'
const COOKIE_NAME = 'gallery_access'

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
  const data = new TextEncoder().encode(password)
  return toHex(await crypto.subtle.digest('SHA-256', data))
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
  const rows = await db.select().from(schema.siteSetting)
  const values = Object.fromEntries(rows.map(row => [row.key, row.value]))
  return {
    enabled: values[ENABLED_KEY] === '1',
    passwordConfigured: Boolean(values[PASSWORD_HASH_KEY]),
  }
}

export async function getGalleryPasswordHash() {
  const row = await db.query.siteSetting.findFirst({
    where: eq(schema.siteSetting.key, PASSWORD_HASH_KEY),
  })
  return row?.value || null
}

export async function saveGalleryAccessSettings(enabled: boolean, password?: string) {
  if (password !== undefined) {
    if (password.length < 4)
      throw createError({ statusCode: 400, statusMessage: 'Password must be at least 4 characters' })

    const passwordHash = await hashGalleryPassword(password)
    await db.insert(schema.siteSetting)
      .values({ key: PASSWORD_HASH_KEY, value: passwordHash })
      .onConflictDoUpdate({ target: schema.siteSetting.key, set: { value: passwordHash, updatedAt: new Date() } })
  }

  await db.insert(schema.siteSetting)
    .values({ key: ENABLED_KEY, value: enabled ? '1' : '0' })
    .onConflictDoUpdate({ target: schema.siteSetting.key, set: { value: enabled ? '1' : '0', updatedAt: new Date() } })
}

export async function hasGalleryAccess(event: Parameters<typeof getCookie>[0]) {
  const settings = await getGalleryAccessSettings()
  if (!settings.enabled)
    return true

  const passwordHash = await getGalleryPasswordHash()
  if (!passwordHash)
    return false

  const token = getCookie(event, COOKIE_NAME)
  if (!token)
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
  if (!(await hasGalleryAccess(event))) {
    throw createError({ statusCode: 401, statusMessage: 'Gallery access password required' })
  }
}
