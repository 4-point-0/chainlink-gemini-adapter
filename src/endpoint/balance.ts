import { AdapterEndpoint } from "@chainlink/external-adapter-framework/adapter";
import { InputParameters } from "@chainlink/external-adapter-framework/validation";
import { config } from "../config";
import { balanceTransport } from "../transport/balance";
import { AdapterRequest } from "@chainlink/external-adapter-framework/util";
import { AdapterInputError } from "@chainlink/external-adapter-framework/validation/error";
import { ethers } from "ethers";

export const inputParameters = new InputParameters(
  {
    addresses: {
      required: true,
      description: "array of object",
      array: true,
      type: {
        address: {
          required: true,
          description: "eth address",
          type: "string",
        },
        blockHeight: {
          required: false,
          description: "block height. default - latest",
          type: "number",
        },
      },
    },
  },
  [
    {
      addresses: [
        { address: "0x103B66487784F6e3b4C5B2AcA92758198554C3e1" },
        {
          address: "0x0AA2ca7B13855e115EBdCDA89E4f19EC2c1181E5",
          blockHeight: 100002000,
        },
      ],
    },
  ]
);

export type BaseEndpointTypes = {
  Parameters: typeof inputParameters.definition;
  Response: {
    Result: string;
    Data: {
      result: { address: string; balance: string }[];
    };
  };
  Settings: typeof config.settings;
};

export const endpoint = new AdapterEndpoint({
  name: "balance",
  aliases: [],
  transport: balanceTransport,
  inputParameters,
  customInputValidation: (
    req: AdapterRequest<typeof inputParameters.validated>
  ): AdapterInputError | undefined => {
    const addresses = req.requestContext.data.addresses;
    if (req.requestContext.data.addresses.length === 0) {
      throw new AdapterInputError({
        statusCode: 400,
        message: `Input, at 'addresses', must be a non-empty array of objects.`,
      });
    }
    for (const address of addresses) {
      if (!ethers.utils.isAddress(address.address)) {
        throw new AdapterInputError({
          statusCode: 400,
          message: `Invalid Ethereum address: ${address.address}`,
        });
      }
      if (
        address.blockHeight !== undefined &&
        (address.blockHeight < 0 ||
          address.blockHeight > Number.MAX_SAFE_INTEGER)
      ) {
        throw new AdapterInputError({
          statusCode: 400,
          message: `Invalid blockHeight for address ${address.address}: ${address.blockHeight}. It must be a non-negative integer.`,
        });
      }
    }
    return;
  },
});
