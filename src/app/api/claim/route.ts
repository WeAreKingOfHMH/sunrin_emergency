import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, dailyOrderNumber, customerName, customerStudentId } = body;
    
    if (!orderId || !customerName || !customerStudentId) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }
    
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 중복 클레임 체크
    const { data: existing } = await supabaseAdmin
      .from('emergency_claims')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();
      
    if (existing) {
       return NextResponse.json({ error: '이미 본인 확인이 완료된 주문입니다.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('emergency_claims')
      .insert({
        order_id: orderId,
        daily_order_number: dailyOrderNumber,
        customer_name: customerName,
        customer_student_id: customerStudentId,
        ip_address: ip,
        user_agent: userAgent
      });
      
    if (error) throw error;
    
    // 관리자 대시보드 반영을 위해 메인 결제 테이블도 즉시 업데이트
    const { error: updateError } = await supabaseAdmin
      .from('pay_request_log')
      .update({
        customer_name: customerName,
        customer_student_id: customerStudentId
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update pay_request_log:', updateError);
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Claim Error:', error);
    return NextResponse.json({ error: '정보 저장 중 오류가 발생했습니다. 나중에 다시 시도해주세요.' }, { status: 500 });
  }
}
