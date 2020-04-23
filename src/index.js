const createServer = require('./server')
const collectSettings = require('./collect-settings')

const start = async () => {
  const { osApi, osMetricApi, accessToken } = await collectSettings(process.env)

  const server = createServer({
    fastifyOptions: {
      logger: {
        prettyPrint: {
          translateTime: true
        }
      }
    },
    osApi,
    osMetricApi,
    accessToken
  })

  server.log.info('Using OS API %s, OS Metric API %s', osApi, osMetricApi)

  try {
    await server.listen(3000, '0.0.0.0')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
