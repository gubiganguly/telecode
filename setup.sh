#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Telecode First-Time Setup ==="
echo ""

# --- Check prerequisites ---
echo "Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "Installing Node.js..."
  brew install node
fi
echo "  Node.js: $(node --version)"

if ! command -v python3 &>/dev/null; then
  echo "Installing Python..."
  brew install python@3.11
fi
echo "  Python: $(python3 --version)"

if ! command -v cloudflared &>/dev/null; then
  echo "Installing cloudflared..."
  brew install cloudflared
fi
echo "  cloudflared: $(cloudflared --version 2>&1 | head -1)"

if ! command -v claude &>/dev/null; then
  echo "Installing Claude Code CLI..."
  npm install -g @anthropic-ai/claude-code
fi
echo "  Claude CLI: installed"

# --- Backend setup ---
echo ""
echo "Setting up backend..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
  echo "  Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
echo "  Installing Python dependencies..."
pip install -r requirements.txt --quiet
deactivate

# --- Frontend setup ---
echo ""
echo "Setting up frontend..."
cd "$SCRIPT_DIR/frontend"
echo "  Installing npm packages..."
npm install --silent

# --- .env.production ---
echo ""
if [ ! -f "$SCRIPT_DIR/.env.production" ]; then
  AUTH_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  cp "$SCRIPT_DIR/.env.production.example" "$SCRIPT_DIR/.env.production"
  # Fill in the auth secret automatically
  sed -i '' "s/change-me-to-a-random-64-char-hex-string/$AUTH_SECRET/" "$SCRIPT_DIR/.env.production"
  echo "Created .env.production with auto-generated auth secret."
  echo ""
  echo "  *** YOU MUST edit .env.production and set: ***"
  echo "  - TELECODE_AUTH_PASSWORD (your login password)"
  echo "  - TUNNEL_TOKEN (if using token-based tunnel)"
  echo ""
  echo "  Run: nano $SCRIPT_DIR/.env.production"
else
  echo ".env.production already exists, skipping."
fi

# --- Cloudflared credentials ---
echo ""
if [ ! -d "$HOME/.cloudflared" ] || [ -z "$(ls $HOME/.cloudflared/*.json 2>/dev/null)" ]; then
  echo "No cloudflared credentials found."
  echo "  Copy your ~/.cloudflared/ folder from your laptop:"
  echo "  scp -r ~/.cloudflared user@this-mac:~/.cloudflared"
  echo ""
  echo "  Or run: cloudflared tunnel login"
else
  echo "cloudflared credentials: found"
fi

# --- Claude CLI auth ---
echo ""
echo "Checking Claude CLI auth..."
if claude --version &>/dev/null; then
  echo "  Claude CLI is available."
  echo "  If not authenticated, run: claude"
else
  echo "  Claude CLI check failed. Run 'claude' to authenticate."
fi

# --- Done ---
echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env.production (set your password)"
echo "  2. Copy ~/.cloudflared/ from your laptop (tunnel credentials)"
echo "  3. Run: ./start.sh"
