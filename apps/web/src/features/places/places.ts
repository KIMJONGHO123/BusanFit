export type Place = {
  id: string
  name: string
  address: string
  category: string
  latitude: number
  longitude: number
  imageUrl: string | null
}

export const PAGE_SIZE = 20

export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

export function parsePlaces(value: unknown): Place[] {
  if (!Array.isArray(value)) throw new Error('검색 응답을 확인할 수 없습니다.')
  const places = value.map((item: unknown): Place => {
    if (!item || typeof item !== 'object')
      throw new Error('장소 정보가 올바르지 않습니다.')
    const p = item as Record<string, unknown>
    if (
      typeof p.id !== 'string' ||
      !p.id.trim() ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      typeof p.latitude !== 'number' ||
      !Number.isFinite(p.latitude) ||
      Math.abs(p.latitude) > 90 ||
      typeof p.longitude !== 'number' ||
      !Number.isFinite(p.longitude) ||
      Math.abs(p.longitude) > 180
    ) {
      throw new Error('장소 정보가 올바르지 않습니다.')
    }
    return {
      id: p.id,
      name: p.name,
      address: typeof p.address === 'string' ? p.address : '',
      category: typeof p.category === 'string' ? p.category : '',
      latitude: p.latitude,
      longitude: p.longitude,
      imageUrl: safeImageUrl(p.imageUrl),
    }
  })
  return Array.from(new Map(places.map((p) => [p.id, p])).values())
}

export function addPlace(selected: Place[], place: Place): Place[] {
  return selected.some((item) => item.id === place.id)
    ? selected
    : [...selected, place]
}

export async function searchPlaces(
  keyword: string,
  page: number,
  signal: AbortSignal,
): Promise<Place[]> {
  const query = new URLSearchParams({
    keyword: keyword.trim(),
    page: String(page),
    size: String(PAGE_SIZE),
  })
  const response = await fetch(`/api/places/search?${query}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('관광지 정보를 불러오지 못했습니다.')
  return parsePlaces(await response.json())
}
