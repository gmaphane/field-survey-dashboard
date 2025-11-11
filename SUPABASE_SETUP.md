# Supabase Setup for Real-Time Location Sharing

This guide will help you set up Supabase for real-time enumerator location tracking.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Choose your organization
5. Enter project details:
   - **Name:** Field Survey Tracker (or any name)
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to Botswana (e.g., South Africa - af-south-1)
6. Click **"Create new project"**
7. Wait 2-3 minutes for setup to complete

## Step 2: Create the Database Table

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy and paste this SQL:

```sql
-- Create enumerator_locations table
CREATE TABLE IF NOT EXISTS enumerator_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enumerator_code TEXT NOT NULL UNIQUE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on enumerator_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_enumerator_code
ON enumerator_locations(enumerator_code);

-- Add index on updated_at for filtering active locations
CREATE INDEX IF NOT EXISTS idx_updated_at
ON enumerator_locations(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE enumerator_locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for now)
-- In production, you should restrict this based on authentication
CREATE POLICY "Allow all operations for now"
ON enumerator_locations
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE enumerator_locations;
```

4. Click **"Run"** (or press Ctrl/Cmd + Enter)
5. You should see "Success. No rows returned"

## Step 3: Get Your API Credentials

1. Go to **Project Settings** (gear icon in left sidebar)
2. Click **API** section
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 4: Configure Your App

1. Create a `.env.local` file in the `survey-dashboard` directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

2. Replace `your_project_url_here` with your Project URL
3. Replace `your_anon_key_here` with your anon public key

**IMPORTANT:** Never commit `.env.local` to Git! It's already in `.gitignore`.

## Step 5: Verify Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Check browser console for any Supabase connection errors

## Step 6: Test Real-Time Location Sharing

1. Open dashboard in two different browser windows/tabs
2. In first window, click "Show My Location" and enter code E001
3. In second window, click "Show My Location" and enter code E002
4. You should see both markers on the map in real-time!

## Database Table Structure

```
enumerator_locations
├── id (UUID, Primary Key)
├── enumerator_code (TEXT, Unique) - e.g., "E001", "E002"
├── latitude (DOUBLE PRECISION) - GPS latitude
├── longitude (DOUBLE PRECISION) - GPS longitude
├── accuracy (DOUBLE PRECISION) - GPS accuracy in meters (optional)
├── updated_at (TIMESTAMP) - Last update time
└── created_at (TIMESTAMP) - First created time
```

## How It Works

1. **Location Updates:** When an enumerator enables "Show My Location", their position is sent to Supabase every time the GPS updates
2. **Real-Time Sync:** All connected clients subscribe to changes and receive updates instantly
3. **Auto Cleanup:** Locations older than 5 minutes are considered stale and filtered out
4. **Efficient:** Uses UPSERT to update existing location or insert new one

## Troubleshooting

### "Failed to fetch locations"
- Check your Supabase URL and API key in `.env.local`
- Verify the table was created successfully
- Check browser console for specific error messages

### "Locations not updating in real-time"
- Verify realtime is enabled: `ALTER PUBLICATION supabase_realtime ADD TABLE enumerator_locations;`
- Check RLS policies allow reads/writes
- Ensure you're using the same Supabase project in both tabs

### "CORS errors"
- Add your Vercel deployment URL to allowed URLs in Supabase:
  - Go to **Authentication** → **URL Configuration**
  - Add your production URL to **Site URL**

## Production Considerations

### Security

Currently, the RLS policy allows anyone to read/write locations. For production:

1. **Enable Authentication:**
   ```sql
   -- Remove the permissive policy
   DROP POLICY "Allow all operations for now" ON enumerator_locations;

   -- Add authenticated-only policy
   CREATE POLICY "Authenticated users can manage locations"
   ON enumerator_locations
   FOR ALL
   USING (auth.role() = 'authenticated')
   WITH CHECK (auth.role() = 'authenticated');
   ```

2. **Add User Authentication** to your app using Supabase Auth

### Monitoring

- Monitor your Supabase dashboard for:
  - Database size
  - API requests
  - Realtime connections
- Free tier limits:
  - 500 MB database
  - 2 GB bandwidth/month
  - 200,000 realtime messages/month

### Cost

- **Free tier** should be sufficient for field work with ~20 enumerators
- **Pro tier** ($25/month) if you need more capacity

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Dashboard Issues: Check browser console and Supabase logs
