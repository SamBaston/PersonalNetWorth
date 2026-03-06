# NetWorthPro API Documentation

Welcome to the NetWorthPro API. This API allows you to manage financial assets and liabilities, and retrieve calculated summaries for net worth tracking.

## Base URL
`http://localhost:3000/api`

## Authentication
Currently, no authentication is required for this version of the API.

---

## Assets

### List Assets
`GET /assets`

Returns a list of all assets.

**Response**
```json
[
  {
    "id": "1",
    "name": "Main Savings",
    "type": "Savings",
    "value": 5000,
    "currency": "GBP"
  }
]
```

### Create Asset
`POST /assets`

Adds a new asset to the tracker.

**Parameters**
- `name` (string, required): Name of the asset.
- `type` (string, required): Category (Savings, Stock, LISA, etc.).
- `value` (number, required): Current value.
- `currency` (string, optional): Default is "GBP".
- `bonus` (number, optional): Pending bonus (e.g., for LISA).

**Example Request**
```json
{
  "name": "Vanguard ISA",
  "type": "ISA",
  "value": 10000
}
```

---

## Liabilities

### List Liabilities
`GET /liabilities`

Returns a list of all liabilities.

### Create Liability
`POST /liabilities`

Adds a new liability to the tracker.

**Parameters**
- `name` (string, required): Name of the debt.
- `type` (string, required): Category (Student Loan, Credit Card, etc.).
- `balance` (number, required): Current outstanding balance.
- `interestRate` (number, optional): Annual interest rate percentage.
- `minPayment` (number, optional): Minimum monthly payment.

---

## Summary

### Get Financial Summary
`GET /summary`

Returns aggregated financial data, including net worth and key ratios.

**Response**
```json
{
  "totalAssets": 22000,
  "totalLiabilities": 46200,
  "netWorth": -24200,
  "allocation": {
    "Cash": 5000,
    "Investments": 17000,
    "Property": 0
  },
  "liquidityRatio": 100.0,
  "debtToEquity": -1.9
}
```

## Error Codes
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (missing fields)
- `404`: Resource not found
