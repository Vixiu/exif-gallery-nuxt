import { db } from '@nuxthub/db'
import { and, eq, like, or, sql } from 'drizzle-orm'
import { requireGalleryAccess } from '../../utils/galleryAccess'

export default eventHandler(async (event) => {
  await requireGalleryAccess(event)
  const query = getQuery(event)
  const {
    hidden,
    limit = 20, // 设置默认值，避免无限查询
    offset = 0,
    orderBy = 'takenAt',
    order = 'desc',
    tag,
    camera,
    lens,
    search,
  } = query

  // 转换为数字
  const limitNum = Number(limit)
  const offsetNum = Number(offset)
  const conditions = []

  if (hidden !== undefined)
    conditions.push(eq(schema.photo.hidden, hidden === 'true'))

  // 相机筛选：格式为 "make|model" 或 "make"
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

  // 镜头筛选
  if (lens) {
    conditions.push(eq(schema.photo.lensModel, String(lens)))
  }

  // 文本搜索条件 - 支持多关键词 AND 搜索（空格分隔）
  if (search) {
    const keywords = String(search).split(/\s+/).filter(Boolean)

    // 每个关键词都必须在某个字段中匹配（AND 逻辑）
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
          like(schema.photo.tags, keywordStr), // 旧的逗号分隔标签字段
        ),
      )
    }
  }

  // 使用子查询而不是多次查询
  let photoIdsSubquery = null
  if (tag) {
    // 支持多标签 AND 筛选
    const tags = Array.isArray(tag) ? tag : String(tag).split(/\s+/).filter(Boolean)

    if (tags.length === 1) {
      // 单标签：保持原有逻辑
      photoIdsSubquery = sql`
        SELECT pt.photo_id
        FROM photo_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.name = ${tags[0]}
      `
    }
    else if (tags.length > 1) {
      // 多标签 AND：照片必须拥有所有指定标签
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

  // 计算总数和获取数据可以合并为一个查询
  let total = 0

  // 如果有标签过滤但没有匹配的标签，直接返回空结果
  if (tag) {
    const tagExists = await db.query.tag.findFirst({
      where: eq(schema.tag.name, String(tag)),
    })

    if (!tagExists) {
      return {
        data: [],
        total: 0,
        limit: limitNum,
        offset: offsetNum,
      }
    }
  }

  // 使用更高效的查询方式
  let photos
  if (photoIdsSubquery) {
    // 使用 SQL 子查询来过滤照片
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.photo)
      .where(
        and(
          conditions.length > 0 ? and(...conditions) : undefined,
          sql`id IN (${photoIdsSubquery})`,
        ),
      )
      .get()

    total = countResult?.count || 0

    if (total === 0) {
      return {
        data: [],
        total: 0,
        limit: limitNum,
        offset: offsetNum,
      }
    }

    photos = await db.query.photo.findMany({
      where: and(
        conditions.length > 0 ? and(...conditions) : undefined,
        sql`id IN (${photoIdsSubquery})`,
      ),
      limit: limitNum,
      offset: offsetNum,
      orderBy: (col => order === 'desc' ? sql`${col} DESC` : sql`${col} ASC`)(schema.photo[orderBy as keyof typeof schema.photo]),
    })
  }
  else {
    // 没有标签过滤时的查询
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.photo)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .get()

    total = countResult?.count || 0

    photos = await db.query.photo.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: limitNum,
      offset: offsetNum,
      orderBy: (col => order === 'desc' ? sql`${col} DESC` : sql`${col} ASC`)(schema.photo[orderBy as keyof typeof schema.photo]),
    })
  }

  return {
    data: photos,
    total,
    limit: limitNum,
    offset: offsetNum,
  }
})
