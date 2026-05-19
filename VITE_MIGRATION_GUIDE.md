# Vite Migration Guide

## Overview
This project has been successfully migrated from Create React App (CRA) to Vite. Vite provides faster development server startup, instant HMR (Hot Module Replacement), and optimized production builds.

## What Changed

### 1. **package.json**
- Removed `react-scripts` dependency
- Added `vite` and `@vitejs/plugin-react` as dev dependencies
- Updated scripts:
  - `npm run dev` - Start development server (replaces `npm start`)
  - `npm run build` - Build for production (same as before)
  - `npm run preview` - Preview production build locally
- Added `"type": "module"` for ES modules support

### 2. **vite.config.js** (New)
- Created Vite configuration file
- Configured React plugin for JSX support
- Dev server runs on port 3000 with auto-open
- Build output goes to `dist/` directory

### 3. **public/index.html**
- Removed `%PUBLIC_URL%` placeholders (Vite handles this automatically)
- Added `<script type="module" src="/src/index.js"></script>` to load the app
- Updated title and meta description

### 4. **.gitignore**
- Added `/dist` (Vite build output)
- Added `.vite` (Vite cache)
- Kept existing patterns for node_modules, build, etc.

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The app will open automatically at `http://localhost:3000`

### 3. Build for Production
```bash
npm run build
```
Output will be in the `dist/` directory

### 4. Preview Production Build
```bash
npm run preview
```

## Key Differences from CRA

| Feature | CRA | Vite |
|---------|-----|------|
| Dev Server Start | ~3-5 seconds | <100ms |
| HMR | Slower | Instant |
| Build Time | Slower | Faster |
| Bundle Size | Larger | Smaller |
| Configuration | Hidden (eject required) | Transparent (vite.config.js) |

## Environment Variables

If you need environment variables, create a `.env` file in the root:

```
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=QualityPulse
```

Access them in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, Vite will automatically use the next available port.

### Module Not Found Errors
Ensure all imports use correct file extensions (`.js`, `.jsx`, `.css`, etc.)

### CSS Not Loading
Vite handles CSS imports natively. Make sure CSS files are imported in your JS files:
```javascript
import './App.css';
```

## Next Steps

1. Run `npm install` to install dependencies
2. Run `npm run dev` to start the development server
3. Test all features to ensure everything works as expected
4. Update any CI/CD pipelines to use `npm run build` instead of `react-scripts build`

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [Vite React Plugin](https://github.com/vitejs/vite-plugin-react)
- [Migration from CRA to Vite](https://vitejs.dev/guide/migration.html)
