import { supabaseAdmin } from '@/lib/supabase';
import Wizard from '@/components/Wizard';

export const revalidate = 60; // 1 min

export default async function Page() {
  const { data: products } = await supabaseAdmin
    .from('product')
    .select('id, name, description, images, options, price, backorder, badge')
    .eq('active', true)
    .order('name');
    
  const { data: lanes } = await supabaseAdmin
    .from('pos_lanes')
    .select('id, name')
    .eq('is_active', true);
    
  return (
    <main className="min-h-screen flex justify-center w-full bg-slate-100">
      <div className="w-full max-w-[500px] bg-white min-h-[100dvh] relative flex flex-col shadow-2xl overflow-hidden">
        <Wizard 
          products={products || []} 
          lanes={lanes || []} 
        />
      </div>
    </main>
  );
}
