import type { FC } from 'hono/jsx'

interface BannerProps {
  contentId?: string
}

export const Banner: FC<BannerProps> = ({ contentId = 'banner-content' }) => {
  return (
    <section
      class="flex-banner"
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 64 64"
                role="img"
                aria-labelledby="banner-icon-gov"
              >
                <title id="banner-icon-gov">Dot gov</title>
                <circle cx="32" cy="32" r="26" fill="#2378c3" />
              </svg>
            </div>
            <div>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 64 64"
                role="img"
                aria-labelledby="banner-icon-ssl"
              >
                <title id="banner-icon-ssl">HTTPS</title>
                <rect
                  x="18"
                  y="28"
                  width="28"
                  height="24"
                  rx="2"
                  fill="#538200"
                />
                <path
                  d="M24 28V20a8 8 0 0 1 16 0v8"
                  fill="none"
                  stroke="#538200"
                  stroke-width="4"
                />
              </svg>
            </div>
            <div>
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
    </section>
  )
}
