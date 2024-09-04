import { mockPriceWebSocketServer, mockWSEndpoint } from "./fixtures";
import { WebSocketClassProvider } from "@chainlink/external-adapter-framework/transports";
import {
  TestAdapter,
  setEnvVariables,
  mockWebSocketProvider,
  MockWebsocketServer,
} from "@chainlink/external-adapter-framework/util/testing-utils";
import FakeTimers from "@sinonjs/fake-timers";

describe("Price Endpoint", () => {
  let spy: jest.SpyInstance;
  let mockWsServer: MockWebsocketServer | undefined;
  let testAdapter: TestAdapter;
  let oldEnv: NodeJS.ProcessEnv;
  const wsEndpoint = mockWSEndpoint;
  const data = {
    endpoint: "price",
    base: "ETH",
    quote: "USD",
  };

  beforeAll(async () => {
    oldEnv = JSON.parse(JSON.stringify(process.env));

    process.env.WS_API_ENDPOINT = wsEndpoint;

    const mockDate = new Date("2023-01-01T00:00:00.000Z");
    spy = jest.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

    mockWebSocketProvider(WebSocketClassProvider);
    mockWsServer = mockPriceWebSocketServer();

    const adapter = (await import("./../../src")).adapter;
    testAdapter = await TestAdapter.startWithMockedCache(adapter, {
      clock: FakeTimers.install(),
      testAdapter: {} as TestAdapter<never>,
    });

    await testAdapter.request(data);
    await testAdapter.waitForCache(1);
  });

  afterAll(async () => {
    spy.mockRestore();
    setEnvVariables(oldEnv);
    mockWsServer?.close();
    testAdapter.clock?.uninstall();
    await testAdapter.api.close();
  });

  it("should return success", async () => {
    const response = await testAdapter.request(data);
    expect(response.json()).toMatchSnapshot({
      statusCode: 200,
      result: 1272.12,
      data: {
        result: 1272.12,
      },
      timestamps: {
        providerDataReceivedUnixMs: expect.any(Number),
        providerDataStreamEstablishedUnixMs: expect.any(Number),
      },
    });
  });

  it("should handle empty base param", async () => {
    const response = await testAdapter.request({ base: "", quote: "USD" });
    expect(response.json()).toMatchSnapshot({
      statusCode: 400,
      error: {
        message: 'Input "base" cannot be empty.',
      },
    });
  });

  it("should handle empty quote param", async () => {
    const response = await testAdapter.request({ base: "BTC", quote: "" });
    expect(response.json()).toMatchSnapshot({
      statusCode: 400,
      error: {
        message: 'Input "quote" cannot be empty.',
      },
    });
  });

  it("should handle incorrect symbols - base", async () => {
    const response = await testAdapter.request({ base: "BTC1", quote: "USD" });
    expect(response.json()).toMatchSnapshot({
      statusCode: 502,
      errorMessage: "NoValidTradingPairs",
    });
  });

  it("should handle incorrect symbols - quote", async () => {
    const response = await testAdapter.request({ base: "BTC", quote: "USDH" });
    expect(response.json()).toMatchSnapshot({
      statusCode: 502,
      errorMessage: "NoValidTradingPairs",
    });
  });
});
