# PersonalNetWorth
Personal Net Worth and Debt tracker

# This Branch - One Shot Generation (Google Studio)
This branch of the project was created by Google's 'Google Studio' application - specifically using the 'Gemini Flash 3 Preview' model of AI.
Initially, this produced an application written primarily in TypeScript - which we decided may cause issues for later merges, if we attempted to mix programming languages, so the decision was made to specify the use of only JavaScript and node.js with the Express framework; the prompt can be found below:

```text
Here is the feature spec for a personal net worth tracker app:
"# Feature Specification

Overview
A comprehensive financial tracking application designed to consolidate assets and debt to calculate real-time net worth and project future financial standing.

Functional Requirements

Asset Tracking
Bank Accounts: Support for multiple accounts (Current, Savings) with manual balance entry and currency support.

ISAs & LISAs: * Tracking for UK tax-advantaged accounts.

LISA logic: Include government bonus (25%) tracking as a separate pending or realized asset.

Stock Portfolios:

Input for individual ticker symbols or total portfolio value.

Integration for real-time (or delayed) price fetching.

Debt & Liability Tracking
Student Loans: * Calculations based on plan types (e.g., Plan 2 interest rate variations).

Integration of automatic interest accrual logic.

General Debt: Tracking for credit cards, personal loans, and mortgages, including interest rates and minimum monthly payments.

Dashboard (Main View)
The dashboard must serve as the primary analytics hub featuring:

Total Net Worth: Aggregated Assets minus Aggregated Liabilities.

Asset Allocation Pie Chart: Breakdown of Cash vs. Investments vs. Property.

Debt-to-Equity Ratio: Visual representation of leverage.

Liquidity Ratio: Ratio of cash-on-hand to monthly debt obligations.

Projections & Forecasting
Growth Projections: User-defined annual return rates (e.g., 4%, 7%, 10%) applied to investment accounts.

Debt Paydown Timeline: Estimation of "debt-free" dates based on current payment velocity.

Net Worth Trendline: Historical data plotting over 1, 5, and 10-year periods.
"

Here is also the specification of the project:
"## COMP1101 Programming (Black) Summative Assessment 1

Term 1 Programming Exercise Outline
Submission of code and video by 14:00 29 January 2026

Submission of peer reviews by 14:00 19 February 2026

Return by 26 February 2026

Contributes 50% of module marks

Includes peer review feedback which you will be allocated

This is an individual piece of work

Subject-specific Knowledge
Interaction between JavaScript programs and the Document Object Model (DOM)

Using control statements to loop and make decisions

An understanding of the nature of imperative programming in the object-oriented style

An understanding of good programming practice (for example, reuse, documentation and style)

Building collections of data within a program and using JavaScript Object Notation (JSON)

Making programs robust through the use of exceptions and exception handling

Subject-Specific Skills
an ability to realise solutions to problems as working JavaScript programs

an ability to apply reuse by exploiting predefined components

an ability to use software tools related to programming (programming environments, code management, documentation tools, etc.)

Key Skills
an ability to communicate technical information

an ability to recognise and apply the principles of abstraction and modelling

Task summary
Construct a dynamic web site for an application of your choosing

Use static HTML pages loading dynamic JSON content from server via AJAX

Server written in nodejs to provide JSON through REST API

Prepare a 2 minute video demonstrating your code

Do a code quality review of four other submissions

Dynamic web site
Choose any application domain as long as it includes at least two kinds of entity e.g.

pictures, people, places, events, comments

If you are not sure then ask me

Static HTML loading JSON via AJAX
'Single page app': page content loaded as JSON via AJAX

Can have more than one page e.g. for user and admin

Should provide clean and simple User Experience (UX)

Should be responsive i.e. work well on desktop and mobile

Recommend using front-end framework such as Bootstrap, Foundation

DO NOT use non-standard language extensions e.g. React, TypeScript

Message sequence chart
![alt text](https://www.websequencediagrams.com/cgi-bin/cdraw?lz=dGl0bGUgQ2xpZW50L3NlcnZlciBpbnRlcmFjdGlvbgoKABUGLT5TABcFOiBTdGF0aWMgcGFnZSByZXF1ZXN0CgAWBi0-AEEGOiBIVE1MCmxvb3AgZWFjaCB1c2VyIABJBwA_EER5bmFtaWMgY29udGVudABLCCAoQUpBWCkASRFKU09OAIEKCQBnCFJlbmRlcgAXBQA_CWFzAIEBBSB3aXRoaW4gRE9NCmVuZAoK&s=roundgreen)

Server provides JSON through a REST API
Each entity type (e.g. picture) has:

GET method to list/search

GET method for individual details

POST method to add new entity

Document your API in the style of the ChatGPT API

Server written in nodejs
Use npm for management

Write jest test cases: run with npm test

Recommend using express

Submission
Source code (all zipped)

HTML/CSS/JS

package.json

jest test cases

API documentation

demonstration video

Assessment Criteria
Equally weighted 9% each:

Client-side functionality

Client-side quality

Server-side functionality

Server-side quality

Video presentation

Peer Review Marking
5% of the module marks are awarded for peer reviews.

How to do the assignment
Design HTML

Design web service

Join with Fetch

Read the FAQ.md"
Only use base javascript, and express - do not use TypeScript/React etc.
```

