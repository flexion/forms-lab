import { describe, expect, it, mock } from 'bun:test'
import {
  checkOrgMembership,
  checkRepoPermission,
  exchangeCodeForToken,
  fetchUserProfile,
  type GitHubUser,
} from '../src/lib/github-oauth'

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
})
