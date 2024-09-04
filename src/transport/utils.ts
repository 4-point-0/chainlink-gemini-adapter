import { AdapterResponse } from "@chainlink/external-adapter-framework/util";
import { BigNumber, BigNumberish, ethers } from "ethers";
import { BalanceTransportTypes } from "./balance";

export const formatAmount = (amount: BigNumberish, toFixed = 2) => {
  return parseFloat(ethers.utils.formatUnits(amount, "ether"))
    .toFixed(toFixed)
    .toString();
};

export const makeResponse = (
  balances: BigNumber[],
  results: {
    address: any;
    balance: string;
  }[]
) => {
  const response: AdapterResponse<BalanceTransportTypes["Response"]> = {
    result: formatAmount(
      balances.reduce((sum, balance) => sum.add(balance), BigNumber.from(0))
    ),
    statusCode: 200,
    data: { result: results },
    timestamps: {
      providerDataRequestedUnixMs: Date.now(),
      providerDataReceivedUnixMs: Date.now(),
      providerIndicatedTimeUnixMs: undefined,
    },
  };
  return response;
};

export const getBalances = async (
  addresses: ({
    address: string;
  } & {
    blockHeight?: number | undefined;
  })[],
  provider: ethers.providers.JsonRpcProvider
) => {
  const balances = await Promise.all(
    addresses.map((addr: any) =>
      provider.getBalance(
        addr.address.toLowerCase(),
        addr.blockHeight ?? "latest"
      )
    )
  );

  const results = addresses.map((addr: any, index: number) => ({
    address: addr.address,
    balance: formatAmount(balances[index]._hex),
  }));

  return { balances, results };
};
