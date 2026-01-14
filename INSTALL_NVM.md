# Installing Node.js 23.3.0 and pnpm 9.12.3 via nvm

## Your Current Setup
- **Shell**: zsh
- **Current Node**: v24.12.0 (globally installed)
- **nvm**: Not installed
- **pnpm**: Not installed

## Installation Steps

### Step 1: Install nvm
Run this command in your terminal:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

This will:
- Install nvm to `~/.nvm/`
- Automatically add initialization code to your `~/.zshrc`

### Step 2: Reload your shell
```bash
source ~/.zshrc
```

Or simply close and reopen your terminal.

### Step 3: Verify nvm is installed
```bash
nvm --version
```

Should output: `0.39.7`

### Step 4: Install Node.js 23.3.0
```bash
cd /Users/lakshitrawat/Documents/GitHub/loqi-notes
nvm install 23.3.0
nvm use 23.3.0
```

This will:
- Install Node 23.3.0 to `~/.nvm/versions/node/v23.3.0/`
- Automatically use the version specified in `.nvmrc`

### Step 5: Verify Node installation
```bash
node --version
```

Should output: `v23.3.0`

### Step 6: Enable Corepack and activate pnpm
```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
```

This installs pnpm 9.12.3 via Corepack (built into Node).

### Step 7: Verify pnpm installation
```bash
pnpm --version
```

Should output: `9.12.3`

### Step 8: Install project dependencies
```bash
pnpm install
```

This will install all dependencies for the monorepo.

## What Was Updated

I've already updated these files for you:
- ✅ `.nvmrc` - Created with `23.3.0`
- ✅ `package.json` - Updated engines to Node 23.3.0 and pnpm 9.12.3
- ✅ `apps/api/package.json` - Updated @types/node to ^23.0.0
- ✅ `README.md` - Updated all version references
- ✅ `SETUP.md` - Updated all version references
- ✅ `PROJECT_STRUCTURE.md` - Updated all version references

## Automatic Version Switching

Once nvm is installed, whenever you `cd` into this project directory, nvm will automatically use Node 23.3.0 because of the `.nvmrc` file.

To make this automatic, add this to your `~/.zshrc`:
```bash
# Automatically use Node version from .nvmrc
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

## Troubleshooting

### If nvm command not found after installation
Make sure these lines are in your `~/.zshrc`:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
```

Then run: `source ~/.zshrc`

### If pnpm command not found
Run:
```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
```

## Next Steps

After installing dependencies with `pnpm install`:

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Build shared packages**
   ```bash
   pnpm --filter @loqi-notes/shared-types build
   ```

3. **Start development server**
   ```bash
   pnpm --filter @loqi-notes/api dev
   ```

Server will run on: `http://localhost:3001`

## Summary

All files have been updated to use:
- **Node.js**: 23.3.0
- **pnpm**: 9.12.3

Just run the commands above to complete the setup!
