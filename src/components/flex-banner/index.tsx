import type { Child, FC } from 'hono/jsx'

interface BannerGuidanceItem {
  icon: { src: string; alt: string; color?: string }
  heading: string
  text: Child
}

interface BannerProps {
  /** aria-label for the banner region */
  ariaLabel?: string
  /** Header text (e.g., "An official website of the United States government") */
  headerText?: string
  /** Flag/logo image in the header */
  headerImage?: { src: string; alt: string }
  /** Button text to expand guidance (e.g., "Here's how you know") */
  buttonText?: string
  /** Two guidance sections shown when expanded */
  guidance?: [BannerGuidanceItem, BannerGuidanceItem]
  /** ID for the expandable content panel */
  contentId?: string
}

const DEFAULT_GUIDANCE: [BannerGuidanceItem, BannerGuidanceItem] = [
  {
    icon: { src: '/static/img/icon-dot-gov.svg', alt: 'Dot gov' },
    heading: 'Official websites use .gov',
    text: (
      <>
        A <strong>.gov</strong> website belongs to an official government
        organization in the United States.
      </>
    ),
  },
  {
    icon: { src: '/static/img/icon-https.svg', alt: 'HTTPS' },
    heading: 'Secure .gov websites use HTTPS',
    text: (
      <>
        A <strong>lock</strong> or <strong>https://</strong> means you've safely
        connected to the .gov website.
      </>
    ),
  },
]

export const Banner: FC<BannerProps> = ({
  ariaLabel = 'Official website of the United States government',
  headerText = 'An official website of the United States government',
  headerImage = { src: '/static/img/us_flag_small.png', alt: 'U.S. flag' },
  buttonText = "Here's how you know",
  guidance = DEFAULT_GUIDANCE,
  contentId = 'banner-content',
}) => {
  return (
    <flex-banner class="flex-banner" role="region" aria-label={ariaLabel}>
      <div class="flex-banner__header">
        <div class="flex-banner__inner">
          <div class="flex-banner__header-text">
            <p>
              {headerImage && (
                <img
                  class="flex-banner__header-flag"
                  src={headerImage.src}
                  alt={headerImage.alt}
                />
              )}
              {headerText}
            </p>
          </div>
          {buttonText && (
            <button
              type="button"
              class="flex-banner__button"
              aria-expanded="false"
              aria-controls={contentId}
            >
              <span class="flex-banner__button-text">{buttonText}</span>
            </button>
          )}
        </div>
      </div>
      {guidance && (
        <div class="flex-banner__content" id={contentId} hidden>
          <div class="flex-banner__guidance">
            {guidance.map((item, i) => (
              <div
                class={`flex-banner__guidance-${i === 0 ? 'gov' : 'ssl'}`}
                key={item.heading}
              >
                <div class="flex-banner__icon">
                  {item.icon.src.includes('#') ? (
                    <svg
                      class="flex-banner__icon-img"
                      aria-hidden="true"
                      focusable="false"
                      style={
                        item.icon.color ? `fill: ${item.icon.color}` : undefined
                      }
                    >
                      <use href={item.icon.src} />
                    </svg>
                  ) : (
                    <img
                      src={item.icon.src}
                      alt={item.icon.alt}
                      class="flex-banner__icon-img"
                      role="img"
                    />
                  )}
                </div>
                <div class="flex-banner__guidance-text">
                  <p>
                    <strong>{item.heading}</strong>
                  </p>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </flex-banner>
  )
}
