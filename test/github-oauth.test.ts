import { describe, expect, it, mock } from 'bun:test'
import {
  checkOrgMembership,
  checkRepoPermission,
  exchangeCodeForToken,
  fetchUserEmails,
  fetchUserProfile,
  type GitHubEmail,
  type GitHubUser,
  hasAllowedEmailDomain,
} from '../src/services/auth'

describe('GitHub OAuth', () => {
  describe('exchangeCodeForToken', () => {
    it('exchanges authorization code for access token', async () => {
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ access_token: 'gho_test_token' }), {
            status: 200,
          }),
        ),
      )
      // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      global.fetch = mockFetch as any

      const token = await exchangeCodeForToken(
        'test_code',
        'client_id',
        'client_secret',
      )
      expect(token).toBe('gho_test_token')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('throws on failed token exchange', async () => {
      global.fetch = mock(
        () => Promise.resolve(new Response('', { status: 400 })),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      await expect(
        exchangeCodeForToken('bad_code', 'client_id', 'client_secret'),
      ).rejects.toThrow('Failed to exchange code for token')
    })

    it('throws when GitHub returns error in 200 response', async () => {
      global.fetch = mock(
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ error: 'bad_verification_code' }), {
              status: 200,
            }),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      await expect(
        exchangeCodeForToken('bad_code', 'client_id', 'client_secret'),
      ).rejects.toThrow(
        'Failed to exchange code for token: bad_verification_code',
      )
    })
  })

  describe('fetchUserProfile', () => {
    it('fetches user profile from GitHub API', async () => {
      const mockUser: GitHubUser = {
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.png',
      }

      global.fetch = mock(
        () =>
          Promise.resolve(
            new Response(JSON.stringify(mockUser), { status: 200 }),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      const user = await fetchUserProfile('gho_test_token')
      expect(user).toEqual(mockUser)
    })

    it('throws on failed profile fetch', async () => {
      global.fetch = mock(
        () => Promise.resolve(new Response('', { status: 401 })),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      await expect(fetchUserProfile('bad_token')).rejects.toThrow(
        'Failed to fetch user profile',
      )
    })
  })

  describe('checkOrgMembership', () => {
    it('returns true for users in the organization', async () => {
      global.fetch = mock(
        () =>
          Promise.resolve(
            new Response(
              JSON.stringify([{ login: 'flexion' }, { login: 'other-org' }]),
              { status: 200 },
            ),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      const isMember = await checkOrgMembership('gho_test_token', 'flexion')
      expect(isMember).toBe(true)
    })

    it('returns false for users not in the organization', async () => {
      global.fetch = mock(
        () =>
          Promise.resolve(
            new Response(JSON.stringify([{ login: 'other-org' }]), {
              status: 200,
            }),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      const isMember = await checkOrgMembership('gho_test_token', 'flexion')
      expect(isMember).toBe(false)
    })

    it('returns false when org list fetch fails', async () => {
      global.fetch = mock(
        () => Promise.resolve(new Response('', { status: 401 })),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      const isMember = await checkOrgMembership('gho_test_token', 'flexion')
      expect(isMember).toBe(false)
    })
  })

  describe('checkRepoPermission', () => {
    it('returns true for users with admin permission', async () => {
      global.fetch = mock(
        () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                permissions: { admin: true, push: true, pull: true },
              }),
              { status: 200 },
            ),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      const hasPermission = await checkRepoPermission(
        'gho_test_token',
        'testuser',
        'flexion/forms-lab',
      )
      expect(hasPermission).toBe(true)
    })

    it('returns true for users with push permission', async () => {
      global.fetch = mock(
        () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                permissions: { admin: false, push: true, pull: true },
              }),
              { status: 200 },
            ),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      const hasPermission = await checkRepoPermission(
        'gho_test_token',
        'testuser',
        'flexion/forms-lab',
      )
      expect(hasPermission).toBe(true)
    })

    it('returns false for users with only pull permission', async () => {
      global.fetch = mock(
        () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                permissions: { admin: false, push: false, pull: true },
              }),
              { status: 200 },
            ),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      const hasPermission = await checkRepoPermission(
        'gho_test_token',
        'testuser',
        'flexion/forms-lab',
      )
      expect(hasPermission).toBe(false)
    })

    it('returns false when repo is not accessible', async () => {
      global.fetch = mock(
        () => Promise.resolve(new Response('', { status: 404 })),
        // biome-ignore lint/suspicious/noExplicitAny: Mock type doesn't match global.fetch signature
      ) as any

      const hasPermission = await checkRepoPermission(
        'gho_test_token',
        'testuser',
        'flexion/forms-lab',
      )
      expect(hasPermission).toBe(false)
    })
  })

  describe('fetchUserEmails', () => {
    it('returns the email list on success', async () => {
      const emails: GitHubEmail[] = [
        {
          email: 'daniel@flexion.us',
          primary: true,
          verified: true,
          visibility: 'private',
        },
        {
          email: 'daniel@example.com',
          primary: false,
          verified: false,
          visibility: null,
        },
      ]
      global.fetch = mock(
        () =>
          Promise.resolve(
            new Response(JSON.stringify(emails), { status: 200 }),
          ),
        // biome-ignore lint/suspicious/noExplicitAny: mock signature
      ) as any

      const result = await fetchUserEmails('gho_test_token')
      expect(result).toHaveLength(2)
      expect(result[0].email).toBe('daniel@flexion.us')
    })

    it('returns empty array when scope is missing', async () => {
      global.fetch = mock(
        () => Promise.resolve(new Response('', { status: 404 })),
        // biome-ignore lint/suspicious/noExplicitAny: mock signature
      ) as any

      const result = await fetchUserEmails('gho_test_token')
      expect(result).toEqual([])
    })
  })

  describe('hasAllowedEmailDomain', () => {
    const emails: GitHubEmail[] = [
      {
        email: 'person@flexion.us',
        primary: true,
        verified: true,
        visibility: null,
      },
      {
        email: 'person@example.com',
        primary: false,
        verified: true,
        visibility: null,
      },
      {
        email: 'person@unverified-flexion.us',
        primary: false,
        verified: false,
        visibility: null,
      },
    ]

    it('matches a verified email on the allowed domain', () => {
      expect(hasAllowedEmailDomain(emails, ['flexion.us'])).toBe(true)
    })

    it('is case-insensitive on the domain', () => {
      expect(hasAllowedEmailDomain(emails, ['FLEXION.US'])).toBe(true)
      const cased: GitHubEmail[] = [
        { ...emails[0], email: 'Person@Flexion.US' },
      ]
      expect(hasAllowedEmailDomain(cased, ['flexion.us'])).toBe(true)
    })

    it('ignores unverified emails even when the domain matches', () => {
      const unverified: GitHubEmail[] = [
        { ...emails[2], email: 'person@flexion.us', verified: false },
      ]
      expect(hasAllowedEmailDomain(unverified, ['flexion.us'])).toBe(false)
    })

    it('returns false when no domain matches', () => {
      expect(hasAllowedEmailDomain(emails, ['other.org'])).toBe(false)
    })

    it('returns false when allowedDomains is empty', () => {
      expect(hasAllowedEmailDomain(emails, [])).toBe(false)
    })

    it('supports multiple allowed domains', () => {
      expect(hasAllowedEmailDomain(emails, ['other.org', 'flexion.us'])).toBe(
        true,
      )
    })

    it('does not match substrings of a domain', () => {
      // "not-flexion.us" ends with "flexion.us" but is not equal; the
      // check must not admit it.
      const tricky: GitHubEmail[] = [
        {
          email: 'attacker@not-flexion.us',
          primary: true,
          verified: true,
          visibility: null,
        },
      ]
      expect(hasAllowedEmailDomain(tricky, ['flexion.us'])).toBe(false)
    })
  })
})
