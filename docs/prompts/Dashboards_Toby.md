# Branch Prompt - 'Dashboards/Toby'
Here was the original prompt given to Google Studio:

```text
Here is the code for a web-app used for calculating, monitoring and managing an individual's net worth. Expand upon the features already present in the code to include the following features for tracking:
- Total net-worth, taking into account all tracked assets vs liabilities.
- Pie chart to summarise asset distribution (cash/property/investment)
- Debt-to-equity ratio - display as a calculated 'financial responsibility' score.
- A graph of total networth over time, with details when highlighted. Should have timeframe selection and include predicted networth for the future, utilising estimated return and interest rates of assets. 
- By clicking on the graph option for individual assets and liabilities, you should also be able to see a graph of past and estimated future values for that specific financial component.
- Note: in graphs, future values should be demonstrated by a dotted line.
- Any other features that make sense for this application - implement them fully but include an explained list of any other added features in a plain .txt file in the file directory.

The file structure should be as follows:
application
    public
        index.html
        script.js
        style.css
    server
        index.js
    data
        data.json
    package-lock.json
    package.json

Do not change the core of the program in any way - it still should be an express app etc.
```

Despite the end of the previous prompt, Gemini once again switched to TypeScript, so I used the following prompt to convert back to the desired languages and frameworks:

```text
Do not use TypeScript, React, or any other frameworks. This web-app should be using basic JavaScript, HTML, CSS and JSON, only using Express.
```

This did fix the problem of using the wrong framework - however it would not run due to some errors, which required manual intervention and fixing.

During this testing phase, I realised Gemini had removed many important features - the following prompt was used to try and correct this:
```text
Many many features have been removed, including the ability to add, remove and edit new assets and liabilities. Add these back. The app should now be a finished, fully functional app so any buttons that do not do anything should also be fixed. The app should be complete and ready for deployment.
```

The application was still not up to standard, so I attempted the following fix:
```text
Make it so that property assets can be added, and fix the fact that the dashboard graphs and visuals, along with the financial responsibility score do not work.
```

Although at this point I am happy with the app, there were still some minor tweaks that I wanted to do, hence this final prompt:
```text
When hovering over the line on a graph, exact values should be visible. Also, fix minor problems, such as millions being demonstrated as 1000k.
```

This prompt fully broke the app, clicking the 'troubleshoot button' fixed this, and the following prompt was used in an attempt to recieve the features desired:
```text
Add a negative responsibility score, and do not count student loans towards negative debt, also graphs on the expanded view of individual assets should be able to also receive detailed information. Also include historic data in all graphs, demonstrated through the use of a filled in line.
```