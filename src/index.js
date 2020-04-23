const pino = require('pino')
const createServer = require('./server')
const collectSettings = require('./collect-settings')

const logger = pino({
  prettyPrint: process.env.NODE_ENV != 'production' ? {
    translateTime: true
  } : false,
});

console.log(process.argv)

const start = async () => {
  let options;
  try {
  options = await collectSettings(process.env);
  } catch (e) {
    pino.final(logger).error(e.message);
    process.exit(-1);
  }

  const server = createServer({
    logger,
    ...options,
  })

  server.log.info('Using OS API %s, OS Metric API %s', options.osApi, options.osMetricApi)

  try {
    await server.listen(3000, '0.0.0.0')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
