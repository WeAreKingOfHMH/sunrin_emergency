'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ExternalLink, Home, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstagramIcon = ({ size = 24, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export default function Receipt({ onUpdateClick }: { onUpdateClick?: () => void }) {
  const store = useStore();
  const order = store.matchedOrder;

  if (!order) return null;

  const orderDate = new Date(order.createdAt);
  const formattedDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')} ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`;
  const orderNumber = order.dailyOrderNumber != null ? `S-${String(order.dailyOrderNumber).padStart(3, '0')}` : order.id.substring(0, 8);
  const originalTotal = order.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
  const discountAmount = originalTotal - order.total;

  const handleUpdateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onUpdateClick?.();
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 flex flex-col items-center pt-8 pb-8 px-5 custom-scrollbar">

      {/* Warning Session Title */}
      <div className="w-full max-w-[400px] mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-center shadow-sm">
        <p className="text-[15px] font-black text-indigo-700 mb-1 leading-tight break-keep flex items-center justify-center gap-2">
          <AlertTriangle size={18} />
          누락된 정보가 확인되었습니다!
        </p>
        <p className="text-xs font-bold text-indigo-500 leading-tight">
          아래 버튼을 눌러 수정을 진행해주세요.
        </p>
      </div>

      {/* Receipt Paper */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-[400px] bg-[#fdfdfd] relative font-mono text-slate-800 flex flex-col shadow-xl mb-8"
        style={{
          padding: '2rem 1.5rem',
          backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.02) 0%, transparent 5%, transparent 95%, rgba(0,0,0,0.02) 100%)'
        }}
      >
        {/* Zigzag Top */}
        <div className="absolute -top-[10px] left-0 right-0 h-[10px]" style={{
          backgroundImage: 'linear-gradient(135deg, transparent 50%, #fdfdfd 50%), linear-gradient(-135deg, transparent 50%, #fdfdfd 50%)',
          backgroundSize: '20px 10px', backgroundRepeat: 'repeat-x', backgroundPosition: 'top left'
        }} />

        {/* External Link */}
        <a 
          href={`https://sunrincatkiosk.vercel.app/receipt/${order.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-4 right-4 text-slate-400 hover:text-indigo-500 transition-colors p-2"
          title="원본 영수증 보기"
        >
          <ExternalLink size={20} />
        </a>

        {/* Content */}
        <div className="text-center mb-6 pt-2">
          <h2 className="text-3xl font-black tracking-widest text-slate-900 mb-2">SUNRIN CAT</h2>
          <div className="text-[11px] text-slate-500 flex flex-col font-medium leading-tight">
            <p>서울시 용산구 원효로97길 33-4</p>
            <p>Nyanyanyanyanyanyanya!</p>
          </div>
        </div>

        <div className="border-b-[1.5px] border-dashed border-slate-400/60 mb-4" />

        <div className="text-xs font-semibold text-slate-700 mb-4 flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span>주문번호:</span><span className="text-slate-900 font-bold">{orderNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>거래일시:</span><span>{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>결제상태:</span>
            <span className="text-green-600">결제 완료</span>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
            <span>이름:</span>
            <span className="font-bold text-slate-900">
              {order.customer_name === undefined ? '새로고침 필요' : (order.customer_name || '기록 없음')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>학번:</span>
            <span className="font-bold text-slate-900">
              {order.customer_student_id === undefined ? '새로고침 필요' : (order.customer_student_id || '기록 없음')}
            </span>
          </div>
        </div>

        <div className="border-b-[1.5px] border-dashed border-slate-400/60 mb-4" />

        <div className="flex text-[11px] font-bold text-slate-500 mb-2 pb-2 border-b-[1.5px] border-solid border-slate-300">
          <div className="flex-1">상품명/옵션</div>
          <div className="w-8 text-center">수량</div>
          <div className="w-16 text-right">금액</div>
        </div>

        <div className="flex flex-col gap-3 pb-2 mb-4 border-b-[1.5px] border-dashed border-slate-400/60">
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="flex text-xs font-bold text-slate-800 items-start">
              <div className="flex-1 pr-2">
                <div className="leading-tight flex items-center flex-wrap">
                  {item.productName}
                  {item.backorder && <span className="ml-1 px-1 bg-slate-100 text-slate-500 text-[9px] rounded-sm border border-slate-200">후발주</span>}
                </div>
                {item.optionName && <div className="text-[10px] text-slate-500 mt-0.5">└ {item.optionName}</div>}
              </div>
              <div className="w-8 text-center">{item.quantity}</div>
              <div className="w-16 text-right tracking-tighter">{(item.price * item.quantity).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 mb-6">
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>상품 금액</span><span>{originalTotal.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-xs font-black text-red-500">
                <span>할인 금액</span><span>-{discountAmount.toLocaleString()}원</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-end font-black text-slate-900 mt-1">
            <span className="text-base">합계 금액</span>
            <span className="text-2xl tracking-tighter">{order.total.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-600 mt-1">
            <span>결제 수단</span><span>현금 결제</span>
          </div>
        </div>

        {/* Barcode */}
        <div className="h-[35px] w-[90%] mx-auto opacity-80" style={{
          backgroundImage: 'repeating-linear-gradient(to right, #1e293b 0, #1e293b 2px, transparent 2px, transparent 5px), repeating-linear-gradient(to right, #1e293b 0, #1e293b 1px, transparent 1px, transparent 3px), repeating-linear-gradient(to right, transparent 0, transparent 4px, #1e293b 4px, #1e293b 7px)',
          backgroundSize: '33px 100%, 17px 100%, 41px 100%'
        }} />

        {/* Zigzag Bottom */}
        <div className="absolute -bottom-[10px] left-0 right-0 h-[10px]" style={{
          backgroundImage: 'linear-gradient(45deg, transparent 50%, #fdfdfd 50%), linear-gradient(-45deg, transparent 50%, #fdfdfd 50%)',
          backgroundSize: '20px 10px', backgroundRepeat: 'repeat-x', backgroundPosition: 'bottom left'
        }} />
      </motion.div>

      {/* Update Info Action */}
      <div className="w-full max-w-[400px] flex flex-col gap-3 mt-auto">
        <button
          onClick={handleUpdateClick}
          className="w-full py-4 bg-indigo-600 text-white text-[15px] font-black rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition active:scale-95 shadow-md mb-1"
        >
          정보 수정하기 <ChevronRight size={18} className="ml-1" />
        </button>

        <a href="https://www.instagram.com/sunrin_cat/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors group shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
              <InstagramIcon size={20} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-slate-800 text-[13px]">Instagram DM 문의하기</span>
              <span className="text-[11px] text-slate-500 font-medium">주문 정보가 다르거나 궁금한 점이 있다면?</span>
            </div>
          </div>
          <ChevronRight className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={20} />
        </a>

        <button onClick={() => window.location.reload()} className="w-full py-4 mt-2 bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl flex items-center justify-center hover:bg-slate-300 transition active:scale-95 shadow-sm">
          처음으로 돌아가기 <Home size={16} className="ml-2" />
        </button>
      </div>
    </div>
  );
}
