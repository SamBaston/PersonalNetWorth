# Personal Net Worth Tracker API Documentation

## Overview

This API provides endpoints for managing personal finances, including asset tracking, debt management, and financial projections. All endpoints return JSON responses and follow RESTful conventions.

**Base URL:** `http://localhost:3000/api`

**Content-Type:** `application/json`

---

## Assets API

### List Assets

Returns a list of all assets with optional filtering.

```http
GET /api/assets
```

**Query Parameters:**

| Parameter | Type   | Description                                    |
|-----------|--------|------------------------------------------------|
| type      | string | Filter by asset type (optional)                |
| category  | string | Filter by category: CASH, INVESTMENT, PROPERTY |

**Asset Types:**
- `BANK_CURRENT` - Current/Checking accounts
- `BANK_SAVINGS` - Savings accounts
- `ISA` - Individual Savings Accounts
- `LISA` - Lifetime ISAs
- `STOCK` - Individual stocks/shares
- `PROPERTY` - Real estate
- `OTHER` - Other assets

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx123abc",
      "name": "Monzo Current Account",
      "type": "BANK_CURRENT",
      "category": "CASH",
      "balance": 2450.75,
      "currency": "GBP",
      "ticker": null,
      "shares": null,
      "governmentBonus": null
    }
  ],
  "total": 1
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### Get Asset Details

Returns details of a specific asset including history.

```http
GET /api/assets/{id}
```

**Path Parameters:**

| Parameter | Type   | Description        |
|-----------|--------|--------------------|
| id        | string | The asset ID       |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "clx123abc",
    "name": "Vanguard Stocks & Shares ISA",
    "type": "ISA",
    "category": "INVESTMENT",
    "balance": 28500.00,
    "currency": "GBP",
    "isTaxAdvantaged": true,
    "governmentBonus": null,
    "ticker": null,
    "shares": null,
    "purchasePrice": null,
    "annualReturnRate": 7,
    "notes": null,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "history": [
      {
        "id": "clx456def",
        "assetId": "clx123abc",
        "balance": 27000.00,
        "recordedAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Asset not found
- `500` - Server error

---

### Create Asset

Creates a new asset.

```http
POST /api/assets
```

**Request Body:**

```json
{
  "name": "Moneybox Lifetime ISA",
  "type": "LISA",
  "category": "INVESTMENT",
  "balance": 12000.00,
  "currency": "GBP",
  "isTaxAdvantaged": true,
  "governmentBonus": 3000.00,
  "annualReturnRate": 5,
  "notes": "For first home purchase"
}
```

**Required Fields:**
- `name` (string) - Account name
- `type` (string) - Asset type
- `category` (string) - CASH, INVESTMENT, or PROPERTY
- `balance` (number) - Current balance

**Optional Fields:**
- `currency` (string) - Default: "GBP"
- `isTaxAdvantaged` (boolean) - Default: false
- `governmentBonus` (number) - For LISAs
- `ticker` (string) - For stocks
- `shares` (number) - For stocks
- `purchasePrice` (number) - For stocks
- `annualReturnRate` (number) - Expected annual return %
- `notes` (string)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "clx789ghi",
    "name": "Moneybox Lifetime ISA",
    "type": "LISA",
    "category": "INVESTMENT",
    "balance": 12000.00,
    "currency": "GBP",
    "isTaxAdvantaged": true,
    "governmentBonus": 3000.00,
    "annualReturnRate": 5,
    "notes": "For first home purchase",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "message": "Asset created successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (missing required fields)
- `500` - Server error

---

### Update Asset

Updates an existing asset.

```http
PUT /api/assets/{id}
```

**Path Parameters:**

| Parameter | Type   | Description        |
|-----------|--------|--------------------|
| id        | string | The asset ID       |

**Request Body:**

```json
{
  "balance": 12500.00,
  "annualReturnRate": 6
}
```

Include only the fields you want to update.

**Response:**

```json
{
  "success": true,
  "data": { /* updated asset */ },
  "message": "Asset updated successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `404` - Asset not found
- `500` - Server error

---

### Delete Asset

Deletes an asset and its history.

```http
DELETE /api/assets/{id}
```

**Path Parameters:**

| Parameter | Type   | Description        |
|-----------|--------|--------------------|
| id        | string | The asset ID       |

**Response:**

```json
{
  "success": true,
  "message": "Asset deleted successfully"
}
```

**Status Codes:**
- `200` - Success
- `404` - Asset not found
- `500` - Server error

---

## Debts API

### List Debts

Returns a list of all debts with optional filtering.

```http
GET /api/debts
```

**Query Parameters:**

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| type      | string | Filter by debt type (optional) |

**Debt Types:**
- `STUDENT_LOAN` - Student loans
- `CREDIT_CARD` - Credit card balances
- `PERSONAL_LOAN` - Personal loans
- `MORTGAGE` - Mortgage loans
- `OTHER` - Other debts

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx123abc",
      "name": "Student Finance England",
      "type": "STUDENT_LOAN",
      "balance": 42000.00,
      "originalAmount": 45000.00,
      "interestRate": 7.3,
      "minimumPayment": 0,
      "monthlyPayment": 250.00,
      "studentLoanPlan": "PLAN_2",
      "propertyValue": null
    }
  ],
  "total": 1
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### Get Debt Details

Returns details of a specific debt including history.

```http
GET /api/debts/{id}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "clx123abc",
    "name": "Nationwide Mortgage",
    "type": "MORTGAGE",
    "balance": 265000.00,
    "originalAmount": 280000.00,
    "interestRate": 5.2,
    "minimumPayment": 1450.00,
    "monthlyPayment": 1450.00,
    "studentLoanPlan": null,
    "propertyValue": 350000.00,
    "startDate": "2021-03-01T00:00:00.000Z",
    "targetEndDate": "2051-03-01T00:00:00.000Z",
    "notes": null,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "history": []
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Debt not found
- `500` - Server error

---

### Create Debt

Creates a new debt.

```http
POST /api/debts
```

**Request Body:**

```json
{
  "name": "Student Finance England",
  "type": "STUDENT_LOAN",
  "balance": 42000.00,
  "originalAmount": 45000.00,
  "interestRate": 7.3,
  "minimumPayment": 0,
  "monthlyPayment": 250.00,
  "studentLoanPlan": "PLAN_2",
  "startDate": "2019-09-01"
}
```

**Required Fields:**
- `name` (string) - Debt name
- `type` (string) - Debt type
- `balance` (number) - Current balance
- `interestRate` (number) - Annual interest rate %

**Optional Fields:**
- `originalAmount` (number) - Original loan amount
- `minimumPayment` (number) - Minimum monthly payment
- `monthlyPayment` (number) - Actual monthly payment
- `studentLoanPlan` (string) - PLAN_1, PLAN_2, PLAN_4, PLAN_5, POSTGRAD
- `propertyValue` (number) - For mortgages
- `startDate` (string) - ISO date string
- `targetEndDate` (string) - ISO date string
- `notes` (string)

**Student Loan Plans:**
- `PLAN_1` - Pre-2012 English & Welsh loans
- `PLAN_2` - 2012-2023 English & Welsh loans
- `PLAN_4` - Scottish loans
- `PLAN_5` - Post-2023 English loans
- `POSTGRAD` - Postgraduate loans

**Response:**

```json
{
  "success": true,
  "data": { /* created debt */ },
  "message": "Debt created successfully"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `500` - Server error

---

### Update Debt

Updates an existing debt.

```http
PUT /api/debts/{id}
```

**Request Body:** Include only fields to update.

**Status Codes:**
- `200` - Success
- `400` - Invalid request
- `404` - Debt not found
- `500` - Server error

---

### Delete Debt

Deletes a debt and its history.

```http
DELETE /api/debts/{id}
```

**Status Codes:**
- `200` - Success
- `404` - Debt not found
- `500` - Server error

---

## Summary API

### Get Financial Summary

Returns comprehensive financial summary including net worth, ratios, and allocations.

```http
GET /api/summary
```

**Response:**

```json
{
  "success": true,
  "data": {
    "netWorth": 137500.00,
    "totalAssets": 420000.00,
    "totalDebts": 314050.00,
    "totalGovernmentBonus": 3000.00,
    "assetAllocation": {
      "cash": 17450.75,
      "investments": 55200.00,
      "property": 350000.00,
      "propertyEquity": 85000.00
    },
    "assetBreakdown": {
      "BANK_CURRENT": 2450.75,
      "BANK_SAVINGS": 15000.00,
      "ISA": 28500.00,
      "LISA": 12000.00,
      "STOCK": 14700.00,
      "PROPERTY": 350000.00
    },
    "debtBreakdown": {
      "STUDENT_LOAN": 42000.00,
      "CREDIT_CARD": 1850.00,
      "MORTGAGE": 265000.00,
      "PERSONAL_LOAN": 5200.00
    },
    "ratios": {
      "debtToEquity": 0.75,
      "liquidity": 3.2,
      "debtToAsset": 0.32
    },
    "monthlyPayments": {
      "total": 2045.00,
      "breakdown": []
    },
    "studentLoanDetails": [],
    "history": [],
    "summary": {
      "assetCount": 7,
      "debtCount": 4,
      "currencies": ["GBP"]
    }
  }
}
```

**Financial Ratios Explained:**
- **Debt-to-Equity Ratio:** Total Debt / (Total Assets + Total Debt)
- **Liquidity Ratio:** Cash Assets / Monthly Debt Payments (months of coverage)
- **Debt-to-Asset Ratio:** Total Debt / Total Assets

---

## Projections API

### Get Financial Projections

Returns growth projections and debt payoff timelines.

```http
GET /api/projections
```

**Query Parameters:**

| Parameter   | Type   | Description                           |
|-------------|--------|---------------------------------------|
| years       | number | Years to project (default: 10)        |
| growthRate  | number | Override growth rate % (optional)     |

**Response:**

```json
{
  "success": true,
  "data": {
    "currentNetWorth": 137500.00,
    "projections": [
      {
        "rate": 4,
        "yearlyProjections": [
          { "year": 1, "assets": 440000, "debts": 300000, "netWorth": 140000 }
        ]
      },
      {
        "rate": 7,
        "yearlyProjections": [...]
      },
      {
        "rate": 10,
        "yearlyProjections": [...]
      }
    ],
    "debtPayoffTimeline": [
      {
        "id": "clx123abc",
        "name": "Barclaycard Platinum",
        "type": "CREDIT_CARD",
        "currentBalance": 1850.00,
        "interestRate": 22.9,
        "monthlyPayment": 150.00,
        "payoffDate": "2025-03-15",
        "totalInterest": 150.00,
        "monthsRemaining": 14
      }
    ],
    "netWorthTrendline": [],
    "assetProjections": [],
    "lisaProjections": [],
    "summary": {
      "projectedNetWorth10Years": 500000.00,
      "earliestDebtFreeDate": "2032-06-15",
      "totalProjectedInterest": 45000.00
    }
  }
}
```

---

## Seed API

### Seed Database

Populates the database with sample data for demonstration.

```http
POST /api/seed
```

**Response:**

```json
{
  "success": true,
  "message": "Database seeded successfully",
  "data": {
    "assetsCreated": 7,
    "debtsCreated": 4,
    "historyEntriesCreated": 132
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid input)
- `404` - Not Found
- `500` - Internal Server Error

---

## CORS

This API supports Cross-Origin Resource Sharing (CORS) for development purposes.

---

## Rate Limiting

No rate limiting is currently implemented for this API.

---

## Version

API Version: 1.0.0
