import { saveGalleryAccessSettings } from '../utils/galleryAccess'

export default eventHandler(async (event) => {
  await requireUserSession(event)
  const body = await readBody<{ enabled?: boolean, password?: string }>(event)

  if (typeof body?.enabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'enabled is required' })
  }

  await saveGalleryAccessSettings(body.enabled, body.password)
  return await getGalleryAccessSettings()
})
