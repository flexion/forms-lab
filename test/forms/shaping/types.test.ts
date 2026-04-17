import { describe, expect, it } from 'bun:test'
import type { FormPage } from '../../../src/services/forms/types'

describe('FormPage type', () => {
  it('accepts deliveryMode property', () => {
    const page: FormPage = {
      id: 'page-1',
      title: 'Test',
      groups: ['g1'],
      deliveryMode: 'static',
    }
    expect(page.deliveryMode).toBe('static')
  })

  it('defaults deliveryMode to undefined when omitted', () => {
    const page: FormPage = {
      id: 'page-1',
      title: 'Test',
      groups: ['g1'],
    }
    expect(page.deliveryMode).toBeUndefined()
  })
})
