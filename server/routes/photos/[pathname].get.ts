import { blob } from '@nuxthub/blob'
import { z } from 'zod'
import { getGalleryAccessSettings, requireGalleryAccess } from '../../utils/galleryAccess'

export default eventHandler(async (event) => {
  const settings = await getGalleryAccessSettings()
  await requireGalleryAccess(event)
  const { pathname } = await getValidatedRouterParams(event, z.object({
    pathname: z.string().min(1),
  }).parse)

  if (settings.enabled)
    setHeader(event, 'Cache-Control', 'private, no-store')
  else
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')

  return blob.serve(event, pathname)
})
