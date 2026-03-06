# Feature Specification

## Overview

A comprehensive financial tracking application designed to consolidate assets and debt to calculate real-time net worth and project future financial standing.

<br>

## Functional Requirements

### Asset Tracking

- **Bank Accounts:** Support for multiple accounts (Current, Savings) with manual balance entry and currency support.
- **ISAs & LISAs:** \* Tracking for UK tax-advantaged accounts.
  - LISA logic: Include government bonus (25%) tracking as a separate pending or realized asset.
- **Stock Portfolios:**
  - Input for individual ticker symbols or total portfolio value.
  - Integration for real-time (or delayed) price fetching.

### Debt & Liability Tracking

- **Student Loans:** \* Calculations based on plan types (e.g., Plan 2 interest rate variations).
  - Integration of automatic interest accrual logic.
- **General Debt:** Tracking for credit cards, personal loans, and mortgages, including interest rates and minimum monthly payments.

### Dashboard (Main View)

The dashboard must serve as the primary analytics hub featuring:

- **Total Net Worth:** Aggregated Assets minus Aggregated Liabilities.
- **Asset Allocation Pie Chart:** Breakdown of Cash vs. Investments vs. Property.
- **Debt-to-Equity Ratio:** Visual representation of leverage.
- **Liquidity Ratio:** Ratio of cash-on-hand to monthly debt obligations.

### Projections & Forecasting

- **Growth Projections:** User-defined annual return rates (e.g., 4%, 7%, 10%) applied to investment accounts.
- **Debt Paydown Timeline:** Estimation of "debt-free" dates based on current payment velocity.
- **Net Worth Trendline:** Historical data plotting over 1, 5, and 10-year periods.
