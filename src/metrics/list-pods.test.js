const fetchMock = require("jest-fetch-mock").default;
fetchMock.enableMocks(); // needs to be before require('./list-pods')
const listPods = require("./list-pods");

describe("list-pods", () => {
  it("should list pods", async () => {
    const osApi = "https://osconsole.example.org";
    const namespace = "example-ns";
    const accessToken = "my-token";
    fetchMock.mockIf(/.*/, async (req) => {
      expect(req.url).toEqual(`${osApi}/api/v1/namespaces/${namespace}/pods`);
      expect(req.headers.get("authorization")).toEqual(`Bearer ${accessToken}`);
      expect(req.headers.get("accept")).toEqual("application/json");

      return {
        body: JSON.stringify({
          kind: "PodList",
          items: [{
              metadata: {
                  name: 'my-pod',
                  namespace,
                  selfLink: `/api/v1/namespaces/${namespace}/pods/my-pod`
              },
              containers: [{
                  name: 'my-container'
              }],
              status: {
                  phase: 'Running',
              },
          }],
        }),
      };
    });

    const pods = await listPods({
      osApi,
      accessToken,
      namespace,
    });

    expect(pods).toHaveProperty('length', 1);
    expect(pods).toHaveProperty('0.metadata.name', 'my-pod');
    expect(pods).toHaveProperty('0.status.phase', 'Running');
    expect(pods).toHaveProperty('0.containers.length', 1);
    expect(pods).toHaveProperty('0.containers.0.name', 'my-container');
  });

  it('should throw on status 400', async () => {
    const osApi = "https://osconsole.example.org";
    const namespace = "example-ns";
    const accessToken = "my-token";
    fetchMock.mockIf(/.*/, async (req) => {
      expect(req.url).toEqual(`${osApi}/api/v1/namespaces/${namespace}/pods`);
      expect(req.headers.get("authorization")).toEqual(`Bearer ${accessToken}`);
      expect(req.headers.get("accept")).toEqual("application/json");

      return {
        status: 400,
        url: '<url>',
      };
    });

    await expect(listPods({
      osApi,
      accessToken,
      namespace,
    })).rejects.toHaveProperty('message', 'OS API returned status code 400 for <url>');
  });

  it('should throw on status 204', async () => {
    const osApi = "https://osconsole.example.org";
    const namespace = "example-ns";
    const accessToken = "my-token";
    fetchMock.mockIf(/.*/, async (req) => {
      expect(req.url).toEqual(`${osApi}/api/v1/namespaces/${namespace}/pods`);
      expect(req.headers.get("authorization")).toEqual(`Bearer ${accessToken}`);
      expect(req.headers.get("accept")).toEqual("application/json");

      return {
        status: 204,
        url: '<url>',
      };
    });

    await expect(listPods({
      osApi,
      accessToken,
      namespace,
    })).rejects.toHaveProperty('message', 'OS API returned status code 204 for <url>');
  });

  it('should throw when result is not a podlist', async () => {
    const osApi = "https://osconsole.example.org";
    const namespace = "example-ns";
    const accessToken = "my-token";
    fetchMock.mockIf(/.*/, async (req) => {
      expect(req.url).toEqual(`${osApi}/api/v1/namespaces/${namespace}/pods`);
      expect(req.headers.get("authorization")).toEqual(`Bearer ${accessToken}`);
      expect(req.headers.get("accept")).toEqual("application/json");

      return {
        body: JSON.stringify({}),
      };
    });

    await expect(listPods({
      osApi,
      accessToken,
      namespace,
    })).rejects.toHaveProperty('message', 'Expected OS API to return a PodList but got undefined');
  });

  it('should throw when result is not an object', async () => {
    const osApi = "https://osconsole.example.org";
    const namespace = "example-ns";
    const accessToken = "my-token";
    fetchMock.mockIf(/.*/, async (req) => {
      expect(req.url).toEqual(`${osApi}/api/v1/namespaces/${namespace}/pods`);
      expect(req.headers.get("authorization")).toEqual(`Bearer ${accessToken}`);
      expect(req.headers.get("accept")).toEqual("application/json");

      return {
        body: JSON.stringify('str'),
      };
    });

    await expect(listPods({
      osApi,
      accessToken,
      namespace,
    })).rejects.toHaveProperty('message', 'Expected OS API to return an object but got string');
  });

  it('should throw when result is null', async () => {
    const osApi = "https://osconsole.example.org";
    const namespace = "example-ns";
    const accessToken = "my-token";
    fetchMock.mockIf(/.*/, async (req) => {
      expect(req.url).toEqual(`${osApi}/api/v1/namespaces/${namespace}/pods`);
      expect(req.headers.get("authorization")).toEqual(`Bearer ${accessToken}`);
      expect(req.headers.get("accept")).toEqual("application/json");

      return {
        body: JSON.stringify(null),
      };
    });

    await expect(listPods({
      osApi,
      accessToken,
      namespace,
    })).rejects.toHaveProperty('message', 'Expected OS API to return an object but got null');
  });

  it('should throw when result is an array', async () => {
    const osApi = "https://osconsole.example.org";
    const namespace = "example-ns";
    const accessToken = "my-token";
    fetchMock.mockIf(/.*/, async (req) => {
      expect(req.url).toEqual(`${osApi}/api/v1/namespaces/${namespace}/pods`);
      expect(req.headers.get("authorization")).toEqual(`Bearer ${accessToken}`);
      expect(req.headers.get("accept")).toEqual("application/json");

      return {
        body: JSON.stringify([]),
      };
    });

    await expect(listPods({
      osApi,
      accessToken,
      namespace,
    })).rejects.toHaveProperty('message', 'Expected OS API to return an object but got an array');
  });
});
