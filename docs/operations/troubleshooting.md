# Troubleshooting

## Missing Workspace Packages

### Symptom
Error: `ENOENT: no such file or directory, open '/home/sandrocket/sandrocket/packages/infrastructure/package.json'`

### Cause
The workspace packages (`packages/core`, `packages/infrastructure`, `packages/contracts`) are missing from the server. This can happen if:
- Git pull didn't include the packages directory
- Packages directory was accidentally deleted
- `.gitignore` is incorrectly excluding packages

### Solution
1. **Check if packages exist on server**:
   ```bash
   ls -la /home/sandrocket/sandrocket/packages/
   ```

2. **If missing, ensure they're in git and pull**:
   ```bash
   cd /home/sandrocket/sandrocket
   git pull
   # If still missing, check git status
   git status
   git ls-files packages/
   ```

3. **If packages are not tracked, add them locally and push**:
   ```bash
   # On your local machine
   git add packages/
   git commit -m "Ensure workspace packages are tracked"
   git push
   ```

4. **Then on server, pull again**:
   ```bash
   git pull
   npm install
   ```

## Missing Dependencies After `npm install`

### Symptom
After running `npm install` on the server, workspace package dependencies like `bcryptjs`, `better-sqlite3` are missing from `node_modules/`.

### Causes
- npm version too old (workspace support improved in npm 7+)
- `package-lock.json` not up to date or missing
- Corrupted `node_modules` directory
- npm workspace hoisting not working correctly

### Solutions

1. **Check npm version**:
   ```bash
   npm --version
   ```
   Should be >= 7.0.0 (preferably >= 9.0.0). If older, upgrade npm:
   ```bash
   npm install -g npm@latest
   ```

2. **Ensure package-lock.json is present**:
   ```bash
   ls -la package-lock.json
   ```
   If missing, pull latest from git or regenerate locally and commit.

3. **Clean reinstall**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Verify workspace dependencies are installed**:
   ```bash
   npm ls bcryptjs
   npm ls better-sqlite3
   ```
   Should show them under `@sandrocket/infrastructure`.

5. **Check if dependencies are hoisted**:
   ```bash
   ls node_modules/bcryptjs
   ls node_modules/better-sqlite3
   ```
   Should exist at root level, not in `packages/infrastructure/node_modules/`.

6. **If still missing, force install**:
   ```bash
   npm install --force
   ```

7. **Verify workspace setup**:
   ```bash
   npm ls --all | grep bcryptjs
   ```
   Should show the dependency tree.

### Prevention
- Always commit `package-lock.json` to git
- Keep npm version up to date on server
- Run `npm install` from repo root (where `package.json` with `workspaces` is located)

## ESM Module Resolution Error: "Cannot find package"

### Symptom
Error like: `Cannot find package '/home/sandrocket/sandrocket/packages/infrastructure/node_modules/bcryptjs'` or `Did you mean to import bcryptjs/index.js?`

### Cause
Node.js ESM module resolution looks for packages relative to the importing file's location. In npm workspaces, dependencies are hoisted to root `node_modules/`, but ESM resolution may not find them when importing from workspace package dist files.

### Solution
1. **Ensure dependencies are installed at root**:
   ```bash
   npm install
   ls node_modules/bcryptjs  # Should exist
   ```

2. **Verify workspace hoisting**:
   ```bash
   npm ls bcryptjs
   ```
   Should show it's installed and hoisted.

3. **Clean reinstall if needed**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Check Node.js version**: Node.js 18.20+ or 20+ has better ESM workspace support.

The error typically means `bcryptjs` isn't in the root `node_modules/` directory. The error path `/home/sandrocket/sandrocket/packages/infrastructure/node_modules/bcryptjs` shows Node.js is looking in the wrong place - it should be in `/home/sandrocket/sandrocket/node_modules/bcryptjs`.

**Fix on server:**
```bash
# 1. Ensure you're in repo root
cd /home/sandrocket/sandrocket

# 2. Clean reinstall to force hoisting
rm -rf node_modules package-lock.json
npm install

# 3. Verify bcryptjs is in root node_modules
ls node_modules/bcryptjs

# 4. Verify it's hoisted (not in workspace package)
test -d packages/infrastructure/node_modules && echo "ERROR: Local node_modules exists" || echo "OK: No local node_modules"

# 5. Check npm version (should be >= 7.0.0)
npm --version

# 6. If bcryptjs IS in root node_modules but still getting errors:
#    This can happen with systemd services if WorkingDirectory is not set.
#    Solutions:
#    a) Ensure systemd service has WorkingDirectory set to repo root:
#       WorkingDirectory=/home/sandrocket/sandrocket
#    b) Ensure NO local node_modules directories exist:
rm -rf packages/*/node_modules apps/*/node_modules
#    c) The server.js now calls process.chdir() to ensure correct working directory
#    d) Verify the service is running from the correct directory:
#       Check systemd logs: journalctl -u sandrocket -n 50
#    e) **CRITICAL**: Ensure there are NO `node_modules` directories in workspace packages:
#       On server, run: find /home/sandrocket/sandrocket/packages -type d -name node_modules
#       If any exist, remove them: rm -rf packages/*/node_modules apps/*/node_modules
#    f) If still failing, this is a Node.js ESM workspace resolution bug. Workaround:
#       Create empty node_modules in workspace packages to prevent Node.js from checking there:
#       mkdir -p packages/infrastructure/node_modules
#       touch packages/infrastructure/node_modules/.gitkeep
#       (This prevents Node.js from trying to resolve from that location)
```
