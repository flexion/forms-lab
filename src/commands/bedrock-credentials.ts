import { resolve } from 'node:path'

const pulumiDir = resolve(import.meta.dir, '../../infrastructure/pulumi')

const BEDROCK_PROFILE = 'ClaudeCodeAccess-FlexionLLM'
const SSO_START_URL = 'https://d-9a6729e262.awsapps.com/start'
const SSO_REGION = 'us-east-2'
const SSO_ACCOUNT_ID = '529237317113'
const SSO_ROLE_NAME = 'ClaudeCodeAccess'
const BEDROCK_REGION = 'us-west-2'

function printUsage(): void {
  console.log('Usage: bun run cli bedrock-credentials <subcommand>\n')
  console.log('Subcommands:')
  console.log('  login        Login to AWS SSO for Bedrock access')
  console.log('  push         Copy SSO credentials to EC2 server')
  console.log('  status       Check if Bedrock credentials are valid on server')
  console.log()
  console.log('Background:')
  console.log(
    '  Forms Lab runs in AWS account 165286508758 (llm-class profile),',
  )
  console.log(
    '  but Bedrock model access requires account 529237317113 (FlexionLLM).',
  )
  console.log(
    '  This command manages SSO credentials for cross-account Bedrock access.',
  )
  console.log()
  console.log('  SSO tokens expire after ~8 hours. Re-run `login` then `push`')
  console.log('  to refresh.')
}

async function getHostname(): Promise<string | null> {
  const proc = Bun.spawn(['pulumi', 'stack', 'output', 'hostname'], {
    cwd: pulumiDir,
    stdout: 'pipe',
    env: { ...process.env, AWS_PROFILE: 'llm-class' },
  })
  const text = await new Response(proc.stdout).text()
  const code = await proc.exited
  return code === 0 ? text.trim() : null
}

async function ensureAwsConfig(hostname: string): Promise<void> {
  const configContent = `[profile ${BEDROCK_PROFILE}]
sso_start_url = ${SSO_START_URL}
sso_region = ${SSO_REGION}
sso_account_id = ${SSO_ACCOUNT_ID}
sso_role_name = ${SSO_ROLE_NAME}
region = ${BEDROCK_REGION}

[sso-session ${BEDROCK_PROFILE}]
sso_start_url = ${SSO_START_URL}
sso_region = ${SSO_REGION}
sso_registration_scopes = sso:account:access
`
  const proc = Bun.spawn(
    [
      'ssh',
      `root@${hostname}`,
      `mkdir -p /srv/forms-lab/.aws/sso/cache && cat > /srv/forms-lab/.aws/config << 'AWSEOF'\n${configContent}AWSEOF\nchown -R forms-lab:forms-lab /srv/forms-lab/.aws`,
    ],
    { stdio: ['inherit', 'inherit', 'inherit'] },
  )
  await proc.exited
}

async function findSsoCacheFile(): Promise<string | null> {
  const { readdirSync, readFileSync } = await import('node:fs')
  const { join } = await import('node:path')
  const home = process.env.HOME ?? ''
  const cacheDir = join(home, '.aws', 'sso', 'cache')

  try {
    const files = readdirSync(cacheDir)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const content = readFileSync(join(cacheDir, file), 'utf-8')
        const data = JSON.parse(content)
        if (
          data.startUrl === SSO_START_URL &&
          data.accessToken &&
          data.expiresAt
        ) {
          const expires = new Date(data.expiresAt)
          if (expires > new Date()) {
            return join(cacheDir, file)
          }
          console.error(
            `SSO token expired at ${data.expiresAt}. Run: bun run cli bedrock-credentials login`,
          )
          return null
        }
      } catch {}
    }
  } catch {
    // cache dir doesn't exist
  }

  console.error(
    `No valid SSO token found for ${SSO_START_URL}. Run: bun run cli bedrock-credentials login`,
  )
  return null
}

export async function bedrockCredentials(args: string[]): Promise<number> {
  const subcommand = args[0]

  switch (subcommand) {
    case 'login': {
      console.log(`Logging in to AWS SSO (${BEDROCK_PROFILE})...`)
      console.log(
        `Account: ${SSO_ACCOUNT_ID} | Role: ${SSO_ROLE_NAME} | Region: ${SSO_REGION}\n`,
      )
      const proc = Bun.spawn(
        ['aws', 'sso', 'login', '--profile', BEDROCK_PROFILE],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      const code = await proc.exited
      if (code === 0) {
        console.log(
          '\nLogin successful. Now run: bun run cli bedrock-credentials push',
        )
      }
      return code
    }

    case 'push': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }

      const cacheFile = await findSsoCacheFile()
      if (!cacheFile) return 1

      console.log(`Pushing Bedrock credentials to ${hostname}...`)

      // Ensure AWS config exists on server
      await ensureAwsConfig(hostname)

      // Copy SSO cache file
      const scp = Bun.spawn(
        ['scp', cacheFile, `root@${hostname}:/srv/forms-lab/.aws/sso/cache/`],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      const scpCode = await scp.exited
      if (scpCode !== 0) {
        console.error('Failed to copy SSO cache')
        return 1
      }

      // Fix ownership and restart branch services
      console.log('Restarting branch services...')
      const restart = Bun.spawn(
        [
          'ssh',
          `root@${hostname}`,
          'chown -R forms-lab:forms-lab /srv/forms-lab/.aws && systemctl restart "forms-lab-app@*.service" 2>/dev/null; echo "Services restarted"',
        ],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      await restart.exited

      console.log('Done. Bedrock credentials pushed to server.')
      return 0
    }

    case 'status': {
      const hostname = await getHostname()
      if (!hostname) {
        console.error('Could not get hostname from Pulumi outputs')
        return 1
      }

      console.log(`Checking Bedrock credentials on ${hostname}...\n`)
      const proc = Bun.spawn(
        [
          'ssh',
          `root@${hostname}`,
          `cd /srv/forms-lab/main 2>/dev/null || cd /srv/forms-lab/story-3-pdf-upload && HOME=/srv/forms-lab bun -e '
async function check() {
  const { fromIni } = await import("@aws-sdk/credential-providers");
  try {
    const creds = await fromIni({ profile: "${BEDROCK_PROFILE}" })();
    const expires = creds.expiration ? creds.expiration.toISOString() : "unknown";
    console.log("Status: Valid");
    console.log("Account: ${SSO_ACCOUNT_ID}");
    console.log("Profile: ${BEDROCK_PROFILE}");
    console.log("Expires:", expires);
  } catch(e) {
    console.log("Status: INVALID");
    console.log("Error:", e.message);
    console.log("\\nRun: bun run cli bedrock-credentials login && bun run cli bedrock-credentials push");
    process.exit(1);
  }
}
check();
'`,
        ],
        { stdio: ['inherit', 'inherit', 'inherit'] },
      )
      return await proc.exited
    }

    default:
      printUsage()
      return subcommand ? 1 : 0
  }
}
