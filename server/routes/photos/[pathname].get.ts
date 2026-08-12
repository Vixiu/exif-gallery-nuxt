import { blob } from '@nuxthub/blob'
import { z } from 'zod'
import { requireGalleryAccess } from '../../utils/galleryAccess'

export default eventHandler(async (event) => {
  await requireGalleryAccess(event)
  const { pathname } = await getValidatedRouterParams(event, z.object({
    pathname: z.string().min(1),
  }).parse)

  return blob.serve(event, pathname)
})
