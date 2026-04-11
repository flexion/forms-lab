import { Hono } from 'hono'
import { Layout } from '../../components/flex-layout'

const projects = new Hono()

projects.get('/', (c) => {
  const user = c.get('user')

  return c.html(
    <Layout currentPath="/projects" user={user}>
      <h1>My Projects</h1>
      <p>Welcome, {user?.name}!</p>
      <p>
        This is a placeholder. Project authoring functionality will be added in
        future stories.
      </p>
    </Layout>,
  )
})

export default projects
