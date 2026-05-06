import type { Context } from 'hono'
import { Breadcrumb } from '../../../design-system/components/flex-breadcrumb/index'
import { Layout } from '../../../design-system/components/flex-layout/index'
import type { ProjectService } from '../../../services/projects'
import { resolveUrl } from '../../../shared/base-path'

export function projectsDirectoryHandler(projectService: ProjectService) {
  return (c: Context) => {
    const user = c.get('user')
    const projects = projectService
      .listAllProjects()
      .filter((p) => p.status === 'ready')
    return c.html(
      <Layout user={user} title="Projects" currentSection="projects">
        <Breadcrumb items={[{ label: 'Projects' }]} />
        <div class="flex-form" data-size="large">
          <h1>Projects</h1>
          {projects.length === 0 ? (
            <p>No projects yet.</p>
          ) : (
            <table class="flex-table" data-variant="borderless">
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Owner</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <th scope="row">
                      <a
                        href={resolveUrl(
                          `/${project.createdBy}/${project.slug}`,
                        )}
                      >
                        {project.name}
                      </a>
                    </th>
                    <td>
                      <a href={resolveUrl(`/${project.createdBy}`)}>
                        {project.createdBy}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Layout>,
    )
  }
}
