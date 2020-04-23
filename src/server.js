const fastify = require("fastify");
const fastifySensible = require('fastify-sensible');
const collectMetrics = require('./metrics/collect');
const serializeMetrics = require('./metrics/serialize');

/**
 * @typedef {Object} Options
 * @property {Object=} fastifyOptions
 * @property {number=} concurrency
 * @property {string} osMetricApi
 * @property {string} osApi
 * @property {string} accessToken
 */

/**
 * @param {Options} options
 */
module.exports = function createServer({ fastifyOptions = {}, concurrency = 10, osMetricApi, osApi, accessToken }) {
  const server = fastify({
    logger: true,
    ...fastifyOptions,
  });

  server.register(fastifySensible);

  server.get("/health", (req, reply) => {
    reply.send({ status: "ok" });
  });

  server.get(
    "/metrics",
    {
      schema: {
        querystring: {
          type: "object",
          required: [],
          properties: {
            namespace: { // TODO: make required
              oneOf: [
                { type: "string", minLength: 1 },
                {
                  type: "array",
                  items: { type: "string", minLength: 1 },
                },
              ],
            },
            excitement: { type: "integer" },
          },
          additionalProperties: false
        },
      },
    },
    async (req, reply) => {
      reply.send(serializeMetrics(await collectMetrics({
          namespace: Array.isArray(req.query.namespace) ? req.query.namespace : [req.query.namespace],
          concurrency,
          osMetricApi,
          osApi,
          accessToken,
      })))
    }
  );

  return server;
};
