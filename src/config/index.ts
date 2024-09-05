import { AdapterConfig } from "@chainlink/external-adapter-framework/config";
import dotenv from "dotenv"; // remove before deploying to https://github.com/smartcontractkit/external-adapters-js

const { parsed } = dotenv.config(); // remove before deploying to https://github.com/smartcontractkit/external-adapters-js

export const config = new AdapterConfig({
  ETHEREUM_RPC_URL: {
    description: "An RPC endpoint for Data Provider",
    required: true,
    type: "string",
    default: parsed?.ETHEREUM_RPC_URL, // remove before deploying to https://github.com/smartcontractkit/external-adapters-js
    sensitive: true,
  },
  CHAIN_ID: {
    description: "Chain ID for different chains that ethers accepts",
    required: true,
    type: "number",
    default: parseInt(parsed?.CHAIN_ID ?? "1"), // remove before deploying to https://github.com/smartcontractkit/external-adapters-js
  },
  WS_API_ENDPOINT: {
    description: "WS endpoint for Data Provider",
    required: true,
    type: "string",
    default: parsed?.WS_API_ENDPOINT, // remove before deploying to https://github.com/smartcontractkit/external-adapters-js
  },
  BACKGROUND_EXECUTE_MS: {
    description:
      "The amount of time the background execute should sleep before performing the next request",
    required: true,
    type: "number",
    default: parseInt(parsed?.BACKGROUND_EXECUTE_MS ?? "1000"), // remove before deploying to https://github.com/smartcontractkit/external-adapters-js
  },
});
