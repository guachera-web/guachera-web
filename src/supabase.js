import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rnwsylkrrhmoolvtmcth.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJud3N5bGtycmhtb29sdnRtY3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTgyNDgsImV4cCI6MjA4OTMzNDI0OH0.O6iUX5HbucxvpRlPhnr5kganQyzrxPvWoE-De6a5wYE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
