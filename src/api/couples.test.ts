import { describe, expect, it } from 'vitest'
import { normalizeInviteCode } from './couples'

describe('normalizeInviteCode', () => {
  it('accepts a plain invite code', () => {
    expect(normalizeInviteCode('LOCAL-COVI9Z')).toBe('COVI9Z')
  })

  it('accepts a full join url', () => {
    expect(normalizeInviteCode('http://localhost:5176/join?code=LOCAL-COVI9Z')).toBe('COVI9Z')
  })
})
