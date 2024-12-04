import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lcbjhythvgvalzeitluh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjYmpoeXRodmd2YWx6ZWl0bHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMyMTc1NDEsImV4cCI6MjA0ODc5MzU0MX0.y_kgcyz6NVjxJHF6HIb0xhzpkG_EE1FZ9kEs-Fp6_q4'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase
