import type { FC } from 'hono/jsx'

interface RangeSliderProps {
  id: string
  name: string
  label: string
  min?: number
  max?: number
  value?: number
  step?: number
}

export const RangeSlider: FC<RangeSliderProps> = ({
  id,
  name,
  label,
  min = 0,
  max = 100,
  value = 50,
  step = 1,
}) => (
  <flex-range-slider>
    <label class="flex-label" for={id}>
      {label}
    </label>
    <div class="flex-range-slider__wrapper">
      <input
        class="flex-range-slider__input"
        id={id}
        name={name}
        type="range"
        min={String(min)}
        max={String(max)}
        value={String(value)}
        step={String(step)}
        aria-describedby={`${id}-value`}
      />
      <span
        class="flex-range-slider__value"
        id={`${id}-value`}
        aria-live="polite"
      >
        {value}
      </span>
    </div>
  </flex-range-slider>
)
