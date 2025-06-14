#!/usr/bin/env node

// Test script to verify duplicate player prevention
// This simulates rapid clicking by making multiple concurrent API calls

const API_BASE = 'http://localhost:5001/api';

async function testDuplicatePrevention() {
  console.log('🧪 Testing duplicate player prevention...\n');

  // First, create a test game session (you'll need a valid quiz ID and auth token)
  console.log('⚠️  Before running this test:');
  console.log('1. Make sure the database migration has been applied');
  console.log('2. Create a test game session through the UI');
  console.log('3. Get the game PIN and update the test parameters below\n');

  // Test parameters - UPDATE THESE
  const gamePin = '123456';  // Replace with actual game PIN
  const nickname = 'testuser';
  const numRequests = 5;     // Number of concurrent requests to send

  console.log(`📊 Test parameters:`);
  console.log(`   Game PIN: ${gamePin}`);
  console.log(`   Nickname: ${nickname}`);
  console.log(`   Concurrent requests: ${numRequests}\n`);

  // Create multiple concurrent join requests
  const promises = [];
  for (let i = 0; i < numRequests; i++) {
    const request = fetch(`${API_BASE}/game/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gamePin,
        nickname,
        userId: null
      })
    });
    promises.push(request);
  }

  console.log(`🚀 Sending ${numRequests} concurrent join requests...`);

  try {
    const responses = await Promise.all(promises);
    
    let successCount = 0;
    let duplicateErrors = 0;
    let rateLimitErrors = 0;
    let otherErrors = 0;

    console.log('\n📋 Results:');
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const result = await response.json();
      
      if (response.ok) {
        successCount++;
        console.log(`   Request ${i + 1}: ✅ SUCCESS (${response.status})`);
      } else if (response.status === 400 && result.error?.includes('already taken')) {
        duplicateErrors++;
        console.log(`   Request ${i + 1}: 🚫 DUPLICATE (${response.status}) - ${result.error}`);
      } else if (response.status === 429) {
        rateLimitErrors++;
        console.log(`   Request ${i + 1}: ⏰ RATE LIMITED (${response.status}) - ${result.error}`);
      } else {
        otherErrors++;
        console.log(`   Request ${i + 1}: ❌ ERROR (${response.status}) - ${result.error}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successful joins: ${successCount}`);
    console.log(`   🚫 Duplicate errors: ${duplicateErrors}`);
    console.log(`   ⏰ Rate limit errors: ${rateLimitErrors}`);
    console.log(`   ❌ Other errors: ${otherErrors}`);

    // Verify results
    console.log('\n🔍 Analysis:');
    if (successCount === 1) {
      console.log('   ✅ PASS: Exactly one request succeeded');
    } else if (successCount === 0) {
      console.log('   ⚠️  WARNING: No requests succeeded - check game PIN and server status');
    } else {
      console.log(`   ❌ FAIL: ${successCount} requests succeeded (expected 1)`);
    }

    if (duplicateErrors + rateLimitErrors === numRequests - successCount) {
      console.log('   ✅ PASS: All other requests were properly rejected');
    } else {
      console.log('   ❌ FAIL: Some requests had unexpected errors');
    }

    if (successCount <= 1 && (duplicateErrors > 0 || rateLimitErrors > 0)) {
      console.log('\n🎉 DUPLICATE PREVENTION IS WORKING! 🎉');
    } else {
      console.log('\n⚠️  DUPLICATE PREVENTION NEEDS INVESTIGATION');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   - Backend server is running on port 5001');
    console.log('   - Database migration has been applied');
    console.log('   - Game PIN is valid and game is in "waiting" status');
  }
}

// Run the test
testDuplicatePrevention();