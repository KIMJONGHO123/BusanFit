import { useState } from 'react'
import { Icon } from '../../components/Icon'
import type { Place } from './places'

export function PlaceImage({ place }: { place: Place }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="place-image">
      {place.imageUrl && !failed ? (
        <img
          src={place.imageUrl}
          alt={`${place.name} 사진`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="image-placeholder">
          <Icon name="pin" />
          <span>사진 없음</span>
        </span>
      )}
    </div>
  )
}
