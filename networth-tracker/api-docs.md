# NetWorth Tracker API Documentation

> Version 1.0.0 — COMP1101 Summative Assessment 1  
> Base URL: `http://localhost:3000/api`  
> All requests and responses use `Content-Type: application/json`.

---

## Overview

The NetWorth Tracker REST API exposes two primary entities — **accounts** (assets) and **debts** (liabilities) — plus a read-only **summary** endpoint that aggregates both into a net worth snapshot with projections.

All responses follow the envelope format:

```json
{
  "success": true | false,
  "data":    { ... } | [ ... ],
  "count":   <integer>       // present on list responses
}
```

Errors include a descriptive message or array of validation messages:

```json
{
  "success": false,
  "error": "Account not found"
}
```

---

## Accounts

An **account** represents a financial asset (e.g. bank account, ISA, LISA, stock portfolio, property).

### Account Object

| Field             | Type     | Description                                                   |
|-------------------|----------|---------------------------------------------------------------|
| `id`              | string   | UUID — unique identifier                                      |
| `name`            | string   | Human-readable account name                                   |
| `type`            | string   | One of: `current`, `savings`, `isa`, `lisa`, `stocks`, `property` |
| `balance`         | number   | Current balance in the specified currency                     |
| `currency`        | string   | ISO 4217 currency code (default: `GBP`)                       |
| `institution`     | string   | Financial institution name (optional)                         |
| `notes`           | string   | Free-text notes (optional)                                    |
| `lisaBonus`       | number   | LISA accounts only — government bonus amount (25% of contributions) |
| `lisaBonusStatus` | string   | LISA accounts only — `pending` or `received`                  |
| `createdAt`       | string   | ISO 8601 timestamp                                            |
| `updatedAt`       | string   | ISO 8601 timestamp                                            |

---

### `GET /api/accounts`

Returns all accounts. Optionally filter by type.

**Query Parameters**

| Parameter | Type   | Required | Description                              |
|-----------|--------|----------|------------------------------------------|
| `type`    | string | No       | Filter by account type (e.g. `?type=isa`) |

**Example Request**
```
GET /api/accounts?type=lisa
```

**Example Response `200 OK`**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "name": "Moneybox LISA",
      "type": "lisa",
      "balance": 5000.00,
      "currency": "GBP",
      "institution": "Moneybox",
      "notes": "Saving for first home",
      "lisaBonus": 1250.00,
      "lisaBonusStatus": "received",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/accounts/:id`

Returns a single account by its UUID.

**Path Parameters**

| Parameter | Type   | Required | Description      |
|-----------|--------|----------|------------------|
| `id`      | string | Yes      | Account UUID     |

**Example Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "name": "Marcus Savings Account",
    "type": "savings",
    "balance": 12500.00,
    "currency": "GBP",
    ...
  }
}
```

**Error `404 Not Found`**
```json
{ "success": false, "error": "Account not found" }
```

---

### `POST /api/accounts`

Creates a new account.

**Request Body**

| Field             | Type   | Required | Description                                                |
|-------------------|--------|----------|------------------------------------------------------------|
| `name`            | string | **Yes**  | Account name                                               |
| `type`            | string | **Yes**  | Account type (see valid values above)                      |
| `balance`         | number | **Yes**  | Current balance                                            |
| `currency`        | string | No       | Default: `GBP`                                             |
| `institution`     | string | No       | Bank or provider name                                      |
| `notes`           | string | No       | Free-text                                                  |
| `lisaBonus`       | number | No       | LISA only — if omitted, calculated as 25% of balance       |
| `lisaBonusStatus` | string | No       | LISA only — `pending` (default) or `received`              |

**Example Request**
```json
{
  "name": "Vanguard Stocks & Shares ISA",
  "type": "isa",
  "balance": 8750.00,
  "institution": "Vanguard",
  "notes": "VWRL ETF"
}
```

**Example Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "f3e2d1c0-...",
    "name": "Vanguard Stocks & Shares ISA",
    "type": "isa",
    "balance": 8750.00,
    "currency": "GBP",
    "institution": "Vanguard",
    "notes": "VWRL ETF",
    "lisaBonus": null,
    "lisaBonusStatus": null,
    "createdAt": "2024-03-15T10:30:00.000Z",
    "updatedAt": "2024-03-15T10:30:00.000Z"
  }
}
```

**Error `400 Bad Request`**
```json
{
  "success": false,
  "errors": ["name is required", "balance must be a valid number"]
}
```

---

### `DELETE /api/accounts/:id`

Permanently removes an account.

**Example Response `200 OK`**
```json
{ "success": true, "message": "Account deleted" }
```

**Error `404 Not Found`**
```json
{ "success": false, "error": "Account not found" }
```

---

## Debts

A **debt** represents a financial liability (student loan, credit card, mortgage, personal loan).

### Debt Object

| Field                | Type    | Description                                                         |
|----------------------|---------|---------------------------------------------------------------------|
| `id`                 | string  | UUID                                                                |
| `name`               | string  | Debt label                                                          |
| `type`               | string  | One of: `student_loan`, `credit_card`, `mortgage`, `personal_loan` |
| `balance`            | number  | Outstanding balance                                                 |
| `interestRate`       | number  | Annual interest rate as a percentage (e.g. `7.3` = 7.3%)           |
| `minimumPayment`     | number  | Minimum monthly payment in GBP                                      |
| `currency`           | string  | ISO 4217 code (default: `GBP`)                                      |
| `plan`               | string  | Student loans only — `plan1`, `plan2`, or `plan5`                   |
| `repaymentThreshold` | number  | Student loans — income threshold above which repayments begin       |
| `upperThreshold`     | number  | Student loans — upper income threshold (Plan 2 max rate)            |
| `incomeContingent`   | boolean | Whether repayments are tied to income                               |
| `notes`              | string  | Free-text                                                           |
| `createdAt`          | string  | ISO 8601 timestamp                                                  |
| `monthlyInterest`    | number  | **Computed** — `(balance × interestRate%) ÷ 12`                     |
| `payoffMonths`       | number  | **Computed** — months to clear at minimum payment (null if N/A)     |

---

### `GET /api/debts`

Returns all debts, enriched with computed fields.

**Query Parameters**

| Parameter | Type   | Required | Description              |
|-----------|--------|----------|--------------------------|
| `type`    | string | No       | Filter by debt type      |

**Example Response `200 OK`**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "d1e2f3a4-...",
      "name": "Student Loan Plan 2",
      "type": "student_loan",
      "balance": 38500.00,
      "interestRate": 7.3,
      "minimumPayment": 0,
      "currency": "GBP",
      "plan": "plan2",
      "repaymentThreshold": 27295,
      "incomeContingent": true,
      "monthlyInterest": 234.46,
      "payoffMonths": null
    }
  ]
}
```

---

### `GET /api/debts/:id`

Returns a single debt by UUID, including computed fields.

---

### `POST /api/debts`

Creates a new debt.

**Request Body**

| Field                | Type    | Required | Description                                                    |
|----------------------|---------|----------|----------------------------------------------------------------|
| `name`               | string  | **Yes**  | Debt name                                                      |
| `type`               | string  | **Yes**  | Debt type (see valid values above)                             |
| `balance`            | number  | **Yes**  | Outstanding balance                                            |
| `interestRate`       | number  | No       | Annual % rate (default: `0`)                                   |
| `minimumPayment`     | number  | No       | Monthly payment (default: `0`)                                 |
| `currency`           | string  | No       | Default: `GBP`                                                 |
| `plan`               | string  | No       | Student loan plan                                              |
| `repaymentThreshold` | number  | No       | Income repayment threshold                                     |
| `upperThreshold`     | number  | No       | Upper income threshold                                         |
| `incomeContingent`   | boolean | No       | Defaults to `false`                                            |
| `notes`              | string  | No       | Free-text                                                      |

**Example Request — Credit Card**
```json
{
  "name": "Monzo Flex",
  "type": "credit_card",
  "balance": 650.00,
  "interestRate": 24.9,
  "minimumPayment": 25
}
```

**Example Request — Student Loan Plan 2**
```json
{
  "name": "Student Loan Plan 2",
  "type": "student_loan",
  "balance": 38500,
  "interestRate": 7.3,
  "plan": "plan2",
  "repaymentThreshold": 27295,
  "upperThreshold": 49130,
  "incomeContingent": true,
  "notes": "9% of income above threshold. Written off after 30 years."
}
```

**Response `201 Created`** — returns the created debt object.

---

### `DELETE /api/debts/:id`

Permanently removes a debt entry.

---

## Summary

### `GET /api/summary`

Returns an aggregated financial snapshot including net worth, asset allocation, financial ratios, and forward projections.

**No parameters required.**

**Example Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "totalAssets": 30500.00,
    "totalDebts": 39150.00,
    "netWorth": -8650.00,
    "assetAllocation": {
      "cash": 16750.00,
      "investments": 13750.00,
      "property": 0.00
    },
    "ratios": {
      "debtToEquity": 1.2836,
      "liquidityRatio": 670.00
    },
    "totalMonthlyInterest": 247.97,
    "accountCount": 4,
    "debtCount": 2,
    "projections": [
      {
        "rate": 4,
        "scenarios": [
          { "years": 1,  "projectedNetWorth": -8996.00, "projectedInvestments": 14300.00 },
          { "years": 3,  "projectedNetWorth": -9726.26, "projectedInvestments": 15473.51 },
          { "years": 5,  "projectedNetWorth": -10529.16,"projectedInvestments": 16741.66 },
          { "years": 10, "projectedNetWorth": -12801.78,"projectedInvestments": 20401.13 }
        ]
      },
      { "rate": 7, "scenarios": [ ... ] },
      { "rate": 10,"scenarios": [ ... ] }
    ]
  }
}
```

### Response Fields

| Field                          | Description                                                              |
|-------------------------------|--------------------------------------------------------------------------|
| `totalAssets`                 | Sum of all account balances                                              |
| `totalDebts`                  | Sum of all debt balances                                                 |
| `netWorth`                    | `totalAssets − totalDebts`                                               |
| `assetAllocation.cash`        | Sum of `current` + `savings` accounts                                    |
| `assetAllocation.investments` | Sum of `isa` + `lisa` + `stocks` accounts                                |
| `assetAllocation.property`    | Sum of `property` accounts                                               |
| `ratios.debtToEquity`         | `totalDebts / totalAssets` — measures leverage                           |
| `ratios.liquidityRatio`       | `cashTotal / monthlyDebtObligations` — months of obligations in cash     |
| `totalMonthlyInterest`        | Total interest accruing across all debts per month                       |
| `projections[].rate`          | Annual return rate as a percentage (4, 7, or 10)                         |
| `projections[].scenarios`     | Array of `{ years, projectedNetWorth, projectedInvestments }` per horizon |

---

## Error Reference

| HTTP Status | Meaning                                      |
|-------------|----------------------------------------------|
| `200`       | Success                                      |
| `201`       | Resource created successfully                |
| `400`       | Validation error — missing or invalid fields |
| `404`       | Resource not found                           |
| `500`       | Internal server error                        |
