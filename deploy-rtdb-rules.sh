#!/bin/bash
# Deploy Firebase Realtime Database rules
# Run: bash deploy-rtdb-rules.sh

DB_URL="https://tingletapofraj-default-rtdb.asia-southeast1.firebasedatabase.app"
RULES_FILE="database.rules.json"

echo "==================================="
echo " TingleTap RTDB Rules Deployer"
echo "==================================="

# Try firebase CLI first
if command -v firebase &> /dev/null; then
  echo "Firebase CLI found — deploying..."
  firebase deploy --only database --project tingletapofraj
  echo "Done!"
  exit 0
fi

# Try installing firebase-tools if npm is available
if command -v npx &> /dev/null; then
  echo "Installing firebase-tools..."
  npm install -g firebase-tools 2>/dev/null
  
  if command -v firebase &> /dev/null; then
    echo "Firebase CLI installed — please run:"
    echo ""
    echo "  firebase login"
    echo "  firebase deploy --only database --project tingletapofraj"
    echo ""
    exit 0
  fi
fi

echo ""
echo "MANUAL OPTION (30 seconds):"
echo "-----------------------------------"
echo "1. Open: https://console.firebase.google.com/project/tingletapofraj/database/tingletapofraj-default-rtdb/rules"
echo "2. Replace ALL text with the contents of: database.rules.json"
echo "3. Click PUBLISH"
echo ""
cat "$RULES_FILE"
