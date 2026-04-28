# PersonalNetWorth
Personal Net Worth and Debt tracker

## Prompts

For this branch I used Claude AI's sonnet 4.6 model to update our previous branch 'Debt Tracking' so that all assets and debts can be summarised in one clear and informative dashboard. Here is what I instructed:

```
You are a senior full-stack developer. You have been given the files of a Personal Networth tracking web application and I would like you to update the application to introduce a dashboard feature abiding by this criteria:

### Dashboard (Main View)
The dashboard must serve as the primary analytics hub featuring:
- Total Net Worth: Aggregated Assets minus Aggregated Liabilities.
- Asset Allocation Pie Chart: Breakdown of Cash vs. Investments vs. Property.
- Debt-to-Equity Ratio: Visual representation of leverage.
- Liquidity Ratio: Ratio of cash-on-hand to monthly debt obligations.

You must maintain the aesthetics and design of the app you have been given, without improvising a new style. Do not introduce any new features that are not mentioned in the given criteria.
```

For this final branch, I concluded that the prompt style I used in the previous branch was as refined as is necessary for the quality that I desire. As a result, the prompt was very similar, and the outcome it entailed was acceptable. The only issue with the generated app was that the debt-to-equity ratio it calculated was undefined for negative equities. My explaination for this is merely an error of the model's judgement rather than a vague prompting style, so I gave it this final prompt:

```
the debt to equity widget says infinity. is this an error? if so can you fix it
```

and the app then worked as expected.