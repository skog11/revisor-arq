import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verify() {
  try {
    const { count, error } = await supabase
      .from('chunks')
      .select('id', { count: 'exact', head: true })
    
    if (error) throw error
    console.log('✓ Total chunks in Supabase:', count)
    
    // Check latest normas
    const { data: normas } = await supabase
      .from('normas')
      .select('numero, tipo')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (normas) {
      console.log('✓ Latest 10 normas ingested:')
      normas.forEach(n => console.log(`  - ${n.tipo}-${n.numero}`))
    }
  } catch(e: any) {
    console.error('❌ Error:', e.message)
  }
}

verify()
