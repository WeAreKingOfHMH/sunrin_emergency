import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { OrderItem } from '@/types';

const PAYMENT_METHOD_ALIASES: Record<string, readonly string[]> = {
  cash: ['cash'],
  account_transfer: ['account', 'account_transfer'],
  card: ['card'],
  kakaopay: ['kakaopay', 'kakao_pay'],
  naverpay: ['naverpay', 'naver_pay'],
  tosspay: ['tosspay', 'toss_pay'],
  applepay: ['applepay', 'apple_pay'],
  samsungpay: ['samsungpay', 'samsung_pay'],
};

function paymentMethodAliases(method: string): readonly string[] {
  return PAYMENT_METHOD_ALIASES[method] ?? [method];
}

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
      .in('payment_method', [...paymentMethodAliases(paymentMethod)]);

    if (error || !orders) {
      console.error('Supabase fetch error:', error);
      return NextResponse.json({ error: '입력한 정보만으로 주문을 정확히 확인하기 어렵습니다. 기억나지 않는 항목이 있다면 공식 Instagram DM으로 문의해 주세요.' }, { status: 400 });
    }

    const matchCandidates = [];

    for (const order of orders) {
      // 이미 이름이 입력된 주문 제외 (옵션) - 일단 모두 검색 대상에 포함하되, 이름이 있으면 나중에 처리할 수 있음.
      // 근데 문제 요구사항은 '누락된 3건'을 찾는 것.
      
      let score = 0;
      const orderItems: OrderItem[] = order.items || [];
      const orderTotal = order.total;

      // 1. 아이템 일치도 점수 (후발주/실수령 구분 없이 통합 비교)
      const normalizeCart = (items: any[]) => {
        const map = new Map<string, number>();
        for (const item of items) {
          const id = item.productId || item.id; // DB uses productId, user input uses id
          const key = `${id}`;
          map.set(key, (map.get(key) || 0) + item.quantity);
        }
        return map;
      };

      const allOrderItems = orderItems;
      const allInputItems = [...(receivedItems || []), ...(backorderItems || [])];

      const inputMap = normalizeCart(allInputItems);
      const orderMap = normalizeCart(allOrderItems);
      
      let isPerfectItemMatch = true;
      if (inputMap.size !== orderMap.size) isPerfectItemMatch = false;

      for (const [key, qty] of inputMap.entries()) {
        const orderQty = orderMap.get(key) || 0;
        if (orderQty === qty) {
          score += 40; // 정확히 수량까지 맞춤
        } else if (orderQty > 0) {
          score += 20; // 수량은 틀리지만 해당 상품을 사긴 삼
          isPerfectItemMatch = false;
        } else {
          score -= 10; // 아예 사지 않은 상품을 입력함
          isPerfectItemMatch = false;
        }
      }
      for (const key of orderMap.keys()) {
         if (!inputMap.has(key)) {
            // 사용자가 빼먹은 상품
            isPerfectItemMatch = false;
         }
      }

      if (isPerfectItemMatch) {
        score += 50; // 상품 목록 완전 일치 보너스
      }

      // 2. 결제 금액 점수
      if (orderTotal === Number(total)) {
        score += 50;
      } else {
        const diff = Math.abs(orderTotal - Number(total));
        if (diff <= 1000) {
          score += 20; // 약간의 오차 허용
        }
      }

      // --- 3. 보조 점수 계산 ---
      
      // 2-1. 할인/쿠폰 (30점)
      if (discount !== 'unknown') {
        const orderHasDiscount = (order.discount_amount || 0) > 0;
        if ((discount === 'yes' && orderHasDiscount) || (discount === 'no' && !orderHasDiscount)) {
          score += 30;
        }
      }

      // 2-2. 구매 시간대 (최대 30점)
      if (timeSeconds !== 'unknown') {
        const orderDate = new Date(order.created_at);
        // 서버가 UTC 환경(Vercel)이므로 KST(+9시간)로 명시적 변환하여 시/분을 추출합니다.
        const kstDate = new Date(orderDate.getTime() + 9 * 60 * 60 * 1000);
        const orderSeconds = kstDate.getUTCHours() * 3600 + kstDate.getUTCMinutes() * 60 + kstDate.getUTCSeconds();
        const targetSeconds = Number(timeSeconds);
        
        let diff = Math.abs(orderSeconds - targetSeconds);
        // 자정 경계를 넘어가는 경우 방어 (e.g. 23:55:00 vs 00:05:00)
        if (diff > 43200) diff = 86400 - diff;

        // 시간에 따른 세밀한 점수 부여를 없애고, 매우 널널하게 우선순위만 가리도록 변경
        if (diff <= 1800) score += 30;       // 30분 이내 (가장 높음)
        else if (diff <= 7200) score += 20;  // 2시간 이내
        else score += 10;                    // 그 외 (오차가 커도 감점 없음)
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

    // 50점 미만인 후보는 전부 제거 (너무 동떨어진 기록은 매칭 제외)
    const validCandidates = matchCandidates.filter(c => c.score >= 50);

    if (validCandidates.length === 0) {
      return NextResponse.json({ error: '입력한 정보와 일치하는 주문을 찾을 수 없습니다. 결제 시간 등 더 정확한 정보를 입력하시거나 전화/DM으로 문의해 주세요.' }, { status: 400 });
    }

    validCandidates.sort((a, b) => b.score - a.score);

    // 가장 점수가 높은 1등 주문을 무조건 반환 (동점자가 있어도 무조건 1등 반환)
    const bestMatch = validCandidates[0];

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
