/**
 * Test script for HangiKredi.com fund data scraping
 * URL format: https://www.hangikredi.com/yatirim-araclari/fon/{FUND_CODE}
 * 
 * Run with: node testHangikredi.js
 */

const axios = require('axios');
const cheerio = require('cheerio');

const axiosInstance = axios.create({
  timeout: 30000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Referer': 'https://www.google.com/'
  }
});

const testFunds = ['THV', 'NVB', 'AFA'];

async function testHangikredi(fundCode) {
  const url = `https://www.hangikredi.com/yatirim-araclari/fon/${fundCode}`;
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 Testing HangiKredi for ${fundCode}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`URL: ${url}\n`);
  
  try {
    const response = await axiosInstance.get(url);
    
    if (!response.data || response.data.length === 0) {
      console.log(`❌ Empty response`);
      return null;
    }
    
    console.log(`✅ Got response (${response.data.length} bytes)\n`);
    
    const $ = cheerio.load(response.data);
    
    // Extract current price
    const priceText = $('h1').next().find('span').first().text().trim() || 
                     $('[class*="price"]').first().text().trim() ||
                     $('h1').parent().find('span').first().text().trim();
    
    console.log(`📊 Price text found: "${priceText}"`);
    
    // Look for percentage change
    const changeText = $('h1').next().find('span').eq(1).text().trim() ||
                      $('[class*="change"]').first().text().trim();
    
    console.log(`📈 Change text found: "${changeText}"`);
    
    // Look for weekly return data
    console.log(`\n🔍 Looking for weekly return data...`);
    
    // Check for "Performans kıyaslaması" section
    const performanceSection = $('*:contains("Performans kıyaslaması")');
    console.log(`   Found ${performanceSection.length} element(s) with "Performans kıyaslaması"`);
    
    // Look for date ranges
    const dateText = $('*:contains("tarihleri arasında")').first().text();
    console.log(`   Date range text: "${dateText}"`);
    
    // Extract dates: "03.12.2025 - 02.01.2026"
    const dateMatch = dateText.match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/);
    if (dateMatch) {
      console.log(`   ✅ Found date range: ${dateMatch[1]} to ${dateMatch[2]}`);
    }
    
    // Look for percentage values in the page
    const allText = $('body').text();
    const percentMatches = allText.match(/%[\s-]?[\d,.-]+/g);
    if (percentMatches) {
      console.log(`\n   Found ${percentMatches.length} percentage values:`);
      percentMatches.slice(0, 10).forEach((match, i) => {
        console.log(`   [${i + 1}] ${match}`);
      });
    }
    
    // Try to find table with performance data
    console.log(`\n🔍 Looking for performance tables...`);
    $('table').each((i, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      console.log(`   Table ${i + 1}: ${rows.length} rows`);
      
      rows.slice(0, 5).each((j, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        const rowText = $row.text().trim();
        if (rowText.length > 0 && rowText.length < 200) {
          console.log(`      Row ${j + 1}: ${rowText.substring(0, 100)}`);
        }
      });
    });
    
    // Extract main price
    const mainPriceMatch = priceText.match(/([\d,.-]+)\s*TL/);
    if (mainPriceMatch) {
      const price = parseFloat(mainPriceMatch[1].replace(/\./g, '').replace(',', '.'));
      console.log(`\n✅ Extracted price: ${price} TL`);
    }
    
    // Extract percentage change
    const changeMatch = changeText.match(/\(%?([\d,.-]+)\)/);
    if (changeMatch) {
      const change = parseFloat(changeMatch[1].replace(',', '.'));
      console.log(`✅ Extracted change: ${change}%`);
    }
    
    // Save sample HTML
    console.log(`\n📄 Sample HTML (first 1500 chars):`);
    console.log(response.data.substring(0, 1500));
    console.log(`\n... (truncated)\n`);
    
    return {
      fundCode,
      url,
      price: mainPriceMatch ? parseFloat(mainPriceMatch[1].replace(/\./g, '').replace(',', '.')) : null,
      change: changeMatch ? parseFloat(changeMatch[1].replace(',', '.')) : null,
      dateRange: dateMatch ? { start: dateMatch[1], end: dateMatch[2] } : null
    };
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
    return null;
  }
}

async function runTests() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 HANGIKREDI.COM FUND DATA TEST`);
  console.log(`${'='.repeat(70)}\n`);
  
  const results = {};
  
  for (const fundCode of testFunds) {
    const result = await testHangikredi(fundCode);
    results[fundCode] = result;
    
    // Wait between requests
    if (fundCode !== testFunds[testFunds.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  
  Object.keys(results).forEach(code => {
    const r = results[code];
    if (r) {
      console.log(`\n${code}:`);
      console.log(`   Price: ${r.price || 'N/A'} TL`);
      console.log(`   Change: ${r.change || 'N/A'}%`);
      if (r.dateRange) {
        console.log(`   Date Range: ${r.dateRange.start} to ${r.dateRange.end}`);
      }
    } else {
      console.log(`\n${code}: ❌ Failed`);
    }
  });
  
  console.log(`\n${'='.repeat(70)}\n`);
}

if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(`\n💥 Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { testHangikredi };

