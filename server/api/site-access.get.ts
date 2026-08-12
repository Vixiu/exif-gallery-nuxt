import { getGalleryAccessSettings, hasGalleryAccess } from '../utils/galleryAccess'

export default eventHandler(async (event) => {
  const settings = await getGalleryAccessSettings()
  return {
    ...settings,
    authorized: !settings.enabled || await hasGalleryAccess(event),
  }
})
