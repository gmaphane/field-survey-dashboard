# Deployment Guide

## Deploy to GitHub Pages

### Step 1: Push to GitHub

```bash
cd /Users/gladwellmaphane/field-survey-dashboard/survey-dashboard

# Initialize git
git init
git add .
git commit -m "Initial commit: Modern survey dashboard"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/survey-dashboard.git
git branch -M main
git push -u origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: **GitHub Actions**

### Step 3: Add GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 4: Push Workflow

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Pages deployment workflow"
git push
```

Your dashboard will be live at: `https://YOUR-USERNAME.github.io/field-survey-dashboard/`

---

## Deploy to Vercel (Recommended - Easier)

### Option 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Click "Deploy"

Done! Your dashboard will be live at `https://your-project.vercel.app`

---

## Deploy to Netlify

### Option 1: Drag & Drop

1. Run `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag the `out/` folder to Netlify

### Option 2: Git Integration

1. Push code to GitHub
2. Go to Netlify → "Add new site" → "Import an existing project"
3. Connect GitHub repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `out`
5. Click "Deploy"

---

## Custom Domain

### GitHub Pages

1. Go to repository Settings → Pages
2. Add your custom domain
3. Update DNS records:
   ```
   CNAME record: www → YOUR-USERNAME.github.io
   A records:
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

### Vercel/Netlify

1. Go to project settings → Domains
2. Add custom domain
3. Follow DNS instructions provided

---

## Environment Variables (Production)

For production, you can set these in your deployment platform:

- `NEXT_PUBLIC_KOBO_SERVER` - KoBoToolbox server URL
- `NEXT_PUBLIC_FORM_ID` - Your form ID

Then update the code to use these:

```typescript
const config = {
  serverUrl: process.env.NEXT_PUBLIC_KOBO_SERVER || 'https://eu.kobotoolbox.org',
  formId: process.env.NEXT_PUBLIC_FORM_ID || 'aYaMawNU6Sssr59N46giCi',
  apiToken: '7101ae5c9f20b2a50134798b08264072c14afaff',
};
```

---

## Security Considerations

⚠️ **Important**: The API token is currently hardcoded. For production:

1. **Use a read-only token** from KoBoToolbox
2. **Or** implement backend API route to proxy requests
3. **Or** add authentication to your dashboard

### Backend API Route (Recommended)

Create `app/api/kobo/route.ts`:

```typescript
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const formId = searchParams.get('formId');

  const response = await fetch(
    `https://eu.kobotoolbox.org/api/v2/assets/${formId}/data.json`,
    {
      headers: {
        Authorization: `Token ${process.env.KOBO_API_TOKEN}`,
      },
    }
  );

  const data = await response.json();
  return Response.json(data);
}
```

Then update frontend to call `/api/kobo?formId=...` instead.

---

## Sharing with Field Teams

### Public Dashboard

Share the URL directly: `https://your-dashboard.vercel.app`

Field teams can:
- View real-time progress
- No login required (if you want)
- Works on mobile devices

### Private Dashboard

Add authentication:

1. Use [Next-Auth](https://next-auth.js.org/)
2. Or use Vercel's [Password Protection](https://vercel.com/docs/security/deployment-protection)
3. Or use basic HTTP authentication

---

## Performance Optimization

The dashboard is already optimized with:
- Static export (pre-rendered HTML)
- Code splitting
- Image optimization
- CSS purging

For additional performance:
- Enable CDN caching
- Add service worker for offline support
- Implement data caching

---

## Monitoring

### Vercel Analytics

Add to `layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Google Analytics

Add tracking ID to `layout.tsx` head section.

---

## Support

- **Build issues**: Check `npm run build` output
- **CORS errors**: Use backend proxy route
- **Map not loading**: Check internet connection
- **Data not matching**: Verify field names in KoBoToolbox

Happy deploying! 🚀
