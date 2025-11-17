# Data Fetching Test Instructions

## Prerequisites

1. **Install dependencies** (if not already installed):
   ```bash
   cd functions
   npm install yahoo-finance2 axios cheerio
   ```

## Running the Test

1. **Navigate to functions directory**:
   ```bash
   cd functions
   ```

2. **Run the test script**:
   ```bash
   node testDataFetching.js
   ```

3. **Review the output**:
   - The script will test all Yahoo Finance instruments (15 total)
   - Then test all TEFAS instruments (14 total)
   - Display success/failure rates
   - Validate data structure
   - Show sample Firestore document structure

## Expected Results

### Success Criteria
- ✅ Overall success rate should be **≥90%**
- ✅ All successful instruments should have valid data structure:
  - `open`: positive number
  - `close`: positive number
  - `returnPct`: calculated correctly as `((close - open) / open) * 100`
- ✅ Data structure matches historical TSLA/AAPL format

### Known Potential Issues

1. **Yahoo Finance Rate Limiting**:
   - If you see multiple failures, wait 5 minutes and retry
   - The script batches requests to minimize this

2. **TEFAS Weekend/Holiday Data**:
   - Turkish funds may not have data for all dates
   - Test uses Friday as reference, which should have data
   - Adjust `TEST_CONFIG.testDate` in script if needed

3. **Network Issues**:
   - TEFAS uses web scraping which can be flaky
   - Multiple fallback sources are implemented (fonbul.com, TEFAS direct)

## Interpreting Results

### Yahoo Finance Results
```
✅ SUCCESSFUL INSTRUMENTS:
  • TSLA       | Open: $  245.3200 | Close: $  252.1800 | Return:   2.79%
  • AAPL       | Open: $  178.4500 | Close: $  182.3300 | Return:   2.17%
  ...
```

### TEFAS Results
```
✅ SUCCESSFUL INSTRUMENTS:
  • NVB        | Open: $    1.0245 | Close: $    1.0267 | Return:   0.21%
  • DCB        | Open: $    0.9876 | Close: $    0.9891 | Return:   0.15%
  ...
```

### Firestore Structure Sample
The script will output the exact structure that will be written to Firestore:

```json
{
  "window": {
    "period1": "2024-11-11T00:00:00.000Z",
    "period2": "2024-11-15T00:00:00.000Z",
    "tz": "UTC",
    "sources": ["yahoo-finance2", "tefas"]
  },
  "fetchedAt": "2024-11-17T...",
  "TSLA": {
    "open": 245.32,
    "close": 252.18,
    "returnPct": 2.79,
    "source": "historical"
  },
  "AAPL": {
    "open": 178.45,
    "close": 182.33,
    "returnPct": 2.17,
    "source": "historical"
  },
  "XU100": { ... },
  "BTC": { ... },
  "NVB": { ... },
  ...
}
```

## What This Test Validates

1. ✅ **Data Fetching Quality**: All instruments fetch correctly from their sources
2. ✅ **Data Structure Consistency**: All data follows the same format as TSLA/AAPL
3. ✅ **Return Calculation Accuracy**: returnPct is calculated correctly
4. ✅ **Firestore Compatibility**: Structure is ready for direct write to Firestore
5. ✅ **Error Handling**: Failed instruments are properly identified

## Next Steps After Successful Test

If the test passes (≥90% success rate, no structure issues):

1. ✅ Deploy the updated `fetchMarketData` function
2. ✅ Create shared instruments config for frontend
3. ✅ Update allocation forms to show all instruments
4. ✅ Test end-to-end allocation flow

## Troubleshooting

### All Yahoo Finance Instruments Fail
- Check internet connection
- Verify `yahoo-finance2` is installed: `npm list yahoo-finance2`
- Try running with a different test date

### All TEFAS Instruments Fail
- TEFAS website may be down or blocking requests
- Check if fonbul.com is accessible: `curl https://www.fonbul.com`
- Try running during Turkish business hours

### Rate Limiting Errors
- Increase delay between batches in `TEST_CONFIG`
- Reduce `maxConcurrent` from 5 to 3
- Wait 10 minutes and retry

### Data Structure Validation Fails
- Review the specific issues reported
- Check if instrument definitions in `instruments.js` are correct
- Verify calculation logic in `tefasService.js`

