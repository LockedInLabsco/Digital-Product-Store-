import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdminRequest } from '@/src/lib/admin/auth'
import {
  getHeroSliderImagesAdmin,
  saveHeroSliderImages,
} from '@/src/lib/supabase/settings'
import { HeroSliderImage, HERO_SLIDER_MAX_IMAGES } from '@/src/types/settings'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const images = await getHeroSliderImagesAdmin()
    return NextResponse.json({ images })
  } catch (error) {
    console.error('[GET /api/admin/hero-slider] Exception', error)
    return NextResponse.json(
      { error: 'Failed to load hero slider images' },
      { status: 500 }
    )
  }
}

function validateImages(body: unknown): { images: HeroSliderImage[] } | { error: string } {
  if (!Array.isArray(body)) {
    return { error: 'Expected an array of hero slider images' }
  }

  if (body.length > HERO_SLIDER_MAX_IMAGES) {
    return {
      error: `A maximum of ${HERO_SLIDER_MAX_IMAGES} hero slider images is allowed (received ${body.length})`,
    }
  }

  const images: HeroSliderImage[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < body.length; index += 1) {
    const item = body[index] as Partial<HeroSliderImage> | null

    if (!item || typeof item !== 'object') {
      return { error: `Image ${index + 1} is invalid` }
    }
    if (typeof item.id !== 'string' || !item.id.trim()) {
      return { error: `Image ${index + 1} is missing an id` }
    }
    if (seenIds.has(item.id)) {
      return { error: `Image ${index + 1} has a duplicate id` }
    }
    if (typeof item.url !== 'string' || !item.url.trim()) {
      return { error: `Image ${index + 1} is missing its uploaded file` }
    }
    if (typeof item.alt !== 'string' || !item.alt.trim()) {
      return { error: `Image ${index + 1} is missing alt text` }
    }
    if (typeof item.enabled !== 'boolean') {
      return { error: `Image ${index + 1} has an invalid enabled state` }
    }
    if (item.objectPosition !== undefined && typeof item.objectPosition !== 'string') {
      return { error: `Image ${index + 1} has an invalid object position` }
    }
    if (item.storagePath !== undefined && typeof item.storagePath !== 'string') {
      return { error: `Image ${index + 1} has an invalid storage path` }
    }

    seenIds.add(item.id)
    images.push({
      id: item.id,
      url: item.url,
      alt: item.alt,
      enabled: item.enabled,
      objectPosition: item.objectPosition || undefined,
      storagePath: item.storagePath || undefined,
    })
  }

  return { images }
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = validateImages(body)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const images = await saveHeroSliderImages(result.images)

    revalidatePath('/', 'layout')

    return NextResponse.json({ images })
  } catch (error) {
    console.error('[PUT /api/admin/hero-slider] Exception', error)
    const message =
      error instanceof Error ? error.message : 'Failed to save hero slider images'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
