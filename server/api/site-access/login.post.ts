import { getGalleryAccessSettings, getGalleryPasswordHash, hashGalleryPassword, setGalleryAccessCookie } from '../../utils/galleryAccess'

export default eventHandler(async (event) => {
  const settings = await getGalleryAccessSettings()
  if (!settings.enabled)
    return { success: true }

  const body = await readBody<{ password?: string }>(event)
  const password = typeof body?.password === 'string' ? body.password : ''
  const expectedHash = await getGalleryPasswordHash()

  if (!expectedHash || (await hashGalleryPassword(password)) !== expectedHash) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid password' })
  }

  setGalleryAccessCookie(event, expectedHash)
  return { success: true }
})
