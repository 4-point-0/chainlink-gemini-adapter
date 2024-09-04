import { WebsocketReverseMappingTransport } from "@chainlink/external-adapter-framework/transports";
import { BaseEndpointTypes, inputParameters } from "../endpoint/price";
import { makeLogger } from "@chainlink/external-adapter-framework/util";

const logger = makeLogger("Price Websocket Endpoint");

export interface WSResponse {
  changes: [[string, string, string]];
  type: string;
  symbol: string;
  result: string;
  reason: string;
}

export type WsTransportTypes = BaseEndpointTypes & {
  Provider: {
    WsMessage: WSResponse;
  };
};

let latestParams: typeof inputParameters.validated = { base: "", quote: "" };
export const wsTransport: WebsocketReverseMappingTransport<
  WsTransportTypes,
  string
> = new WebsocketReverseMappingTransport<WsTransportTypes, string>({
  url: (context) => context.adapterSettings.WS_API_ENDPOINT,
  handlers: {
    message(message) {
      if (message.result === "error") {
        logger.error(`Data provider Error: ${JSON.stringify(message)}`);
        return [
          {
            params: latestParams,
            response: {
              statusCode: 502,
              errorMessage: message.reason,
            },
          },
        ];
      }

      const changesType = message.changes[0][0];
      if (changesType !== "sell") {
        return;
      }

      const price = parseFloat(message.changes[0][1]);
      const params: ({ base: string; quote: string } & {}) | undefined =
        wsTransport.getReverseMapping(message.symbol);

      if (!params) {
        logger.error(
          "The Data Provider didn't return expected Gemini pair symbol"
        );
        return;
      }

      return [
        {
          params: params,
          response: {
            statusCode: 200,
            result: price,
            data: {
              result: price,
            },
            timestamps: {
              providerIndicatedTimeUnixMs: Date.now(), // Gemini doesn't provide a timestamp in the message
            },
          },
        },
      ];
    },
  },
  builders: {
    subscribeMessage: (params) => {
      latestParams = params;
      const pair = `${params.base}${params.quote}`.toUpperCase();
      wsTransport.setReverseMapping(pair, params);
      return JSON.stringify({
        type: "subscribe",
        subscriptions: [
          {
            name: "l2",
            symbols: [pair],
          },
        ],
      });
    },
    unsubscribeMessage: (params) => {
      return JSON.stringify({
        type: "unsubscribe",
        subscriptions: [
          {
            name: "l2",
            symbols: [`${params.base}${params.quote}`.toUpperCase()],
          },
        ],
      });
    },
  },
});
