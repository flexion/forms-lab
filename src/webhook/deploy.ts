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
