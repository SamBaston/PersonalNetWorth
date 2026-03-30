# Net Worth Tracker API Documentation

The Net Worth Tracker API provides endpoints for managing financial assets, liabilities, and retrieving consolidated net worth summaries.

## Base URL
`http://localhost:3000/api`

## Authentication
Currently, the API does not require authentication (Development Version).

---

## Assets

### List Assets
`GET /assets`

Returns a list of all tracked assets.

**Response**
```json
[
  {
    "id": "1",
    "name": "Barclays Current",
    "type": "Cash",
    "subtype": "Current",
    "value": 2500,
    "currency": "GBP"
  }
]
```

### Add Asset
`POST /assets`

Adds a new asset to the tracker.

**Parameters**
| Name | Type | Description |
| :--- | :--- | :--- |
| `name` | string | The name of the asset. |
| `type` | string | One of: `Cash`, `Investment`, `Property`. |
| `subtype` | string | One of: `Current`, `Savings`, `ISA`, `LISA`, `Stock`. |
| `value` | number | The current balance or value. |
| `currency` | string | The currency code (e.g., `GBP`). |

**Example Request**
```json
{
  "name": "Vanguard S&P 500",
  "type": "Investment",
  "subtype": "Stock",
  "value": 5000,
  "currency": "GBP"
}
```

---

## Liabilities

### List Liabilities
`GET /liabilities`

Returns a list of all tracked debts and liabilities.

**Response**
```json
[
  {
    "id": "1",
    "name": "Student Loan",
    "type": "Student Loan",
    "balance": 45000,
    "interestRate": 7.3,
    "minPayment": 150
  }
]
```

### Add Liability
`POST /liabilities`

Adds a new liability to the tracker.

**Parameters**
| Name | Type | Description |
| :--- | :--- | :--- |
| `name` | string | The name of the debt. |
| `type` | string | One of: `Loan`, `Credit Card`, `Mortgage`, `Student Loan`. |
| `balance` | number | The current outstanding balance. |
| `interestRate` | number | Annual percentage rate (APR). |
| `minPayment` | number | Minimum monthly payment. |

---

## Summary & Analytics

### Get Summary
`GET /summary`

Returns consolidated financial data, ratios, and projections.

**Response**
```json
{
  "totalAssets": 19500,
  "totalLiabilities": 46200,
  "netWorth": -26700,
  "allocation": {
    "Cash": 2500,
    "Investments": 17000,
    "Property": 0
  },
  "ratios": {
    "debtToEquity": "2.37",
    "liquidityRatio": "13.16"
  },
  "projections": [
    { "years": 1, "projectedNetWorth": -28569 },
    { "years": 5, "projectedNetWorth": -37448 }
  ],
  "history": [
    { "date": "2025-01-01", "netWorth": -25000 }
  ]
}
```
