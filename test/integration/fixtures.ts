import { MockWebsocketServer } from "@chainlink/external-adapter-framework/util/testing-utils";
import { WSResponse } from "../../src/transport/price";

export const mockRpcEndpoint =
  process.env.ETHEREUM_RPC_URL || "https://mock-rpc-endpoint.com";

export const mockChainId = process.env.CHAIN_ID || "1";

export const mockWSEndpoint =
  process.env.WS_API_ENDPOINT || "wss://mock.api.gemini.com/v2/marketdata";

export const mockBackgroundExecuteMs =
  process.env.BACKGROUND_EXECUTE_MS || "1000";

export const mockBalances: Record<string, Record<string, any>> = {
  "0x103b66487784f6e3b4c5b2aca92758198554c3e1": {
    _hex: "0xcad022c33a96152a",
    _isBigNumber: true,
  },
  "0x742d35cc6634c0532925a3b844bc454e4438f44e": {
    _hex: "0xad8655682813b7b",
    _isBigNumber: true,
  },
};

export const mockPriceResponse: WSResponse = {
  changes: [["sell", "1272.12", "100"]],
  type: "l2_updates",
  symbol: "ETHUSD",
  result: "",
  reason: "",
};

export const mockErrorResponse: WSResponse = {
  changes: [["", "", ""]],
  type: "",
  symbol: "",
  result: "error",
  reason: "Invalid request",
};

export const mockPriceWebSocketServer = (): MockWebsocketServer => {
  const mockWsServer = new MockWebsocketServer(mockWSEndpoint, { mock: false });
  mockWsServer.on("connection", (socket) => {
    socket.on("message", (message) => {
      const m = JSON.parse(message as string);
      if (
        m.subscriptions[0].symbols[0] === "BTC1USD" ||
        m.subscriptions[0].symbols[0] === "BTCUSDH"
      ) {
        return socket.send(
          JSON.stringify({ result: "error", reason: "NoValidTradingPairs" })
        );
      }
      return socket.send(JSON.stringify(mockPriceResponse));
    });
  });
  return mockWsServer;
};
