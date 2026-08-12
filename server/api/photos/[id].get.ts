import { db } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { requireGalleryAccess } from '../../utils/galleryAccess'

export default eventHandler(async (event) => {
  await requireGalleryAccess(event)
  const { id } = event.context.params || {}

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'id is required',
    })
  }

  const photo = await db.query.photo.findFirst({
    where: eq(schema.photo.id, id),
  })

  if (!photo) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Photo not found',
    })
  }

  return photo
})
