const createServer = require('./server');

const osApi = process.env.OS_API;
if (!osApi) {
    console.error('Please set the OS_API env variable!');
    process.exit(-1);
}

const osMetricApi = process.env.OS_METRIC_API;
if (!osMetricApi) {
    console.error('Please set the OS_METRIC_API env variable!');
    process.exit(-1);
}

const accessToken = process.env.OS_ACCESS_TOKEN;
if (!accessToken) {
    console.error('Please set the OS_ACCESS_TOKEN env variable!');
    process.exit(-1);
}

const start = async () => {
  const server = createServer({
      fastifyOptions: {
          logger: {
              prettyPrint: {
                translateTime: true
              },
          }
      },
      osApi,
      osMetricApi,
      accessToken,
  });

  server.log.info('Using OS API %s, OS Metric API %s', osApi, osMetricApi)

  try {
    await server.listen(3000, '0.0.0.0');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
