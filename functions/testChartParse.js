/**
 * Test chart parsing from HangiKredi
 */

const axios = require('axios');

async function testChartParse() {
  const url = 'https://www.hangikredi.com/yatirim-araclari/fon/nvb';
  
  console.log('Fetching NVB data from HangiKredi...\n');
  
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  const html = response.data;
  
  // Find chart data (might be escaped)
  let chartStart = html.indexOf('"chart":[');
  if (chartStart < 0) {
    chartStart = html.indexOf('\\"chart\\":[');
  }
  if (chartStart < 0) {
    chartStart = html.indexOf('chart":[');
  }
  
  if (chartStart < 0) {
    console.log('❌ Chart data not found');
    return;
  }
  
  console.log('✅ Found chart data starting at position', chartStart);
  
  // Find where chart array starts (after "chart": or \"chart\":)
  let arrayStart = chartStart;
  if (html.substring(chartStart, chartStart + 10).includes('\\"')) {
    arrayStart = html.indexOf('[', chartStart) + 1;
  } else {
    arrayStart = html.indexOf('[', chartStart) + 1;
  }
  
  console.log('Array starts at:', arrayStart);
  
  // Extract chart array manually - look for entries
  // Format: {"date":"202512260000","dateText":"26\/12\/2025","last":3.761423,...}
  const chartEntries = [];
  let i = arrayStart;
  let currentEntry = '';
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;
  
  // Extract chart section (larger window to capture all entries)
  const chartSection = html.substring(chartStart, chartStart + 5000);
  
  // Simple regex: find date (8 digits) followed by "last":number
  // Pattern matches: 202512290000...last:3.77291
  const pattern = /(\d{8})\d{4}[^}]*"last":([\d.]+)/g;
  let match;
  
  while ((match = pattern.exec(chartSection)) !== null) {
    const dateStr = match[1]; // YYYYMMDD
    const last = parseFloat(match[2]);
    
    chartEntries.push({
      date: dateStr,
      last: last
    });
  }
  
  console.log(`\n✅ Found ${chartEntries.length} chart entries\n`);
  
  if (chartEntries.length > 0) {
    console.log('First entry:', chartEntries[0]);
    console.log('Last entry:', chartEntries[chartEntries.length - 1]);
    
    // Find Monday (2025-12-29) and Friday (2026-01-02)
    const mondayStr = '20251229';
    const fridayStr = '20260102';
    
    const mondayData = chartEntries.find(item => item.date === mondayStr);
    const fridayData = chartEntries.find(item => item.date === fridayStr);
    
    console.log('\n=== WEEKLY DATA ===');
    if (mondayData) {
      console.log(`Monday (${mondayStr}):`, mondayData.last);
    } else {
      console.log(`❌ Monday (${mondayStr}) not found`);
      console.log('Available dates:', chartEntries.map(e => e.date).join(', '));
    }
    
    if (fridayData) {
      console.log(`Friday (${fridayStr}):`, fridayData.last);
    } else {
      console.log(`❌ Friday (${fridayStr}) not found`);
    }
    
    if (mondayData && fridayData) {
      const mondayPrice = mondayData.last;
      const fridayPrice = fridayData.last;
      
      const weeklyReturn = ((fridayPrice - mondayPrice) / mondayPrice) * 100;
      console.log(`\n📊 Weekly Return: ${weeklyReturn.toFixed(4)}%`);
      console.log(`   (from ${mondayPrice} to ${fridayPrice})`);
      console.log(`\n⚠️  Note: This is the REAL weekly return, not the 1-month return shown in performanceSection!`);
    }
    
    return;
  }
  
  // Fallback: old method
  i = arrayStart;
  
  for (; i < html.length && i < chartStart + 50000; i++) {
    const char = html[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '[') bracketCount++;
      if (char === ']') {
        if (bracketCount === 0) {
          // Found the end
          const chartStr = html.substring(chartStart + 8, i + 1);
          console.log(`\n✅ Extracted chart string (${chartStr.length} chars)`);
          
          // Try to parse
          try {
            const chartData = JSON.parse(chartStr);
            console.log(`✅ Parsed ${chartData.length} chart entries\n`);
            
            // Show first and last entries
            if (chartData.length > 0) {
              console.log('First entry:', JSON.stringify(chartData[0], null, 2));
              console.log('\nLast entry:', JSON.stringify(chartData[chartData.length - 1], null, 2));
              
              // Find Monday (2025-12-29) and Friday (2026-01-02)
              const mondayStr = '20251229';
              const fridayStr = '20260102';
              
              const mondayData = chartData.find(item => {
                const date = item.date || '';
                return date.startsWith(mondayStr);
              });
              
              const fridayData = chartData.find(item => {
                const date = item.date || '';
                return date.startsWith(fridayStr);
              });
              
              console.log('\n=== WEEKLY DATA ===');
              if (mondayData) {
                console.log(`Monday (${mondayStr}):`, mondayData.last || mondayData.close || mondayData.price);
              } else {
                console.log(`❌ Monday (${mondayStr}) not found`);
              }
              
              if (fridayData) {
                console.log(`Friday (${fridayStr}):`, fridayData.last || fridayData.close || fridayData.price);
              } else {
                console.log(`❌ Friday (${fridayStr}) not found`);
              }
              
              if (mondayData && fridayData) {
                const mondayPrice = parseFloat(mondayData.last || mondayData.close || mondayData.price || 0);
                const fridayPrice = parseFloat(fridayData.last || fridayData.close || fridayData.price || 0);
                
                if (mondayPrice > 0) {
                  const weeklyReturn = ((fridayPrice - mondayPrice) / mondayPrice) * 100;
                  console.log(`\n📊 Weekly Return: ${weeklyReturn.toFixed(4)}%`);
                  console.log(`   (from ${mondayPrice} to ${fridayPrice})`);
                }
              }
              
              // Show all dates
              console.log('\n=== ALL DATES IN CHART ===');
              chartData.forEach((item, idx) => {
                const date = item.date || '';
                const dateOnly = date.substring(0, 8);
                const price = item.last || item.close || item.price || 'N/A';
                console.log(`${idx + 1}. ${dateOnly}: ${price}`);
              });
              
            }
            
            break;
          } catch (e) {
            console.log('❌ JSON parse error:', e.message);
            console.log('First 500 chars of chart string:');
            console.log(chartStr.substring(0, 500));
            break;
          }
        }
        bracketCount--;
      }
    }
  }
}

testChartParse().catch(console.error);

