#!/bin/bash
NODEJS_DIR="$1"
if [ -z "$NODEJS_DIR" ]; then
  echo "Error: NODEJS_DIR argument is missing"
  exit 1
fi

cd "$NODEJS_DIR"
PARENT_DIR=$(dirname "$NODEJS_DIR")
PUBLIC_HTML_DIR="$PARENT_DIR/public_html"

echo "=== CHECKING PRELOAD FILES AND PERMISSIONS ==="
echo "Parent directory listing (.builds):"
ls -la "$PARENT_DIR/.builds" || echo "No .builds in parent"
ls -la "$PARENT_DIR/.builds/config" || echo "No config in parent .builds"

echo "public_html directory listing (.builds):"
ls -la "$PUBLIC_HTML_DIR/.builds" || echo "No .builds in public_html"
ls -la "$PUBLIC_HTML_DIR/.builds/config" || echo "No config in public_html .builds"

echo "=== TESTING NODE WITH NODE_OPTIONS REQUIRE ==="
echo "Testing parent preload path:"
NODE_OPTIONS="--require $PARENT_DIR/.builds/config/preload-timestamp.js" /opt/alt/alt-nodejs22/root/bin/node -e "console.log('Parent preload loaded successfully!')" || echo "Parent preload load failed!"

echo "Testing public_html preload path:"
NODE_OPTIONS="--require $PUBLIC_HTML_DIR/.builds/config/preload-timestamp.js" /opt/alt/alt-nodejs22/root/bin/node -e "console.log('Public_html preload loaded successfully!')" || echo "Public_html preload load failed!"

echo "=== REMOTE STARTING NODE SERVER.JS IN BACKGROUND ==="
# Delete old debug_env.log and console.log to start fresh
rm -f debug_env.log console.log

# Run node server.js in background, redirecting stdout/stderr to console.log
/opt/alt/alt-nodejs22/root/bin/node server.js > console.log 2>&1 &
PID=$!

echo "Started Node process with PID: $PID"
sleep 4

echo "=== SENDING TEST HTTP REQUEST TO LOCALHOST:3000 ==="
curl -i http://127.0.0.1:3000/ || echo "Curl failed"

echo "=== DIAGNOSTIC CONSOLE LOG OUTPUT ==="
if [ -f console.log ]; then
  cat console.log
else
  echo "No console.log file found!"
fi

echo "=== DIAGNOSTIC DEBUG_ENV LOG OUTPUT ==="
if [ -f debug_env.log ]; then
  cat debug_env.log
else
  echo "No debug_env.log file found!"
fi

echo "Killing Node process $PID..."
kill -9 $PID || true
rm -f console.log debug_env.log
echo "Diagnostic script completed."

