import { getGalleryAccessSettings } from '../utils/galleryAccess'

export default eventHandler(async (event) => {
  await requireUserSession(event)
  return await getGalleryAccessSettings()
})
