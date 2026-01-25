#!/bin/bash
# Call adminTestHangikredi for 2026-W01

# Get auth token
TOKEN=$(gcloud auth print-identity-token 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Error: gcloud auth token not found."
  echo "Please run: gcloud auth login"
  exit 1
fi

echo "🚀 Calling adminTestHangikredi for 2026-W01..."
echo ""

# Call function with proper format (data wrapper is required!)
curl -m 70 -X POST https://us-central1-yatirimv3.cloudfunctions.net/adminTestHangikredi \
  -H "Authorization: bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "weekId": "2026-W01",
      "dryRun": false
    }
  }'

echo ""
echo ""
echo "✅ Request sent! Check Firebase Console logs for results."

