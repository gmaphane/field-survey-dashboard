import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Get these values from your Supabase project settings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for location data
export interface EnumeratorLocation {
  id?: string;
  enumerator_code: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  updated_at: string;
  color?: string;
}

// Location service functions
export class LocationService {
  /**
   * Update enumerator's current location
   */
  static async updateLocation(
    enumeratorCode: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<void> {
    const { error } = await supabase
      .from('enumerator_locations')
      .upsert(
        {
          enumerator_code: enumeratorCode,
          latitude,
          longitude,
          accuracy,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'enumerator_code',
        }
      );

    if (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  /**
   * Get all active enumerator locations
   * Returns locations updated within the last 5 minutes
   */
  static async getActiveLocations(): Promise<EnumeratorLocation[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('enumerator_locations')
      .select('*')
      .gte('updated_at', fiveMinutesAgo)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching locations:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Subscribe to real-time location updates
   * Callback is called whenever any enumerator's location changes
   */
  static subscribeToLocations(
    callback: (locations: EnumeratorLocation[]) => void
  ) {
    // Initial fetch
    this.getActiveLocations().then(callback);

    // Subscribe to real-time changes
    const channel = supabase
      .channel('enumerator_locations_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'enumerator_locations',
        },
        async () => {
          // Fetch updated list whenever there's a change
          const locations = await this.getActiveLocations();
          callback(locations);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Remove enumerator's location (when they turn off tracking)
   */
  static async removeLocation(enumeratorCode: string): Promise<void> {
    const { error } = await supabase
      .from('enumerator_locations')
      .delete()
      .eq('enumerator_code', enumeratorCode);

    if (error) {
      console.error('Error removing location:', error);
    }
  }

  /**
   * Clean up stale locations (older than 5 minutes)
   * Should be called periodically
   */
  static async cleanupStaleLocations(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('enumerator_locations')
      .delete()
      .lt('updated_at', fiveMinutesAgo);

    if (error) {
      console.error('Error cleaning up stale locations:', error);
    }
  }
}
