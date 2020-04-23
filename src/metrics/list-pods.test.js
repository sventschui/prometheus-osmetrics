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
              }
          }],
        }),
      };
    });

    const pods = await listPods({
      osApi,
      accessToken,
      namespace,
    });

    expect(pods.length).toEqual(1);
    // should unwrap metadata to the root
    expect(pods[0]).toHaveProperty('name', 'my-pod');
  });
});
