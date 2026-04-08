import type { FC } from 'hono/jsx'

interface BannerProps {
  contentId?: string
}

export const Banner: FC<BannerProps> = ({ contentId = 'banner-content' }) => {
  return (
    <flex-banner
      class="flex-banner"
      role="region"
      aria-label="Official website of the United States government"
    >
      <div class="flex-banner__header">
        <div class="flex-banner__inner">
          <div class="flex-banner__header-text">
            <p>
              <img
                class="flex-banner__header-flag"
                src="/static/img/us_flag_small.png"
                alt="U.S. flag"
              />
              An official website of the United States government
            </p>
          </div>
          <button
            type="button"
            class="flex-banner__button"
            aria-expanded="false"
            aria-controls={contentId}
          >
            <span class="flex-banner__button-text">Here's how you know</span>
          </button>
        </div>
      </div>
      <div class="flex-banner__content" id={contentId} hidden>
        <div class="flex-banner__guidance">
          <div class="flex-banner__guidance-gov">
            <div class="flex-banner__icon">
              <img
                src="/static/img/icon-dot-gov.svg"
                alt="Dot gov"
                class="flex-banner__icon-img"
                role="img"
              />
            </div>
            <div class="flex-banner__guidance-text">
              <p>
                <strong>Official websites use .gov</strong>
              </p>
              <p>
                A <strong>.gov</strong> website belongs to an official
                government organization in the United States.
              </p>
            </div>
          </div>
          <div class="flex-banner__guidance-ssl">
            <div class="flex-banner__icon">
              <img
                src="/static/img/icon-https.svg"
                alt="HTTPS"
                class="flex-banner__icon-img"
                role="img"
              />
            </div>
            <div class="flex-banner__guidance-text">
              <p>
                <strong>Secure .gov websites use HTTPS</strong>
              </p>
              <p>
                A <strong>lock</strong> or <strong>https://</strong> means
                you've safely connected to the .gov website.
              </p>
            </div>
          </div>
        </div>
      </div>
    </flex-banner>
  )
}
