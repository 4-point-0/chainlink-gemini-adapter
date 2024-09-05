import { TransportDependencies } from "@chainlink/external-adapter-framework/transports";
import { ResponseCache } from "@chainlink/external-adapter-framework/cache/response";
import {
  AdapterResponse,
  sleep,
} from "@chainlink/external-adapter-framework/util";
import { SubscriptionTransport } from "@chainlink/external-adapter-framework/transports/abstract/subscription";
import { EndpointContext } from "@chainlink/external-adapter-framework/adapter";
import { BaseEndpointTypes, inputParameters } from "../endpoint/balance";
import { BigNumber, BigNumberish, ethers } from "ethers";
import { AdapterError } from "@chainlink/external-adapter-framework/validation/error";

type RequestParams = typeof inputParameters.validated;

export type BalanceTransportTypes = BaseEndpointTypes & {
  Provider: {
    RequestBody: never;
    ResponseBody: {
      data: {
        result: {
          address: string;
          balance: string;
        }[];
      };
    };
  };
};

export class BalanceTransport extends SubscriptionTransport<BalanceTransportTypes> {
  name!: string;
  responseCache!: ResponseCache<BalanceTransportTypes>;
  provider!: ethers.providers.JsonRpcProvider;

  async initialize(
    dependencies: TransportDependencies<BalanceTransportTypes>,
    adapterSettings: BalanceTransportTypes["Settings"],
    endpointName: string,
    transportName: string
  ): Promise<void> {
    await super.initialize(
      dependencies,
      adapterSettings,
      endpointName,
      transportName
    );
    this.provider = new ethers.providers.JsonRpcProvider(
      adapterSettings.ETHEREUM_RPC_URL,
      adapterSettings.CHAIN_ID
    );
  }

  async backgroundHandler(
    context: EndpointContext<BalanceTransportTypes>,
    entries: RequestParams[]
  ) {
    await Promise.all(entries.map(async (param) => this.handleRequest(param)));
    await sleep(context.adapterSettings.BACKGROUND_EXECUTE_MS);
  }

  async handleRequest(param: RequestParams) {
    let response: AdapterResponse<BalanceTransportTypes["Response"]>;

    try {
      response = await this._handleRequest(param);
    } catch (error) {
      throw new AdapterError({
        statusCode: 502,
        message: `Error fetching balances: ${(error as Error).message}`,
      });
    }
    await this.responseCache.write(this.name, [{ params: param, response }]);
  }

  async _handleRequest(
    param: RequestParams
  ): Promise<AdapterResponse<BalanceTransportTypes["Response"]>> {
    const providerDataRequestedUnixMs = Date.now();

    const balances = await Promise.all(
      param.addresses.map((addr) =>
        this.provider.getBalance(
          addr.address.toLowerCase(),
          addr.blockHeight ?? "latest"
        )
      )
    );

    const results = param.addresses.map((addr, index: number) => ({
      address: addr.address,
      balance: this._formatAmount(balances[index]._hex),
    }));
    const response: AdapterResponse<BalanceTransportTypes["Response"]> = {
      result: this._formatAmount(
        balances.reduce((sum, balance) => sum.add(balance), BigNumber.from(0))
      ),
      statusCode: 200,
      data: { result: results },
      timestamps: {
        providerDataRequestedUnixMs,
        providerDataReceivedUnixMs: Date.now(),
        providerIndicatedTimeUnixMs: undefined,
      },
    };
    return response;
  }

  getSubscriptionTtlFromConfig(
    adapterSettings: BalanceTransportTypes["Settings"]
  ): number {
    return adapterSettings.WARMUP_SUBSCRIPTION_TTL;
  }

  private _formatAmount = (amount: BigNumberish, toFixed = 2) => {
    return parseFloat(ethers.utils.formatUnits(amount, "ether"))
      .toFixed(toFixed)
      .toString();
  };
}

export const balanceTransport = new BalanceTransport();
