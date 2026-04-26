# PersonalNetWorth
Personal Net Worth and Debt tracker

## Prompt

For this branch I used Claude AI's sonnet 4.6 model to update our previous branch 'Asset Tracking' so that liabilities could also be tracked. Here is what I instructed:

```
You are a senior full-stack developer. You have been given the files of a Personal Networth tracking web application and I would like you to update the application to introduce a debt tracking feature abiding by this criteria:

### Debt & Liability Tracking
- Student Loans: * Calculations based on plan types (e.g., Plan 2 interest rate variations).
  - Integration of automatic interest accrual logic.
- General Debt: Tracking for credit cards, personal loans, and mortgages, including interest rates and minimum monthly payments.

You must maintain the aesthetics and design of the app you have been given, without improvising a new style. Do not introduce any new features that are not mentioned in the given criteria.
```

Notice how with this iteration, I was more specific in the description of the result I wanted to receive; previously Sonnet's response contained too much improvisation in functionality and it completely overwrote the app's aethetic based on its own inherant biases.

As a result, I was much more happy with this iteration's response. Claude successfully matched the aesthetic of the application that it was given and introduced features which adhere to my specification and nothing further. The features that were added seem to work effectively without errors.

The single complaint I have with the response is that liability history requests are met with a browser interupt style response which contains raw json data. While is is functional and correct, it is not an elegant way of displaying this information. To correct this, I gave this additional prompt:

```
I dont like that the liability history requests are met with a browser interupt which contains raw json data. Could you handle this a little more elegantly
```

Claude responded with an application which handled this request much more appropriately, updating the GUI to allow the liability to be displayed in a way which matches the rest of the app's aesthetic.