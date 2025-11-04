# Field Survey Progress Dashboard

A modern, responsive dashboard for tracking field survey progress across villages and districts in real-time.

## Features

- 📊 **Real-time Progress Tracking** - Monitor survey submissions across all villages
- 🗺️ **Interactive Map** - Visualize household GPS locations with color-coded markers
- 🔍 **Advanced Filters** - Filter by district, village, completion percentage, and search
- 📈 **Village Comparison** - Compare up to 4 villages simultaneously
- 🎨 **Modern UI** - Clean, minimal design with dark mode support
- 📱 **Responsive** - Works perfectly on desktop, tablet, and mobile devices

## Tech Stack

- **Next.js 15** - React framework for production
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Modern styling
- **Leaflet** - Interactive maps
- **Recharts** - Beautiful charts
- **Lucide Icons** - Modern icon library

## Quick Start

### 1. Install Dependencies

```bash
cd survey-dashboard
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Upload Village Targets

- Click "Upload CSV" button
- Select your village targets CSV file (must include: District, Village, Optimal Sample (HH), Optimal Days)
- Data will be processed automatically

### 4. Connect to KoBoToolbox

- Server URL is pre-configured: `https://eu.kobotoolbox.org`
- Form ID is pre-filled with your form
- Click "Connect" to fetch survey data

## Features in Detail

### 📊 Statistics Cards
- Overall progress percentage
- Completed villages (80%+ completion)
- Total submissions count
- Active districts count

### 🔍 Advanced Filters
- **Search**: Find villages or districts quickly
- **District Filter**: Toggle specific districts on/off
- **Completion Range**: Slider to filter by completion percentage (0-100%)
- **Village Filter**: Select specific villages to view

### 📈 Village Comparison
- Click the "+" button next to any village to add it to comparison
- Compare up to 4 villages simultaneously
- Visual bar chart comparing progress
- Side-by-side statistics
- Remove villages with "×" button

### 🗺️ Interactive Map
- Color-coded markers:
  - 🟢 Green: 80%+ completion
  - 🟠 Orange: 50-79% completion
  - 🔴 Red: <50% completion
- Click markers to view village details
- Auto-zoom to fit all data points

## Building for Production

```bash
npm run build
```

This creates a static export in the `out/` directory.

## Deploy to GitHub Pages

1. Update `next.config.ts` with your repository name if different
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy the `out/` directory to GitHub Pages

### Automated Deployment

Add this to your repository's `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

## CSV File Format

Your village targets CSV should have these columns:

```csv
District,Village,Optimal Sample (HH),Optimal Days
Ngamiland,Toteng,89.0,3.0
Ngamiland,Sehithwa,94.0,3.0
Bobirwa,Robelela,76.0,2.0
```

## KoBoToolbox Requirements

Your form must include these fields:
- `district` or `District` - District name
- `village` or `Village` - Village name
- `_gps` or `gps` or `_geolocation` - GPS coordinates

## Environment Variables (Optional)

Create `.env.local` for custom configuration:

```env
NEXT_PUBLIC_KOBO_SERVER=https://eu.kobotoolbox.org
NEXT_PUBLIC_FORM_ID=your-form-id
```

## Troubleshooting

### Map not showing
- Ensure you have internet connection (map tiles load from OpenStreetMap)
- Check that your data has valid GPS coordinates

### No data appearing
- Verify form field names match (district, village, _gps)
- Check KoBoToolbox API token is valid
- Ensure CORS proxy is working

### Build errors
- Delete `node_modules` and `.next` folders
- Run `npm install` again
- Try `npm run build` again

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT

## Support

For issues and questions, please check the browser console for detailed error messages.
