const os = require('os')
const fs = require('fs')
const path = require('path')
const pino = require('pino')
const https = require('https')
const collectSettings = require('./collect-settings')

const logger = pino()

describe('collect-settings', () => {
  it('should throw if OS_API is missing', async () => {
    await expect(collectSettings({}, logger)).rejects.toHaveProperty(
      'message',
      'Please set the OS_API env variable!'
    )
  })

  it('should throw if OS_METRIC_API is missing', async () => {
    await expect(
      collectSettings({ OS_API: 'foo' }, logger)
    ).rejects.toHaveProperty(
      'message',
      'Please set the OS_METRIC_API env variable!'
    )
  })

  it('should throw if OS_ACCESS_TOKEN is missing', async () => {
    await expect(
      collectSettings({ OS_API: 'foo', OS_METRIC_API: 'bar' }, logger)
    ).rejects.toHaveProperty(
      'message',
      'Please set the OS_ACCESS_TOKEN or OS_ACCESS_TOKEN_FILE env variable!'
    )
  })

  it('should return correct settings', async () => {
    expect(
      await collectSettings(
        {
          OS_API: 'foo',
          OS_METRIC_API: 'bar',
          OS_ACCESS_TOKEN: 'baz'
        },
        logger
      )
    ).toEqual({
      osApi: 'foo',
      osMetricApi: 'bar',
      accessToken: 'baz',
      agent: null,
      defaultNamespace: null
    })
  })

  it('should support OS_ACCESS_TOKEN_FILE', async () => {
    const atFilePath = path.join(os.tmpdir(), 'at_file')
    await fs.promises.writeFile(atFilePath, 'baz')
    expect(
      await collectSettings(
        {
          OS_API: 'foo',
          OS_METRIC_API: 'bar',
          OS_ACCESS_TOKEN_FILE: atFilePath
        },
        logger
      )
    ).toEqual({
      osApi: 'foo',
      osMetricApi: 'bar',
      accessToken: 'baz',
      agent: null,
      defaultNamespace: null
    })
  })

  it('should fall back to KUBERNETES_SERVICE_HOST if OS_API is missing', async () => {
    expect(
      await collectSettings(
        {
          KUBERNETES_SERVICE_HOST: '127.0.0.1',
          OS_METRIC_API: 'bar',
          OS_ACCESS_TOKEN: 'baz',
          agent: null
        },
        logger
      )
    ).toEqual({
      osApi: 'https://127.0.0.1',
      osMetricApi: 'bar',
      accessToken: 'baz',
      agent: null,
      defaultNamespace: null
    })
  })

  it('should return custom agent when OS_CERTIFICATE_AUTHORITY is set', async () => {
    const caFilePath = path.join(os.tmpdir(), 'ca')
    await fs.promises.writeFile(caFilePath, '')
    expect(
      await collectSettings(
        {
          OS_API: 'foo',
          OS_METRIC_API: 'bar',
          OS_ACCESS_TOKEN: 'baz',
          OS_CERTIFICATE_AUTHORITY: caFilePath
        },
        logger
      )
    ).toMatchObject({
      osApi: 'foo',
      osMetricApi: 'bar',
      accessToken: 'baz',
      agent: expect.any(https.Agent),
      defaultNamespace: null
    })
  })

  it('should support OS_DEFAULT_NAMESPACE with a single namespace', async () => {
    expect(
      await collectSettings(
        {
          OS_API: 'foo',
          OS_METRIC_API: 'bar',
          OS_ACCESS_TOKEN: 'baz',
          OS_DEFAULT_NAMESPACE: 'foo'
        },
        logger
      )
    ).toMatchObject({
      osApi: 'foo',
      osMetricApi: 'bar',
      accessToken: 'baz',
      agent: null,
      defaultNamespace: ['foo']
    })
  })

  it('should support OS_DEFAULT_NAMESPACE with a multiple namespaces', async () => {
    expect(
      await collectSettings(
        {
          OS_API: 'foo',
          OS_METRIC_API: 'bar',
          OS_ACCESS_TOKEN: 'baz',
          OS_DEFAULT_NAMESPACE: 'foo,bar'
        },
        logger
      )
    ).toMatchObject({
      osApi: 'foo',
      osMetricApi: 'bar',
      accessToken: 'baz',
      agent: null,
      defaultNamespace: ['foo', 'bar']
    })
  })
})
