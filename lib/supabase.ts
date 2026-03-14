import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://upiszdxygkoyoscqzvsz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhseWx4a3h5bGp4ZnFxZ2l3em9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjkzNDEsImV4cCI6MjA4OTA0NTM0MX0.5BHotYvGAEXQuuHpniDmYN5fUUSeqWtzRVNepwJqvCI.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaXN6ZHh5Z2tveW9zY3F6dnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjYyMzUsImV4cCI6MjA4OTA0MjIzNX0.yEnyIhmNDAUKgVe3NQ_0Z645qIjRykeQ4H74BbhXVag'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})