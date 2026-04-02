# Branch Prompt - 'AssetTracking/Toby'
Here was the original prompt given to Google Studio:
```text
Here is the foundational code for a web-app used for calculating, monitoring, and managing an individuals networth. Expand upon this code to include features that allow the user to track their assets.
It should allow the user to
- Track multiple bank accounts, with manual balancy entry and the ability to add balance using a seamless UX. Interest rates should be considered to project growth over the next time periods.
- ISAs and LISA support - with LISA including 25% government bonuses to any added amounts. Total ISA contribution should be tracked and must not exceed 20k per tax year.
- Stock support - Input for individual ticker symbols or total portfolio value - with input for estimated return.
- Integration for real-time or delayed price fetching.
This should be done using the style of code already present in the code given, without making any extreme changes to the current code, such as changing the languages used.

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
```
*Note: As Google Studio does not allow folder uploads, only file uploads, I needed to upload the files individually and then get the AI to reorganise the files after generation, hence the file structure in the prompt.*

*Note: Despite several attempts at different methods, I was unable to get any file uploads to process on Google Studio - to get around this I placed the code inline of the prompt. As this gives me a very long prompt, I will not include it here, however the format of each file was as below:*

```text
{file_name}:
    {code}
```

This prompt resulted in a completely different file structure, featuring *.ts* and *.tsx* files, using the React framework. To attempt to fix this, the following prompt was executed:
```text
Do it only using the base code provided, the file structure should be as follows:
application
    public
        index.html
        script.js
        style.css
    server
        Index.js
    data
        data.json
package-lock.json
package.json

Do not use any frameworks such as react, only use Express and Node.js.
The file structure should be exactly as specified.
```

The product produced by Google Studio lacked several features that we wanted from the feature spec, so the following prompts were used to further develop the feature:
```text
You should be able to add and remove balance in any user defined amount, not just in set increments. Also, liabilities should not be included in this version. Also take into account the specific LISA limit of 4000 per tax year.
```
```text
You should also be able to fully delete an asset, and should be alerted if you are paying too much into either a LISA or a generic ISA.
```
