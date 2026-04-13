import type { GitHubClient } from '../../services/deployment/github'
import { notifyEvent } from '../../services/notifications/client'

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
  const script =
    process.env.DEPLOY_MAIN_SCRIPT || '/srv/forms-lab/deploy-main.sh'

  try {
    const proc = Bun.spawn([script, sha], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      console.error(`Main deployment failed:`, stderr)
      notifyEvent({
        type: 'deploy.failure',
        title: `Main deployment failed at ${sha.slice(0, 7)}`,
        status: 'failure',
        details: stderr.slice(0, 500) || undefined,
      })
      return { success: false, error: stderr, stdout, stderr }
    }

    console.log(`Main deployment succeeded:`, stdout)
    notifyEvent({
      type: 'deploy.success',
      title: `Main deployment succeeded at ${sha.slice(0, 7)}`,
      status: 'success',
    })
    return { success: true, stdout, stderr }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Main deployment error:`, message)
    notifyEvent({
      type: 'deploy.failure',
      title: `Main deployment error at ${sha.slice(0, 7)}`,
      status: 'failure',
      details: message.slice(0, 500),
    })
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

  if (result.success) {
    notifyEvent({
      type: 'deploy.success',
      title: `Deployed \`${branch}\` at ${sha.slice(0, 7)}`,
      status: 'success',
      details: result.stdout?.split('\n').pop() || undefined,
    })
  } else {
    notifyEvent({
      type: 'deploy.failure',
      title: `Deploy failed for \`${branch}\``,
      status: 'failure',
      details: result.error?.slice(0, 500) || undefined,
    })
  }

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
