import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testHybrid() {
  console.log('Testing match_chunks_hybrid...')
  
  // Dummy embedding (1024 zeros)
  const dummyEmbedding = new Array(1024).fill(0)
  
  try {
    const { data, error } = await supabase.rpc('match_chunks_hybrid', {
      query_embedding: dummyEmbedding,
      query_text: 'Art. 116 LGUC',
      match_count: 5,
      filter_tipos: ['LGUC'],
      solo_vigentes: true,
      vector_weight: 0.5
    })

    if (error) {
      console.error('❌ Error calling match_chunks_hybrid:', error.message)
      if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log('💡 The RPC match_chunks_hybrid does NOT exist in the database.')
      }
    } else {
      console.log('✅ match_chunks_hybrid exists and returned:', data?.length, 'results')
    }
  } catch (e: any) {
    console.error('❌ Exception:', e.message)
  }
}

testHybrid()
