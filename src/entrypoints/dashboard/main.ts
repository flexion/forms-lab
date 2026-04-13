import app from './server'

const port = Number.parseInt(process.env.PORT || '3000', 10)

export default {
  port,
  fetch: app.fetch,
}
