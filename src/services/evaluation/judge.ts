import type { JudgeResponse } from './judge-schemas'
import type { FlatField } from './kinds/shared'

export interface FieldJudge {
  judge(
    extracted: FlatField[],
    groundTruth: FlatField[],
  ): Promise<JudgeResponse>
}
