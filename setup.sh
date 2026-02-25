#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

echo ""
echo -e "${BOLD}=== CasperBot Setup ===${NC}"
echo ""

# ---------------------------------------------------------------------------
# 1. Prerequisites
# ---------------------------------------------------------------------------
echo -e "${BOLD}[1/5] Checking prerequisites...${NC}"

MISSING=0

if command -v node &>/dev/null; then
  ok "Node.js $(node --version)"
else
  warn "Node.js not found — installing..."
  brew install node
  ok "Node.js $(node --version)"
fi

if command -v python3 &>/dev/null; then
  ok "Python $(python3 --version 2>&1 | awk '{print $2}')"
else
  warn "Python not found — installing..."
  brew install python@3.11
  ok "Python $(python3 --version 2>&1 | awk '{print $2}')"
fi

if command -v cloudflared &>/dev/null; then
  ok "cloudflared installed"
else
  warn "cloudflared not found — installing..."
  brew install cloudflared
  ok "cloudflared installed"
fi

if command -v claude &>/dev/null; then
  ok "Claude Code CLI installed"
else
  warn "Claude Code CLI not found — installing..."
  npm install -g @anthropic-ai/claude-code
  ok "Claude Code CLI installed"
fi

# ---------------------------------------------------------------------------
# 2. Backend dependencies
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[2/5] Setting up backend...${NC}"
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
  ok "Created virtual environment"
else
  ok "Virtual environment exists"
fi

source venv/bin/activate
pip install -r requirements.txt --quiet 2>&1
ok "Python dependencies installed"
deactivate

# ---------------------------------------------------------------------------
# 3. Frontend dependencies
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[3/5] Setting up frontend...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent 2>&1
ok "npm packages installed"

# ---------------------------------------------------------------------------
# 4. Environment configuration
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[4/5] Configuring environment...${NC}"

if [ -f "$SCRIPT_DIR/.env.production" ]; then
  ok ".env.production already exists"
  echo ""
  read -p "  Overwrite with fresh config? (y/N) " OVERWRITE
  if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
    echo "  Keeping existing config."
    SKIP_ENV=1
  fi
fi

if [ -z "$SKIP_ENV" ]; then
  echo ""

  # Domain
  read -p "  Your domain (e.g. casperbot.net): " DOMAIN
  if [ -z "$DOMAIN" ]; then
    fail "Domain is required."
    exit 1
  fi

  # Password
  while true; do
    read -s -p "  Login password: " PASSWORD
    echo ""
    if [ -z "$PASSWORD" ]; then
      fail "Password cannot be empty."
    else
      read -s -p "  Confirm password: " PASSWORD2
      echo ""
      if [ "$PASSWORD" != "$PASSWORD2" ]; then
        fail "Passwords don't match. Try again."
      else
        break
      fi
    fi
  done

  # Generate secret
  AUTH_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

  # Detect projects directory (parent of this repo)
  PROJECTS_DIR="$(dirname "$SCRIPT_DIR")"

  # Write .env.production
  cat > "$SCRIPT_DIR/.env.production" <<EOF
# === Auth ===
CASPERBOT_AUTH_PASSWORD=$PASSWORD
CASPERBOT_AUTH_SECRET=$AUTH_SECRET

# === Paths ===
CASPERBOT_PROJECTS_DIR=$PROJECTS_DIR

# === URLs ===
CASPERBOT_CORS_ORIGINS=https://$DOMAIN
CASPERBOT_FRONTEND_URL=https://$DOMAIN
CASPERBOT_GITHUB_CALLBACK_URL=https://$DOMAIN/api/github/auth/callback

# Frontend (build-time — baked into JS bundle)
NEXT_PUBLIC_WS_URL=wss://$DOMAIN/ws/chat

# === GitHub OAuth (optional) ===
CASPERBOT_GITHUB_CLIENT_ID=
CASPERBOT_GITHUB_CLIENT_SECRET=
EOF

  ok "Created .env.production"
fi

# ---------------------------------------------------------------------------
# 5. Cloudflared + Claude CLI checks
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[5/5] Checking services...${NC}"

if [ -d "$HOME/.cloudflared" ] && ls "$HOME/.cloudflared"/*.json &>/dev/null; then
  ok "Cloudflare tunnel credentials found"
else
  warn "No tunnel credentials found in ~/.cloudflared/"
  echo "    To set up a tunnel:"
  echo "      cloudflared tunnel login"
  echo "      cloudflared tunnel create casperbot"
  echo "      cloudflared tunnel route dns casperbot $DOMAIN"
  echo "    Then copy ~/.cloudflared/ from this machine to your server."
fi

if claude --version &>/dev/null; then
  ok "Claude Code CLI authenticated"
else
  warn "Claude Code CLI not authenticated. Run 'claude' to log in."
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}=== Setup complete ===${NC}"
echo ""
echo "  Next: ./start.sh"
echo ""
