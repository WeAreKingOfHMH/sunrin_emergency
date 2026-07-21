import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { OrderItem } from '@/types';

// In-memory rate limiting map
// Key: IP, Value: { count: number, resetAt: number, blockedUntil: number }
const rateLimitMap = new Map<string, { count: number, resetAt: number, blockedUntil: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const limitInfo = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60000, blockedUntil: 0 };
  
  if (now < limitInfo.blockedUntil) {
    return NextResponse.json({ error: '과도한 요청으로 일시적으로 차단되었습니다. 잠시 후 다시 시도해주세요.', remaining: 0 }, { status: 429 });
  }
  
  if (now > limitInfo.resetAt) {
    limitInfo.count = 0;
    limitInfo.resetAt = now + 60000;
  }
  
  limitInfo.count++;
  if (limitInfo.count > 6) {
    limitInfo.blockedUntil = now + 60000 * 3; // Block for 3 minutes
    rateLimitMap.set(ip, limitInfo);
    return NextResponse.json({ error: '과도한 요청으로 일시적으로 차단되었습니다. 3분 후 다시 시도해주세요.', remaining: 0 }, { status: 429 });
  }
  rateLimitMap.set(ip, limitInfo);

  // 일관된 응답 속도를 위한 인위적 지연 (Timing attack 방지)
  await new Promise(resolve => setTimeout(resolve, 800));

  try {
    const body = await req.json();
    const { customerName, studentId, paymentMethod, receivedItems, backorderItems, total, discount, timeSeconds } = body;

    if (!paymentMethod) {
      return NextResponse.json({ error: '결제 수단을 선택해주세요.' }, { status: 400 });
    }

    // 1. Fetch all orders matching the payment method
    const { data: orders, error } = await supabaseAdmin
      .from('pay_request_log')
      .select('id, items, total, payment_method, status, created_at, daily_order_number, discount_amount, customer_name, customer_student_id, customer_type')
      .eq('payment_method', paymentMethod);

    if (error || !orders) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: '입력한 정보만으로 주문을 정확히 확인하기 어렵습니다. 기억나지 않는 항목이 있다면 공식 Instagram DM으로 문의해 주세요.' }, { status: 400 });
    }

    const matchCandidates = [];

    for (const order of orders) {
      // 이미 이름이 입력된 주문 제외 (옵션) - 일단 모두 검색 대상에 포함하되, 이름이 있으면 나중에 처리할 수 있음.
      // 근데 문제 요구사항은 '누락된 3건'을 찾는 것.
      
      let score = 0;
      let isRequiredMatched = true;

      const orderItems: OrderItem[] = order.items || [];
      const orderTotal = order.total;

      // 1-1. 금액 필수 검증
      if (orderTotal !== Number(total)) {
        isRequiredMatched = false;
        continue;
      }

      // 1-2. 실수령/후발주 분리
      const orderReceivedItems = orderItems.filter(i => !i.backorder);
      const orderBackorderItems = orderItems.filter(i => i.backorder);

      // 1-3. 상품 일치 여부 헬퍼 (옵션 무시, 상품 종류와 총 수량만 일치하면 됨)
      const normalizeCart = (items: any[]) => {
        const map = new Map<string, number>();
        for (const item of items) {
          const id = item.productId || item.id; // DB uses productId, user input uses id
          const key = `${id}`;
          map.set(key, (map.get(key) || 0) + item.quantity);
        }
        return map;
      };

      const isItemsExactMatch = (targetItems: any[], sourceItems: any[]) => {
        const targetMap = normalizeCart(targetItems);
        const sourceMap = normalizeCart(sourceItems);
        
        if (targetMap.size !== sourceMap.size) return false;
        
        for (const [key, qty] of targetMap.entries()) {
          if (sourceMap.get(key) !== qty) return false;
        }
        return true;
      };

      if (!isItemsExactMatch(receivedItems || [], orderReceivedItems)) isRequiredMatched = false;
      if (!isItemsExactMatch(backorderItems || [], orderBackorderItems)) isRequiredMatched = false;

      if (!isRequiredMatched) continue;

      // --- 필수 조건 모두 일치. 보조 점수 계산 ---
      
      // 2-1. 할인/쿠폰 (30점)
      if (discount !== 'unknown') {
        const orderHasDiscount = (order.discount_amount || 0) > 0;
        if ((discount === 'yes' && orderHasDiscount) || (discount === 'no' && !orderHasDiscount)) {
          score += 30;
        }
      }

      // 2-2. 구매 시간대 (최대 50점)
      if (timeSeconds !== 'unknown') {
        const orderDate = new Date(order.created_at);
        // 서버가 UTC 환경(Vercel)이므로 KST(+9시간)로 명시적 변환하여 시/분을 추출합니다.
        const kstDate = new Date(orderDate.getTime() + 9 * 60 * 60 * 1000);
        const orderSeconds = kstDate.getUTCHours() * 3600 + kstDate.getUTCMinutes() * 60 + kstDate.getUTCSeconds();
        const targetSeconds = Number(timeSeconds);
        
        let diff = Math.abs(orderSeconds - targetSeconds);
        // 자정 경계를 넘어가는 경우 방어 (e.g. 23:55:00 vs 00:05:00)
        if (diff > 43200) diff = 86400 - diff;

        // 시간에 따른 세밀한 점수 부여 (가까울수록 더 높은 점수)
        if (diff <= 60) score += 50;       // 1분 이내 (가장 높음)
        else if (diff <= 180) score += 40; // 3분 이내
        else if (diff <= 300) score += 30; // 5분 이내
        else if (diff <= 600) score += 20; // 10분 이내
        else if (diff <= 1800) score += 10; // 30분 이내
      }

      // 2-3. 이름/학번 기반 보너스 점수 (최대 30점)
      if (order.customer_type === 'staff') {
        // 교직원: 학번은 무시, 이름만 비교
        if (customerName && order.customer_name && order.customer_name.includes(customerName)) {
          score += 20;
        }
      } else {
        // 학생 (기본값): 이름 및 학번 비교
        if (customerName && order.customer_name && order.customer_name.includes(customerName)) {
          score += 15;
        }
        if (studentId && order.customer_student_id && order.customer_student_id === studentId) {
          score += 15;
        }
      }

      matchCandidates.push({ order, score });
    }

    if (matchCandidates.length === 0) {
      return NextResponse.json({ error: '입력한 정보만으로 주문을 정확히 확인하기 어렵습니다. 기억나지 않는 항목이 있다면 공식 Instagram DM으로 문의해 주세요.' }, { status: 400 });
    }

    matchCandidates.sort((a, b) => b.score - a.score);

    const bestMatch = matchCandidates[0];
    const secondBest = matchCandidates[1];

    // 조회 성공 조건
    const isUniqueInDb = matchCandidates.length === 1;

    // 1. 후보가 2개 이상이고, 1위와 2위의 점수 차이가 20점 미만이면 특정 불가 (동시간대 유사 주문)
    if (secondBest && (bestMatch.score - secondBest.score < 20)) {
      return NextResponse.json({ error: '입력한 정보만으로 주문을 정확히 확인하기 어렵습니다. 동시간대 유사한 주문이 있습니다. 공식 Instagram DM으로 문의해 주세요.' }, { status: 400 });
    }

    const totalItemCount = (receivedItems?.reduce((a: number, c: any) => a + c.quantity, 0) || 0) + (backorderItems?.reduce((a: number, c: any) => a + c.quantity, 0) || 0);
    
    // 2. 단일 상품 결제의 경우, 데이터베이스에 동일한 조건의 주문이 여러 개 있다면 시간대 정보가 매우 정확해야 함
    if (totalItemCount === 1 && !isUniqueInDb) {
      if (timeSeconds === 'unknown' || bestMatch.score < 50) {
         return NextResponse.json({ error: '입력한 정보와 일치하는 다수의 주문이 존재합니다. 본인의 주문을 특정하기 위해 구매 시각을 더 정확히(1분 이내 오차) 입력해주세요.' }, { status: 400 });
      }
    }

    // 3. DB에 유일한 주문(isUniqueInDb)이라면, 시간대를 틀리거나 모르더라도 바로 통과시켜줌!
    //    유일하지 않다면 최소한의 보조 점수(30점 이상)는 요구 (너무 엉뚱한 주문 방지)
    if (!isUniqueInDb && bestMatch.score < 30) {
      return NextResponse.json({ error: '입력한 정보만으로 주문을 정확히 확인하기 어렵습니다. 기억나지 않는 항목이 있다면 공식 Instagram DM으로 문의해 주세요.' }, { status: 400 });
    }

    // 성공! order 정보를 반환
    const { id, items, total: ordTotal, payment_method, status, created_at, daily_order_number, discount_amount, customer_name, customer_student_id } = bestMatch.order;

    // Record into emergency_claims
    const userAgent = req.headers.get('user-agent') || 'unknown';
    try {
      await supabaseAdmin
        .from('emergency_claims')
        .insert({
          order_id: id,
          daily_order_number: daily_order_number,
          customer_name: customerName || '미입력',
          customer_student_id: studentId || '미입력',
          ip_address: ip,
          user_agent: userAgent
        });
    } catch (e) {
      console.error('Failed to log to emergency_claims:', e);
    }

    return NextResponse.json({
      success: true,
      order: {
        id,
        items,
        total: ordTotal,
        paymentMethod: payment_method,
        status,
        createdAt: created_at,
        dailyOrderNumber: daily_order_number,
        discountAmount: discount_amount,
        customerName: customer_name,
        customerStudentId: customer_student_id
      }
    });

  } catch (error) {
    console.error('Match API Error:', error);
    // 보안상 모호한 에러 메시지 반환
    return NextResponse.json({ error: '입력한 정보만으로 주문을 정확히 확인하기 어렵습니다. 기억나지 않는 항목이 있다면 공식 Instagram DM으로 문의해 주세요.' }, { status: 400 });
  }
}
