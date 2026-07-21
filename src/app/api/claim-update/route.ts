import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, dailyOrderNumber, newCustomerName, newCustomerStudentId } = body;
    
    if (!orderId || !newCustomerName || !newCustomerStudentId) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }
    
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 중복 요청 체크 (동일 주문건에 대해 대기중인 요청이 있는지)
    const { data: existing } = await supabaseAdmin
      .from('order_update_requests')
      .select('id')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .maybeSingle();
      
    if (existing) {
       return NextResponse.json({ error: '이미 처리 대기 중인 정보 수정 요청이 존재합니다.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('order_update_requests')
      .insert({
        order_id: orderId,
        daily_order_number: dailyOrderNumber,
        new_customer_name: newCustomerName,
        new_customer_student_id: newCustomerStudentId,
        ip_address: ip,
        user_agent: userAgent
      });
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Claim Update Error:', error);
    return NextResponse.json({ error: '요청 저장 중 오류가 발생했습니다. 나중에 다시 시도해주세요.' }, { status: 500 });
  }
}
