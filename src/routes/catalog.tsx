import { join } from 'node:path'
import { Hono } from 'hono'
import { Layout } from '../components/Layout'
import { parseMarkdown, readMarkdownDir } from '../lib/markdown'
import type { Persona } from '../types/models'

const catalog = new Hono()

// List all personas
catalog.get('/personas', async (c) => {
  const personasDir = join(process.cwd(), 'catalog', 'personas')
  const files = await readMarkdownDir(personasDir)

  const personas: Persona[] = files.map((file) => ({
    id: file.frontmatter.id || file.filename,
    name: file.frontmatter.name || file.filename,
    role: file.frontmatter.role || '',
    description: file.content.split('\n\n')[0],
    needs: [],
    content: file.content,
  }))

  return c.html(
    <Layout title="Personas">
      <h1>Personas</h1>
      <p>
        Five personas span the full lifecycle of the Forms Lab platform: create
        → fill → operate → build → evaluate.
      </p>
      <div>
        {personas.map((persona) => (
          <div
            key={persona.id}
            style="margin: 2rem 0; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;"
          >
            <h2>
              <a href={`/catalog/personas/${persona.id}`}>{persona.name}</a>
            </h2>
            <p style="color: #6b7280; margin: 0.5rem 0;">{persona.role}</p>
          </div>
        ))}
      </div>
    </Layout>,
  )
})

// Individual persona page
catalog.get('/personas/:id', async (c) => {
  const id = c.req.param('id')
  const personasDir = join(process.cwd(), 'catalog', 'personas')
  const filePath = join(personasDir, `${id}.md`)

  try {
    const file = await parseMarkdown(filePath)

    const persona: Persona = {
      id: file.frontmatter.id || id,
      name: file.frontmatter.name || id,
      role: file.frontmatter.role || '',
      description: '',
      needs: [],
      content: file.content,
    }

    // Simple markdown-to-HTML rendering
    const htmlContent = persona.content
      .split('\n')
      .map((line) => {
        if (line.startsWith('### ')) {
          return `<h3>${line.slice(4)}</h3>`
        }
        if (line.startsWith('## ')) {
          return `<h2>${line.slice(3)}</h2>`
        }
        if (line.startsWith('# ')) {
          return `<h1>${line.slice(2)}</h1>`
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return `<p><strong>${line.slice(2, -2)}</strong></p>`
        }
        if (line.startsWith('- **')) {
          const boldEnd = line.indexOf('**', 4)
          if (boldEnd !== -1) {
            const boldText = line.slice(4, boldEnd)
            const rest = line.slice(boldEnd + 2)
            return `<li><strong>${boldText}</strong>${rest}</li>`
          }
          return `<li>${line.slice(2)}</li>`
        }
        if (line.startsWith('- ')) {
          return `<li>${line.slice(2)}</li>`
        }
        if (line.trim() === '') {
          return ''
        }
        return `<p>${line}</p>`
      })
      .join('\n')

    return c.html(
      <Layout title={persona.name}>
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        <p style="margin-top: 2rem;">
          <a href="/catalog/personas">← Back to Personas</a>
        </p>
      </Layout>,
    )
  } catch {
    return c.html(
      <Layout title="Not Found">
        <h1>Persona Not Found</h1>
        <p>The persona "{id}" does not exist.</p>
        <p>
          <a href="/catalog/personas">← Back to Personas</a>
        </p>
      </Layout>,
      404,
    )
  }
})

export default catalog
