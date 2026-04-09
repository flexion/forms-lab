import {
  runAccessibilityAudit,
  runVisualConformance,
} from '../../../lib/test-helpers/conformance-runner'
import { spec } from './conformance-spec'

// Spec-driven visual conformance and accessibility
runVisualConformance(spec)
runAccessibilityAudit(spec)
