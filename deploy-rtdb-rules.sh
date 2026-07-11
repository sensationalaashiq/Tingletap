#!/bin/bash
# Deploy Firebase Realtime Database rules
# Run: bash deploy-rtdb-rules.sh
#
# Set your project values before running:
#   export FIREBASE_PROJECT_ID=your-project-id
#   export FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.region.firebasedatabase.app

DB_URL="${FIREBASE_DATABASE_URL:-https://your-project-id-default-rtdb.region.firebasedatabase.app}"
PROJECT="${FIREBASE_PROJECT_ID:-your-project-id}"
RULES_FILE="database.rules.json"

echo "==================================="
echo " App RTDB Rules Deployer"
echo "==================================="

# Try firebase CLI first
if command -v firebase &> /dev/null; then
  echo "Firebase CLI found — deploying..."
  firebase deploy --only database --project "$PROJECT"
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
    echo "  firebase deploy --only database --project \$FIREBASE_PROJECT_ID"
    echo ""
    exit 0
  fi
fi

echo ""
echo "MANUAL OPTION (30 seconds):"
echo "-----------------------------------"
echo "1. Open Firebase Console → your project → Realtime Database → Rules"
echo "2. Replace ALL text with the contents of: $RULES_FILE"
echo "3. Click PUBLISH"
echo ""
cat "$RULES_FILE"
