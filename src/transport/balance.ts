import {
  Transport,
  TransportDependencies,
} from "@chainlink/external-adapter-framework/transports";
import { BaseEndpointTypes, inputParameters } from "../endpoint/balance";
import { ethers } from "ethers";
import { getBalances, makeResponse } from "./utils";
import {
  AdapterRequest,
  AdapterResponse,
} from "@chainlink/external-adapter-framework/util";
import { ResponseCache } from "@chainlink/external-adapter-framework/cache/response";
import { AdapterError } from "@chainlink/external-adapter-framework/validation/error";
import { config } from "../config";
import { EndpointContext } from "@chainlink/external-adapter-framework/adapter";

interface Result {
  address: string;
  balance: string;
}

export interface ResponseSchema {
  data: {
    result: Result[];
  };
}

export type BalanceTransportTypes = BaseEndpointTypes & {
  Provider: {
    RequestBody: never;
    ResponseBody: ResponseSchema;
  };
};

interface AddressInfo {
  address: string;
  blockHeight?: number;
}

export class LimitedCapacitySet<T> {
  private items: T[] = [];
  private itemSet: Set<T> = new Set();
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  add(item: T): void {
    if (!this.itemSet.has(item)) {
      if (this.items.length >= this.capacity) {
        const oldestItem = this.items.shift();
        if (oldestItem) this.itemSet.delete(oldestItem);
      }
      this.items.push(item);
      this.itemSet.add(item);
    }
  }

  has(item: T): boolean {
    return this.itemSet.has(item);
  }

  delete(item: T): void {
    const index = this.items.indexOf(item);
    if (index > -1) {
      this.items.splice(index, 1);
      this.itemSet.delete(item);
    }
  }

  values(): IterableIterator<T> {
    return this.itemSet.values();
  }
}

export class BalanceTransport implements Transport<BalanceTransportTypes> {
  name!: string;
  responseCache!: ResponseCache<BalanceTransportTypes>;
  provider!: ethers.providers.JsonRpcProvider;
  currentRequests = new LimitedCapacitySet<string>(10000); // capacity of this.responseCache.cache is 10000
  listener: ethers.providers.Listener | null = null;

  async initialize(
    dependencies: TransportDependencies<BalanceTransportTypes>,
    settings: typeof config.settings,
    _endpointName: string,
    transportName: string
  ): Promise<void> {
    this.responseCache = dependencies.responseCache;
    this.name = transportName;
    this.provider = new ethers.providers.JsonRpcProvider(
      settings.ETHEREUM_RPC_URL,
      settings.CHAIN_ID
    );
  }

  async registerRequest(
    req: AdapterRequest<typeof inputParameters.validated>,
    _adapterSettings: BalanceTransportTypes["Settings"]
  ): Promise<void> {
    const addresses: typeof inputParameters.validated.addresses =
      req.requestContext.data.addresses;
    const requestId = this.getRequestId(addresses);
    this.currentRequests.add(requestId);
  }

  private getRequestId(addresses: AddressInfo[]): string {
    return JSON.stringify(addresses);
  }

  async backgroundExecute(
    _context: EndpointContext<BalanceTransportTypes>
  ): Promise<void> {
    if (this.listener) return;

    this.listener = async () => {
      for (const requestId of this.currentRequests.values()) {
        const addresses: typeof inputParameters.validated.addresses =
          JSON.parse(requestId);
        try {
          const { balances, results } = await getBalances(
            addresses,
            this.provider
          );

          const response = makeResponse(balances, results);

          await this.responseCache.write(this.name, [
            {
              params: {
                addresses: addresses.map((address: any) => ({
                  address: address.address,
                  blockHeight: address.blockHeight,
                })),
              },
              response,
            },
          ]);
        } catch (e: any) {
          console.error(
            `Error updating balances for request ${requestId}:`,
            e.message
          );
        }
      }
    };

    this.provider.on("block", this.listener);
  }

  async foregroundExecute(
    req: AdapterRequest<typeof inputParameters.validated>
  ): Promise<AdapterResponse<BalanceTransportTypes["Response"]>> {
    const cachedResponse = await this.responseCache.cache.get(
      req.requestContext.cacheKey
    );

    if (cachedResponse) {
      return cachedResponse;
    }

    const addresses: typeof inputParameters.validated.addresses =
      req.requestContext.data.addresses;

    try {
      const { balances, results } = await getBalances(addresses, this.provider);
      const response = makeResponse(balances, results);
      await this.responseCache.write(this.name, [
        {
          params: {
            addresses: addresses.map((address: any) => ({
              address: address.address,
              blockHeight: address.blockHeight,
            })),
          },
          response,
        },
      ]);

      return response;
    } catch (error) {
      throw new AdapterError({
        statusCode: 502,
        message: `Error fetching balances: ${(error as Error).message}`,
      });
    }
  }
}

export const balanceTransport = new BalanceTransport();
