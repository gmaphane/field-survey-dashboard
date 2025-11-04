# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Dashboard

```bash
cd /Users/gladwellmaphane/field-survey-dashboard/survey-dashboard
./START.sh
```

Or manually:
```bash
npm run dev
```

The dashboard will open at **http://localhost:3000**

### Step 2: Upload Village Targets

1. Click the **"Upload CSV"** button in the top section
2. Select the file: `village-targets.csv` (in the `public/` folder)
3. Wait for "Village targets loaded successfully"

### Step 3: Connect to KoBoToolbox

1. The form is already configured:
   - Server: `https://eu.kobotoolbox.org`
   - Form ID: `aYaMawNU6Sssr59N46giCi`
   - API Token: Pre-filled

2. Click **"Connect"** button
3. Wait for data to load

**That's it!** 🎉

---

## 🎯 Features Overview

### 📊 Statistics Dashboard
- Overall progress percentage
- Completed villages count
- Total submissions
- Active districts

### 🗺️ Interactive Map
- Color-coded household locations:
  - 🟢 **Green**: 80%+ completion
  - 🟠 **Orange**: 50-79% completion
  - 🔴 **Red**: <50% completion
- Click markers to see village details
- Auto-zoom to fit data

### 🔍 Advanced Filters (Click "Filters" button)
- **Search**: Find villages or districts instantly
- **District Toggle**: Show/hide specific districts
- **Completion Range**: Slider to filter by progress (0-100%)
- **Clear All**: Reset all filters

### 📈 Village Comparison
1. Click the **+** button next to any village in the list
2. Compare up to **4 villages** side-by-side
3. View:
   - Progress comparison chart
   - Detailed statistics
   - GPS points count
   - Optimal days
4. Remove villages with the **×** button

### 📱 Responsive Design
- Works perfectly on desktop, tablet, and mobile
- Touch-friendly interface
- Collapsible sections

---

## 🎨 Using the Dashboard

### Viewing Progress

**Village List (Right Panel)**:
- Click district names to expand/collapse
- See progress bars for each village
- Green/amber/red color coding
- Optimal days displayed

**Map (Left Panel)**:
- Zoom in/out with mouse wheel
- Pan by dragging
- Click markers for details

### Filtering Data

1. Click **"Filters"** button (top right)
2. Use search to find specific villages
3. Toggle districts on/off
4. Adjust completion range sliders
5. Click "Clear all" to reset

### Comparing Villages

**Best for**:
- Comparing survey progress across villages
- Identifying underperforming areas
- Analyzing similar-sized villages
- Planning resource allocation

**Steps**:
1. Find village in the list
2. Click **+** button
3. Repeat for up to 3 more villages
4. View comparison panel at bottom
5. Analyze bar chart and statistics

### Refreshing Data

- Click **"Refresh"** button (top right)
- Data updates automatically
- New submissions appear on map
- Progress bars update

---

## 📁 File Structure

```
survey-dashboard/
├── app/
│   ├── page.tsx          # Main dashboard
│   ├── layout.tsx        # App layout
│   └── globals.css       # Global styles
├── components/
│   ├── Map.tsx           # Interactive map
│   ├── VillageList.tsx   # Village list panel
│   ├── FilterPanel.tsx   # Filters
│   ├── ComparisonPanel.tsx  # Village comparison
│   ├── StatsCard.tsx     # Statistics cards
│   └── ConfigPanel.tsx   # Configuration
├── types/
│   └── index.ts          # TypeScript types
└── public/
    └── village-targets.csv  # Sample data
```

---

## 🛠️ Customization

### Change Colors

Edit `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: "hsl(262, 83%, 58%)",  // Change this
      },
    },
  },
}
```

### Add New Filters

Edit `components/FilterPanel.tsx` and add your filter logic.

### Modify Map Appearance

Edit `components/Map.tsx`:
- Change tile layer
- Adjust marker styles
- Add custom popups

---

## 🔧 Troubleshooting

### Dashboard Won't Start

```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
npm run dev
```

### No Data Appearing

**Check**:
1. CSV file uploaded successfully?
2. KoBoToolbox connected (green "Connected" button)?
3. Form has submissions?
4. Field names match (district, village, _gps)?

**Debug**:
- Open browser console (F12)
- Look for error messages
- Check Network tab for API calls

### Map Not Showing

**Possible causes**:
- No GPS data in submissions
- Invalid coordinates
- Internet connection required for map tiles

**Fix**:
- Check console for errors
- Verify GPS field in KoBoToolbox form
- Ensure coordinates are valid (lat/lon)

### CORS Errors

The dashboard uses a CORS proxy. If it fails:

1. **Check internet connection**
2. **Try different proxy** (edit `app/page.tsx`)
3. **Run local server** (it's already running with `npm run dev`)
4. **Use browser extension** (CORS Unblock for Chrome)

### Villages Not Matching

**Common issues**:
- Spelling differences
- Extra spaces
- Case sensitivity

**Fix**:
- Match names exactly in CSV and KoBoToolbox
- Remove extra spaces
- Check district names

---

## 📱 Mobile Access

### Local Network Access

To access from mobile devices on same network:

1. Find your computer's IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Start dashboard:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```

3. Open on mobile:
   ```
   http://YOUR-IP:3000
   ```

### Deploy for Remote Access

See `DEPLOY.md` for deploying to:
- Vercel (easiest, recommended)
- Netlify
- GitHub Pages

---

## 🎓 Tips & Tricks

### Keyboard Shortcuts

- **Cmd/Ctrl + F**: Open filters
- **Esc**: Close modals
- **+/-**: Zoom map

### Performance

- Dashboard handles 1000+ GPS points smoothly
- Filters update in real-time
- Map clusters markers automatically

### Best Practices

1. **Upload CSV first** before connecting to KoBoToolbox
2. **Use filters** to focus on specific areas
3. **Compare similar villages** (similar expected samples)
4. **Refresh regularly** to see new submissions
5. **Check console** if something seems wrong

---

## 📞 Need Help?

1. Check browser console (F12) for errors
2. Review README.md for detailed docs
3. See DEPLOY.md for deployment help
4. Check CORS proxy is working

---

## 🎉 You're Ready!

Your modern survey dashboard is ready to use. Enjoy tracking your field survey progress!

**Quick Commands**:
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
./START.sh       # Quick start script
```

Happy surveying! 🗺️📊
