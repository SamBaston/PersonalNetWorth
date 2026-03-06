# NetWorthPro - Personal Net Worth Tracker

This application is a comprehensive financial tracking tool built for the COMP1101 Programming Summative Assessment.

## Features
- **Asset Tracking:** Bank accounts, ISAs, LISAs (with 25% bonus logic), and Stock Portfolios.
- **Liability Tracking:** Student Loans (Plan 2 interest), Credit Cards, and Mortgages.
- **Real-time Dashboard:** Total Net Worth, Asset Allocation (D3.js), and Financial Ratios.
- **Projections:** 10-year growth forecasting and debt-free date estimation.

## Technical Stack
- **Server:** Node.js with Express (REST API).
- **Client:** Static HTML/JavaScript (AJAX/Fetch) using Tailwind CSS and D3.js.
- **Testing:** Jest with Supertest.

## How to Run
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Start the Server:**
   ```bash
   npm start
   ```
   The app will automatically build and then start the server at `http://localhost:3000`.

## How to Test
Run the automated test suite:
```bash
npm test
```

## Project Structure
- `server.ts`: Express server providing the REST API.
- `public/`: Static frontend files (HTML, JS, CSS).
- `tests/`: Jest test cases for API validation.
- `API_DOCS.md`: Detailed documentation of the REST API endpoints.

## Assessment Criteria Compliance
- **UX:** Clean, responsive layout with minimal entry required.
- **SPA Style:** All updates are asynchronous via Fetch API.
- **REST API:** Full GET/POST support for Assets and Liabilities.
- **Quality:** Includes Jest tests and API documentation.
