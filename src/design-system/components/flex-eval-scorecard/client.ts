export class FlexEvalScorecard extends HTMLElement {
  connectedCallback() {
    // Read-only server-rendered; no interactive behavior needed yet.
  }
}

if (!customElements.get('flex-eval-scorecard')) {
  customElements.define('flex-eval-scorecard', FlexEvalScorecard)
}
