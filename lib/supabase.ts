import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://upiszdxygkoyoscqzvsz.supabase.co'
const supabaseAnonKey = 'EyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaXN6ZHh5Z2tveW9zY3F6dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjYyMzUsImV4cCI6MjA4OTA0MjIzNX0.yEnyIhmNDAUKgVe3NQ_0Z645qIjRykeQ4H74BbhXVag'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})