#!/bin/bash

echo "🧪 Testing AI Quiz Generation with Real API..."
echo

# Test AI quiz generation
curl -X POST "http://localhost:5001/api/quiz/generate-ai" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake-token" \
  -d '{
    "topic": "Türk Tarihi",
    "difficulty": "orta",
    "category": "Tarih",
    "questionCount": 3
  }' | jq '.' 2>/dev/null || echo "Raw response (jq not available):"

echo
echo "✅ AI Quiz generation test completed!"