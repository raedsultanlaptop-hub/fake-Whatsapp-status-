import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tcndcxmgploajdzuvtft.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbmRjeG1ncGxvYWpkenV2dGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODc5MjAsImV4cCI6MjEwNTA2MzkyMH0.urIThjl1ALHxc2s_HDJ3t_Stc5LzIdd0DAtUNpANIx8';

export const supabase = createClient(supabaseUrl, supabaseKey);