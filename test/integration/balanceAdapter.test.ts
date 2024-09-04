import {
  TestAdapter,
  setEnvVariables,
} from "@chainlink/external-adapter-framework/util/testing-utils";
import * as nock from "nock";
import { mockRpcEndpoint, mockBalances, mockChainId } from "./fixtures";
import { LimitedCapacitySet } from "../../src/transport/balance";

jest.mock("ethers", () => {
  const actualModule = jest.requireActual("ethers");
  return {
    ...actualModule,
    ethers: {
      ...actualModule.ethers,
      providers: {
        JsonRpcProvider: function () {
          return {
            getBalance: jest.fn().mockImplementation((address) => {
              return mockBalances[address];
            }),
            on: jest.fn().mockImplementation((event, listener) => {
              if (event === "block") {
                setTimeout(() => listener(), 0);
              }
              return {
                removeListener: jest.fn(),
              };
            }),
            removeListener: jest.fn(),
          };
        },
      },
    },
  };
});

describe("execute", () => {
  let spy: jest.SpyInstance;
  let testAdapter: TestAdapter;
  let oldEnv: NodeJS.ProcessEnv;
  const rpcUrl = mockRpcEndpoint;
  const chainId = mockChainId;

  beforeAll(async () => {
    oldEnv = JSON.parse(JSON.stringify(process.env));

    process.env.ETHEREUM_RPC_URL = rpcUrl;
    process.env.CHAIN_ID = chainId;

    const mockDate = new Date("2001-01-01T11:11:11.111Z");
    spy = jest.spyOn(Date, "now").mockReturnValue(mockDate.getTime());

    const adapter = (await import("../../src")).adapter;
    adapter.rateLimiting = undefined;
    testAdapter = await TestAdapter.startWithMockedCache(adapter, {
      testAdapter: {} as TestAdapter<never>,
    });
  });

  afterAll(async () => {
    setEnvVariables(oldEnv);
    await testAdapter.api.close();
    nock.restore();
    nock.cleanAll();
    spy.mockRestore();
  });

  describe("balance endpoint", () => {
    it("should return success for a single address", async () => {
      const data = {
        endpoint: "balance",
        addresses: [{ address: "0x103b66487784f6e3b4c5b2aca92758198554c3e1" }],
      };
      const response = await testAdapter.request(data);
      const body = JSON.parse(response.body);

      expect(body.statusCode).toBe(200);
      expect(body.data.result[0].balance).toBe("14.61");
      expect(body.result).toBe("14.61");
      expect(response.json()).toMatchSnapshot();
    }, 20000);

    it("should return success for multiple addresses", async () => {
      const data = {
        endpoint: "balance",
        addresses: [
          {
            address: "0x103b66487784f6e3b4c5b2aca92758198554c3e1",
          },
          {
            address: "0x742d35cc6634c0532925a3b844bc454e4438f44e",
            blockHeight: 20540144,
          },
        ],
      };
      const response = await testAdapter.request(data);

      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(200);
      expect(body.data.result[0].balance).toBe("14.61");
      expect(body.data.result[1].balance).toBe("0.78");
      expect(body.result).toBe("15.40");
      expect(response.json()).toMatchSnapshot();
    });

    it("should handle invalid address error responses", async () => {
      const data = {
        endpoint: "balance",
        addresses: [{ address: "0xInvalidAddress" }],
      };
      const response = await testAdapter.request(data);
      const body = JSON.parse(response.body);

      expect(body.statusCode).toBe(400);
      expect(body.error.message).toBe(
        "Invalid Ethereum address: 0xInvalidAddress"
      );
      expect(response.json()).toMatchSnapshot();
    });

    it("should handle invalid blockheight error responses", async () => {
      const data = {
        endpoint: "balance",
        addresses: [
          {
            address: "0x103B66487784F6e3b4C5B2AcA92758198554C3e1",
            blockHeight: -1,
          },
        ],
      };
      const response = await testAdapter.request(data);
      const body = JSON.parse(response.body);

      expect(body.statusCode).toBe(400);
      expect(body.error.message).toBe(
        "Invalid blockHeight for address 0x103B66487784F6e3b4C5B2AcA92758198554C3e1: -1. It must be a non-negative integer."
      );
      expect(response.json()).toMatchSnapshot();
    });

    it("should handle empty address list", async () => {
      const data = {
        endpoint: "balance",
        addresses: [],
      };
      const response = await testAdapter.request(data);
      const body = JSON.parse(response.body);
      expect(body.statusCode).toBe(400);
      expect(body.error.message).toBe(
        "Input, at 'addresses', must be a non-empty array of objects."
      );
      expect(response.json()).toMatchSnapshot();
    });

    it("should maintain a maximum of 10000 items", () => {
      const currentRequests = new LimitedCapacitySet<string>(10000);

      const addresses = Array.from({ length: 10100 }, (_, i) => ({
        address: `0x${i.toString().padStart(40, "0")}`,
      }));

      for (const addr of addresses) {
        const requestId = JSON.stringify([addr]);
        currentRequests.add(requestId);
      }

      expect(Array.from(currentRequests.values()).length).toBe(10000);

      for (let i = 0; i < 100; i++) {
        const oldestAddr = `0x${i.toString().padStart(40, "0")}`;
        const requestId = JSON.stringify([{ address: oldestAddr }]);
        expect(currentRequests.has(requestId)).toBe(false);
      }

      for (let i = 100; i < 10100; i++) {
        const newestAddr = `0x${i.toString().padStart(40, "0")}`;
        const requestId = JSON.stringify([{ address: newestAddr }]);
        expect(currentRequests.has(requestId)).toBe(true);
      }
    });
  });
});
