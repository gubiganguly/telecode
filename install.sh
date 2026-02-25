#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

CASPERBOT_HOME="$HOME/CasperBot"
PROJECTS_DIR="$CASPERBOT_HOME/Claude Code Projects"
REPO_DIR="$PROJECTS_DIR/CasperBot"
REPO_URL="https://github.com/gubiganguly/CasperBot.git"

echo ""
echo -e "${BOLD}=== CasperBot Installer ===${NC}"
echo ""
echo "  This will set up CasperBot at:"
echo "    $CASPERBOT_HOME/"
echo "      Claude Code Projects/"
echo "        CasperBot/   ← app source code"
echo ""

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
echo -e "${BOLD}[1/4] Checking prerequisites...${NC}"

if ! command -v git &>/dev/null; then
  fail "git is required. Install it with: brew install git"
fi
ok "git"

if ! command -v brew &>/dev/null; then
  fail "Homebrew is required. Install it from https://brew.sh"
fi
ok "Homebrew"

# ---------------------------------------------------------------------------
# 2. Create directory structure
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[2/4] Creating directory structure...${NC}"

if [ -d "$REPO_DIR" ]; then
  warn "CasperBot already exists at $REPO_DIR"
  read -p "  Pull latest changes instead of cloning? (Y/n) " PULL
  if [ "$PULL" != "n" ] && [ "$PULL" != "N" ]; then
    cd "$REPO_DIR"
    git pull
    ok "Pulled latest changes"
  else
    echo "  Skipping clone."
  fi
else
  mkdir -p "$PROJECTS_DIR"
  ok "Created $PROJECTS_DIR"

  git clone "$REPO_URL" "$REPO_DIR"
  ok "Cloned CasperBot"
fi

# ---------------------------------------------------------------------------
# 3. Run setup
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[3/4] Running setup...${NC}"
echo ""

cd "$REPO_DIR"
chmod +x setup.sh
./setup.sh

# ---------------------------------------------------------------------------
# 4. Auto-start service (optional)
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[4/4] Auto-start on boot (optional)${NC}"
echo ""
read -p "  Install launchd service for auto-restart on boot? (y/N) " INSTALL_SERVICE
if [ "$INSTALL_SERVICE" = "y" ] || [ "$INSTALL_SERVICE" = "Y" ]; then
  chmod +x service/install.sh
  ./service/install.sh
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}=== Installation complete ===${NC}"
echo ""
echo "  CasperBot is installed at: $REPO_DIR"
echo ""
echo "  To start:   cd \"$REPO_DIR\" && ./start.sh"
echo "  To stop:    cd \"$REPO_DIR\" && ./stop.sh"
echo "  To status:  cd \"$REPO_DIR\" && ./status.sh"
echo ""
