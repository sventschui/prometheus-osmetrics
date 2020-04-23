const serializeLabels = require('./serialize-labels');

describe('serialize-labels', () => {
    it('should serialize empty array to empty string', () => {
        expect(serializeLabels({})).toEqual('');
    });

    it('should serialize a single label', () => {
        expect(serializeLabels({ foo: 'bar' })).toEqual('foo="bar"');
    });

    it('should multiple labels', () => {
        expect(serializeLabels({ foo: 'bar', hello: 'world' })).toEqual('foo="bar", hello="world"');
    });
});
