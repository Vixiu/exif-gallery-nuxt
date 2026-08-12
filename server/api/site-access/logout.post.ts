import { clearGalleryAccessCookie } from '../../utils/galleryAccess'

export default eventHandler(async (event) => {
  clearGalleryAccessCookie(event)
  return { success: true }
})
