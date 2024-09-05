# WEI_ADAPTER

![0.0.0](https://img.shields.io/github/package-json/v/smartcontractkit/external-adapters-js?filename=packages/sources/wei-adapter/package.json) ![v3](https://img.shields.io/badge/framework%20version-v3-blueviolet)

This document was generated automatically. Please see [README Generator](../../scripts#readme-generator) for more info.

## Environment Variables

| Required? |         Name          |                                        Description                                        |  Type  | Options | Default |
| :-------: | :-------------------: | :---------------------------------------------------------------------------------------: | :----: | :-----: | :-----: |
|    ✅     |   ETHEREUM_RPC_URL    |                             An RPC endpoint for Data Provider                             | string |         |         |
|    ✅     |       CHAIN_ID        |                     Chain ID for different chains that ethers accepts                     | number |         |         |
|    ✅     |    WS_API_ENDPOINT    |                               WS endpoint for Data Provider                               | string |         |         |
|    ✅     | BACKGROUND_EXECUTE_MS | The amount of time the background execute should sleep before performing the next request | number |         |         |

---

## Data Provider Rate Limits

There are no rate limits for this adapter.

---

## Input Parameters

| Required? |   Name   |     Description     |  Type  |                        Options                         | Default |
| :-------: | :------: | :-----------------: | :----: | :----------------------------------------------------: | :-----: |
|           | endpoint | The endpoint to use | string | [balance](#balance-endpoint), [price](#price-endpoint) | `price` |

## Balance Endpoint

`balance` is the only supported name for this endpoint.

### Input Params

| Required? |         Name          | Aliases |          Description           |   Type   | Options | Default | Depends On | Not Valid With |
| :-------: | :-------------------: | :-----: | :----------------------------: | :------: | :-----: | :-----: | :--------: | :------------: |
|    ✅     |       addresses       |         |        array of object         | object[] |         |         |            |                |
|    ✅     |   addresses.address   |         |          eth address           |  string  |         |         |            |                |
|           | addresses.blockHeight |         | block height. default - latest |  number  |         |         |            |                |

### Example

Request:

```json
{
  "data": {
    "endpoint": "balance",
    "addresses": [
      {
        "address": "0x103B66487784F6e3b4C5B2AcA92758198554C3e1"
      },
      {
        "address": "0x0AA2ca7B13855e115EBdCDA89E4f19EC2c1181E5",
        "blockHeight": 100002000
      }
    ]
  }
}
```

---

## Price Endpoint

`price` is the only supported name for this endpoint.

### Input Params

| Required? | Name  |              Aliases               |                  Description                   |  Type  | Options | Default | Depends On | Not Valid With |
| :-------: | :---: | :--------------------------------: | :--------------------------------------------: | :----: | :-----: | :-----: | :--------: | :------------: |
|    ✅     | base  | `coin`, `from`, `market`, `symbol` | The symbol of symbols of the currency to query | string |         |         |            |                |
|    ✅     | quote |          `convert`, `to`           |    The symbol of the currency to convert to    | string |         |         |            |                |

### Example

Request:

```json
{
  "data": {
    "endpoint": "price",
    "base": "BTC",
    "quote": "USD"
  }
}
```

---

MIT License
