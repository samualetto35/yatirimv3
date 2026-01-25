/**
 * Test script for Fintables comparison page scraping
 * Tests the new approach: https://fintables.com/fon-karsilastirma?funds=NVB,AHU,JOT
 * 
 * Run with: node testFintablesComparison.js
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Create axios instance with better headers to bypass Cloudflare
const axiosInstance = axios.create({
  timeout: 30000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  }
});

// Test fund codes
const testFunds = ['NVB', 'AHU', 'JOT'];

async function testComparisonPage() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 TESTING FINTABLES COMPARISON PAGE`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Funds: ${testFunds.join(', ')}`);
  console.log(`${'='.repeat(70)}\n`);
  
  const fundsParam = testFunds.join(',');
  const url = `https://fintables.com/fon-karsilastirma?funds=${fundsParam}`;
  
  console.log(`📡 Fetching: ${url}\n`);
  
  try {
    // First, try to get the main page to establish session
    console.log(`📡 Step 1: Getting main page to establish session...`);
    try {
      const mainPageResponse = await axiosInstance.get('https://fintables.com/', {
        headers: {
          'Referer': 'https://www.google.com/'
        }
      });
      console.log(`✅ Main page loaded (${mainPageResponse.data.length} bytes)`);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      console.log(`⚠️  Could not load main page: ${e.message}`);
    }
    
    console.log(`\n📡 Step 2: Fetching comparison page...`);
    const response = await axiosInstance.get(url, {
      headers: {
        'Referer': 'https://fintables.com/',
        'Origin': 'https://fintables.com'
      }
    });
    
    if (!response.data || response.data.length === 0) {
      console.log(`❌ Empty response`);
      return;
    }
    
    console.log(`✅ Got response (${response.data.length} bytes)\n`);
    
    const $ = cheerio.load(response.data);
    
    // Save HTML for inspection
    console.log(`📄 Page Title: ${$('title').text()}\n`);
    
    // Try to find the table
    console.log(`🔍 Looking for tables...`);
    const tables = $('table');
    console.log(`   Found ${tables.length} table(s)\n`);
    
    // Try to find "1 Hafta" text
    console.log(`🔍 Looking for "1 Hafta" text...`);
    const haftaElements = $('*:contains("1 Hafta"), *:contains("1Hafta")');
    console.log(`   Found ${haftaElements.length} element(s) containing "1 Hafta"\n`);
    
    // Print first few matches
    haftaElements.slice(0, 5).each((i, el) => {
      const $el = $(el);
      console.log(`   [${i + 1}] Tag: ${el.tagName}, Text: "${$el.text().trim().substring(0, 100)}"`);
      console.log(`       HTML: ${$el.html()?.substring(0, 200)}`);
    });
    console.log('');
    
    // Try to find fund codes in the page
    console.log(`🔍 Looking for fund codes...`);
    testFunds.forEach(code => {
      const codeElements = $(`*:contains("${code}")`);
      console.log(`   ${code}: Found ${codeElements.length} element(s)`);
      
      // Print first match with context
      if (codeElements.length > 0) {
        const $first = codeElements.first();
        const parent = $first.parent();
        console.log(`      Context: ${parent.text().trim().substring(0, 150)}`);
      }
    });
    console.log('');
    
    // Try to find percentage values
    console.log(`🔍 Looking for percentage values (weekly returns)...`);
    const percentagePattern = /(\d+[,.]\d+)\s*%/g;
    const bodyText = $('body').text();
    const matches = bodyText.match(percentagePattern);
    if (matches) {
      console.log(`   Found ${matches.length} percentage values:`);
      matches.slice(0, 20).forEach((match, i) => {
        console.log(`   [${i + 1}] ${match}`);
      });
    } else {
      console.log(`   No percentage values found with pattern`);
    }
    console.log('');
    
    // Try to find table rows with fund data
    console.log(`🔍 Analyzing table structure...`);
    $('table').each((tableIndex, table) => {
      const $table = $(table);
      console.log(`\n   Table ${tableIndex + 1}:`);
      
      // Get headers
      const headers = [];
      $table.find('thead tr th, thead tr td, tr:first-child th, tr:first-child td').each((i, th) => {
        const text = $(th).text().trim();
        if (text) headers.push(text);
      });
      console.log(`   Headers: ${headers.join(' | ')}`);
      
      // Find "1 Hafta" column index
      const haftaIndex = headers.findIndex(h => h.includes('1 Hafta') || h.includes('1Hafta') || h.includes('Hafta'));
      console.log(`   "1 Hafta" column index: ${haftaIndex}`);
      
      // Get rows
      $table.find('tbody tr, tr').each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        const rowText = $row.text();
        
        // Check if this row contains any of our fund codes
        const foundFund = testFunds.find(code => rowText.includes(code));
        if (foundFund) {
          console.log(`\n   Row ${rowIndex + 1} (Fund: ${foundFund}):`);
          cells.each((cellIndex, cell) => {
            const cellText = $(cell).text().trim();
            const header = headers[cellIndex] || `Col ${cellIndex}`;
            console.log(`      ${header}: "${cellText}"`);
          });
          
          // Try to extract return from "1 Hafta" column
          if (haftaIndex >= 0) {
            const returnCell = cells.eq(haftaIndex);
            const returnText = returnCell.text().trim();
            const percentMatch = returnText.match(/(\d+[,.]\d+)\s*%?/);
            if (percentMatch) {
              const returnValue = parseFloat(percentMatch[1].replace(',', '.'));
              console.log(`      ✅ Extracted Return: ${returnValue}%`);
            }
          }
        }
      });
    });
    
    // Save a sample of HTML for manual inspection
    console.log(`\n📄 Sample HTML (first 2000 chars):`);
    console.log(response.data.substring(0, 2000));
    console.log(`\n... (truncated)\n`);
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Headers:`, JSON.stringify(error.response.headers, null, 2));
    }
  }
}

// Run test
if (require.main === module) {
  testComparisonPage()
    .then(() => {
      console.log(`\n✅ Test completed`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n💥 Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { testComparisonPage };

