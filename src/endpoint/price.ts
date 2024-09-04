import { AdapterEndpoint } from "@chainlink/external-adapter-framework/adapter";
import { InputParameters } from "@chainlink/external-adapter-framework/validation";
import { config } from "../config";
import { wsTransport } from "../transport/price";
import { AdapterRequest } from "@chainlink/external-adapter-framework/util";
import { AdapterInputError } from "@chainlink/external-adapter-framework/validation/error";

export const inputParameters = new InputParameters(
  {
    base: {
      aliases: ["from", "coin", "symbol", "market"],
      required: true,
      type: "string",
      description: "The symbol of symbols of the currency to query",
    },
    quote: {
      aliases: ["to", "convert"],
      required: true,
      type: "string",
      description: "The symbol of the currency to convert to",
    },
  },
  [
    {
      base: "BTC",
      quote: "USD",
    },
  ]
);

export type BaseEndpointTypes = {
  Parameters: typeof inputParameters.definition;
  Response: {
    Result: number;
    Data: {
      result: number;
    };
  };
  Settings: typeof config.settings;
};

export const endpoint = new AdapterEndpoint({
  name: "price",
  aliases: [],
  transport: wsTransport,
  inputParameters,
  customInputValidation: (
    req: AdapterRequest<typeof inputParameters.validated>
  ): AdapterInputError | undefined => {
    const { base, quote } = req.requestContext.data;
    if (!base) {
      throw new AdapterInputError({
        statusCode: 400,
        message: 'Input "base" cannot be empty.',
      });
    }
    if (!quote) {
      throw new AdapterInputError({
        statusCode: 400,
        message: 'Input "quote" cannot be empty.',
      });
    }
    return undefined;
  },
});
