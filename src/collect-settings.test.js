const os = require('os');
const fs = require('fs');
const path = require('path');
const collectSettings = require('./collect-settings');

describe('collect-settings', () => {
    it('should throw if OS_API is missing', async () => {
        await expect(collectSettings({})).rejects.toHaveProperty('message', 'Please set the OS_API env variable!');
    });

    it('should throw if OS_METRIC_API is missing', async () => {
        await expect(collectSettings({ OS_API: 'foo' })).rejects.toHaveProperty('message', 'Please set the OS_METRIC_API env variable!');
    });

    it('should throw if OS_ACCESS_TOKEN is missing', async () => {
        await expect(collectSettings({ OS_API: 'foo', OS_METRIC_API: 'bar' })).rejects.toHaveProperty('message', 'Please set the OS_ACCESS_TOKEN or OS_ACCESS_TOKEN_FILE env variable!');
    });

    it('should return correct settings', async () => {
        expect(await collectSettings({
            OS_API: 'foo',
            OS_METRIC_API: 'bar',
            OS_ACCESS_TOKEN: 'baz'
        })).toEqual({
            osApi: 'foo',
            osMetricApi: 'bar',
            accessToken: 'baz',
        });
    });

    it('should support OS_ACCESS_TOKEN_FILE', async () => {
        const atFilePath = path.join(os.tmpdir(), 'at_file');
        await fs.promises.writeFile(atFilePath, 'baz')
        expect(await collectSettings({
            OS_API: 'foo',
            OS_METRIC_API: 'bar',
            OS_ACCESS_TOKEN_FILE: atFilePath
        })).toEqual({
            osApi: 'foo',
            osMetricApi: 'bar',
            accessToken: 'baz',
        });
    });
})