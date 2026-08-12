import { db } from '@nuxthub/db'
import { and, eq, like, or, sql } from 'drizzle-orm'
import { requireGalleryAccess } from '../../utils/galleryAccess'

export default eventHandler(async (event) => {
  await requireGalleryAccess(event)
  const query = getQuery(event)
  const {
    hidden,
    limit = 20,
    offset = 0,
    orderBy = 'takenAt',
    order = 'desc',
    tag,
    camera,
    lens,
    search,
  } = query

  const limitNum = Number(limit)
  const offsetNum = Number(offset)
  const conditions = []

  if (hidden !== undefined)
    conditions.push(eq(schema.photo.hidden, hidden === 'true'))

  if (camera) {
    const cameraStr = String(camera)
    const parts = cameraStr.split('|')
    if (parts.length === 2) {
      const [make, model] = parts
      if (make)
        conditions.push(eq(schema.photo.make, make))
      if (model)
        conditions.push(eq(schema.photo.model, model))
    }
    else {
      conditions.push(like(schema.photo.make, `%${cameraStr}%`))
    }
  }

  if (lens)
    conditions.push(eq(schema.photo.lensModel, String(lens)))

  if (search) {
    const keywords = String(search).split(/\s+/).filter(Boolean)
    for (const keyword of keywords) {
      const keywordStr = `%${keyword}%`
      conditions.push(
        or(
          like(schema.photo.title, keywordStr),
          like(schema.photo.caption, keywordStr),
          like(schema.photo.semanticDescription, keywordStr),
          like(schema.photo.locationName, keywordStr),
          like(schema.photo.make, keywordStr),
          like(schema.photo.model, keywordStr),
          like(schema.photo.lensModel, keywordStr),
          like(schema.photo.tags, keywordStr),
        ),
      )
    }
  }

  let photoIdsSubquery = null
  if (tag) {
    const tags = Array.isArray(tag) ? tag : String(tag).split(/\s+/).filter(Boolean)

    if (tags.length === 1) {
      photoIdsSubquery = sql`
        SELECT pt.photo_id
        FROM photo_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.name = ${tags[0]}
      `
    }
    else if (tags.length > 1) {
      photoIdsSubquery = sql`
        SELECT pt.photo_id
        FROM photo_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.name IN (${sql.join(tags.map(t => sql`${t}`), sql`, `)})
        GROUP BY pt.photo_id
        HAVING COUNT(DISTINCT t.name) = ${tags.length}
      `
    }
  }

  let total = 0

  if (tag) {
    const tagExists = await db.query.tag.findFirst({
      where: eq(schema.tag.name, String(tag)),
    })

    if (!tagExists) {
      return { data: [], total: 0, limit: limitNum, offset: offsetNum }
    }
  }

  let photos
  if (photoIdsSubquery) {
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.photo)
      .where(and(conditions.length > 0 ? and(...conditions) : undefined, sql`id IN (${photoIdsSubquery})`))

    total = countResult[0]?.count || 0
    if (total === 0)
      return { data: [], total: 0, limit: limitNum, offset: offsetNum }

    photos = await db.query.photo.findMany({
      where: and(conditions.length > 0 ? and(...conditions) : undefined, sql`id IN (${photoIdsSubquery})`),
      limit: limitNum,
      offset: offsetNum,
      orderBy: col => order === 'desc' ? sql`${col} DESC` : sql`${col} ASC`,
    })
  }
  else {
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.photo)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    total = countResult[0]?.count || 0

    photos = await db.query.photo.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: limitNum,
      offset: offsetNum,
      orderBy: col => order === 'desc' ? sql`${col} DESC` : sql`${col} ASC`,
    })
  }

  return { data: photos, total, limit: limitNum, offset: offsetNum }
})
