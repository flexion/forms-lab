import type { GitHubClient } from '../services/github'

export interface DeployResult {
  success: boolean
  error?: string
  stdout?: string
  stderr?: string
}

export async function triggerDeploy(
  branch: string,
  sha: string,
): Promise<DeployResult> {
  const script = process.env.DEPLOY_SCRIPT || '/srv/forms-lab/deploy.sh'

  try {
    const proc = Bun.spawn([script, branch, sha], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      console.error(`Deploy failed for ${branch}@${sha}:`, stderr)
      return { success: false, error: stderr, stdout, stderr }
    }

    console.log(`Deploy succeeded for ${branch}@${sha}:`, stdout)
    return { success: true, stdout, stderr }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Deploy error for ${branch}@${sha}:`, message)
    return { success: false, error: message }
  }
}

export interface DeployWithStatusOptions {
  branch: string
  sha: string
  owner: string
  repo: string
  githubClient?: GitHubClient
  hostname?: string
}

export async function deployMainBranch(sha: string): Promise<DeployResult> {
  try {
    const proc = Bun.spawn(
      [
        'bash',
        '-c',
        `
      set -e
      cd /tmp
      rm -rf forms-lab-deploy
      git clone https://github.com/flexion/forms-lab.git forms-lab-deploy
      cd forms-lab-deploy
      git checkout ${sha}

      # Check if nixos config changed since last deployment
      if ! diff -qr infrastructure/nixos /etc/nixos >/dev/null 2>&1; then
        echo "NixOS config changed, rebuilding..."
        rsync -av infrastructure/nixos/ /etc/nixos/
        nixos-rebuild switch --flake /etc/nixos#forms-lab
      else
        echo "No NixOS config changes"
      fi

      # Deploy main branch app
      forms-lab-deploy main ${sha}

      # Restart homepage service
      systemctl restart forms-lab-homepage.service

      # Health check
      sleep 2
      curl -f http://localhost:3000/health || exit 1

      echo "Main deployment complete"
    `,
      ],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      console.error(`Main deployment failed:`, stderr)
      return { success: false, error: stderr, stdout, stderr }
    }

    console.log(`Main deployment succeeded:`, stdout)
    return { success: true, stdout, stderr }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Main deployment error:`, message)
    return { success: false, error: message }
  }
}

export async function triggerDeployWithStatus(
  options: DeployWithStatusOptions,
): Promise<DeployResult> {
  const { branch, sha, owner, repo, githubClient, hostname } = options
  const safeBranch = branch.replace(/\//g, '-')

  if (!githubClient || !owner || !repo) {
    return triggerDeploy(branch, sha)
  }

  let deploymentId: number | undefined
  try {
    const deployment = await githubClient.createDeployment(
      owner,
      repo,
      sha,
      safeBranch,
      `Deploy ${branch} to ${safeBranch}`,
    )
    deploymentId = deployment.id

    await githubClient.createDeploymentStatus(
      owner,
      repo,
      deploymentId,
      'in_progress',
      undefined,
      `Deploying ${branch}@${sha.slice(0, 7)}...`,
    )
  } catch (err) {
    console.error('Failed to create GitHub deployment:', err)
  }

  const result = await triggerDeploy(branch, sha)

  if (deploymentId) {
    try {
      if (result.success) {
        const environmentUrl = hostname
          ? `https://${hostname}/${safeBranch}/`
          : undefined
        await githubClient.createDeploymentStatus(
          owner,
          repo,
          deploymentId,
          'success',
          environmentUrl,
          `Deployed ${branch}@${sha.slice(0, 7)}`,
        )
      } else {
        await githubClient.createDeploymentStatus(
          owner,
          repo,
          deploymentId,
          'failure',
          undefined,
          result.error?.slice(0, 140) || 'Deploy failed',
        )
      }
    } catch (err) {
      console.error('Failed to update GitHub deployment status:', err)
    }
  }

  return result
}
