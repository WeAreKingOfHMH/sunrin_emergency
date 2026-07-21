'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useStore, SelectedItem } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Plus, Minus, AlertCircle, Info, X, AlertTriangle, Phone } from 'lucide-react';
import Receipt from './Receipt';
import UpdateInfoForm from './UpdateInfoForm';
import ProductSelectionModal from './ProductSelectionModal';

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0
  })
};

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

export default function Wizard({ products, lanes }: { products: any[], lanes: any[] }) {
  const store = useStore();
  
  const [isMounted, setIsMounted] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [[page, direction], setPage] = useState([0, 0]);

  useEffect(() => {
    setIsMounted(true);
    
    let recoveredStep = 0;
    try {
      const stored = localStorage.getItem('kiosk-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.step) {
          recoveredStep = parsed.state.step;
        }
      }
    } catch (e) {
      // Ignore parse error
    }

    if (recoveredStep > 0 && recoveredStep < 10) {
      setShowRecoveryModal(true);
    } else {
      setPage([recoveredStep, 0]);
    }
  }, []);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeProductForModal, setActiveProductForModal] = useState<any | null>(null);

  const [showMatchWarningModal, setShowMatchWarningModal] = useState(false);
  const [matchTimeLeft, setMatchTimeLeft] = useState(3);

  const [showReceivedConfirmModal, setShowReceivedConfirmModal] = useState(false);

  useEffect(() => {
    if (!showMatchWarningModal) return;
    if (matchTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setMatchTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [showMatchWarningModal, matchTimeLeft]);

  const nextStep = () => {
    setErrorMsg('');
    setPage([store.step + 1, 1]);
    store.setStep(store.step + 1);
  };

  const prevStep = () => {
    setErrorMsg('');
    setPage([store.step - 1, -1]);
    store.setStep(store.step - 1);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const timeParts = store.purchaseTime.split(':');
      const timeSeconds = store.purchaseTime && store.purchaseTime !== 'unknown'
        ? parseInt(timeParts[0] || '0') * 3600 + parseInt(timeParts[1] || '0') * 60 + parseInt(timeParts[2] || '0')
        : 'unknown';

      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: store.paymentMethod,
          customerName: store.customerName,
          studentId: store.studentId,
          receivedItems: store.receivedItems,
          backorderItems: store.backorderItems,
          total: Number(store.totalAmount),
          discount: store.hasDiscount,
          timeSeconds
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || '오류가 발생했습니다.');
        return;
      }

      store.setMatchedOrder(data.order);
      setPage([10, 1]);
      store.setStep(10);

    } catch (err) {
      setErrorMsg('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (page) {
      case 0:
        return (
          <div className="flex flex-col h-full p-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-10 mb-6">주문 정보 확인</h1>
            <p className="text-slate-600 text-lg leading-relaxed mb-4">
              7월 20일 운영한 선린냥이 × HMH 키오스크에서 일부 후발주 주문의 구매자 정보가 저장되지 않는 문제가 발생했습니다. 이용에 불편을 드려 진심으로 사과드립니다.
              후발주 상품 지급을 위해 번거로우시겠지만 구매자 정보를 다시 한 번 기입해 주시면 감사하겠습니다. 불편을 끼쳐드린 점 다시 한번 죄송합니다.
            </p>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-4">
              <p className="text-indigo-900 font-medium text-sm flex items-start">
                <Info className="mr-2 shrink-0 mt-0.5 text-indigo-500" size={18} />
                <span>해당 주문을 확인하기 위해 기억나는 결제 정보를 꼼꼼히 입력해 주세요.</span>
              </p>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              <a href="https://www.instagram.com/sunrin_cat/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center">
                    <InstagramIcon size={20} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-900 text-sm">Instagram DM 문의하기</span>
                    <span className="text-xs text-slate-500 font-medium">@sunrin_cat</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-400 group-hover:text-slate-600 transition-colors" size={20} />
              </a>

              <a href="tel:010-6234-2874" className="flex items-center justify-between w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center">
                    <Phone size={20} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-900 text-sm">전화로 문의하기</span>
                    <span className="text-xs text-slate-500 font-medium">010-6234-2874</span>
                  </div>
                </div>
                <ChevronRight className="text-slate-400 group-hover:text-slate-600 transition-colors" size={20} />
              </a>
            </div>
            <div className="mt-auto">
              <button onClick={nextStep} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition active:scale-95 shadow-md">
                주문 확인 시작하기
              </button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col h-full p-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-10 mb-1">본인 확인</h2>
            <p className="text-slate-500 text-md mb-12 leading-relaxed">
              원활한 조회를 위해 본인의 정보를 기재해주세요.
            </p>
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-400">이름</span>
                <input
                  type="text"
                  value={store.customerName}
                  onChange={(e) => store.setCustomerName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full text-3xl font-black text-slate-900 border-b-2 border-slate-200 focus:border-indigo-600 outline-none pb-2 bg-transparent transition-colors placeholder-slate-300"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-400">학번</span>
                <input
                  type="text"
                  value={store.studentId}
                  onChange={(e) => store.setStudentId(e.target.value)}
                  placeholder="예: 10101"
                  className="w-full text-3xl font-black text-slate-900 border-b-2 border-slate-200 focus:border-indigo-600 outline-none pb-2 bg-transparent transition-colors placeholder-slate-300"
                />
              </div>
            </div>
            <div className="mt-auto pt-8 flex gap-3">
              <button onClick={prevStep} className="bg-slate-100 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-200 transition">이전</button>
              <button onClick={nextStep} disabled={!store.customerName || !store.studentId} className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 hover:bg-indigo-700 transition active:scale-95 shadow-md">다음</button>
            </div>
          </div>
        );

      case 2:
        const paymentMethods = [
          { id: 'cash', label: '현금' },
          { id: 'account_transfer', label: '계좌이체' },
          { id: 'card', label: '카드' },
          { id: 'kakaopay', label: '카카오페이' },
          { id: 'naverpay', label: '네이버페이' },
          { id: 'tosspay', label: '토스페이' },
          { id: 'applepay', label: '애플페이' },
          { id: 'samsungpay', label: '삼성페이' },
        ];

        return (
          <div className="flex flex-col h-full p-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-10 mb-8">결제 수단을 선택해주세요</h2>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pb-2" style={{ maxHeight: '60vh' }}>
              {paymentMethods.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => { store.setPaymentMethod(pm.id); nextStep(); }}
                  className={`py-4 px-2 rounded-2xl font-bold border-2 text-center transition-all ${store.paymentMethod === pm.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:border-indigo-200 text-slate-700'}`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
            <div className="mt-auto pt-8">
              <button onClick={prevStep} className="w-full bg-slate-100 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-200 transition">이전</button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col h-full p-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-10 mb-8">결제 내역에 후발주 상품이 있었나요?</h2>
            <div className="flex flex-col gap-3">
              {['yes', 'no', 'unknown'].map((val) => (
                <button
                  key={val}
                  onClick={() => { store.setHasBackorder(val as any); nextStep(); }}
                  className={`py-4 px-6 rounded-2xl font-bold border-2 text-left transition-all ${store.hasBackorder === val ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:border-indigo-200 text-slate-700'}`}
                >
                  {val === 'yes' ? '예' : val === 'no' ? '아니요' : '기억나지 않음'}
                </button>
              ))}
            </div>
            {store.hasBackorder === 'no' && (
              <div className="mt-4 text-sm text-slate-500 flex items-start gap-2 bg-slate-50 p-4 rounded-xl">
                <Info size={16} className="shrink-0 text-slate-400 mt-0.5" />
                <p>누락된 주문은 후발주 주문입니다. 해당 사항이 없으시면 조회되지 않을 가능성이 높습니다.</p>
              </div>
            )}
            <div className="mt-auto pt-8">
              <button onClick={prevStep} className="w-full bg-slate-100 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-200 transition">이전</button>
            </div>
          </div>
        );

      case 4:
      case 5:
        const isReceived = store.step === 4;
        const currentItems = isReceived ? store.receivedItems : store.backorderItems;
        const setCurrentItems = isReceived ? store.setReceivedItems : store.setBackorderItems;

        const updateQty = (item: any, delta: number) => {
          const existing = currentItems.find(i => i.id === item.id && i.optionName === item.optionName);
          let newItems = [...currentItems];
          if (existing) {
            existing.quantity += delta;
            if (existing.quantity <= 0) {
              newItems = newItems.filter(i => !(i.id === item.id && i.optionName === item.optionName));
            }
          } else if (delta > 0) {
            newItems.push({ ...item, quantity: 1 });
          }
          setCurrentItems(newItems);
        };

        const handleAddFromModal = (newItems: any[]) => {
          if (newItems.length === 0) return;
          const productId = newItems[0].id;

          let updatedItems = currentItems.filter(i => i.id !== productId);
          newItems.forEach(newItem => {
            if (newItem.quantity > 0) {
              updatedItems.push(newItem);
            }
          });
          setCurrentItems(updatedItems);
        };

        const totalQty = currentItems.reduce((acc, curr) => acc + curr.quantity, 0);

        return (
          <div className="flex flex-col h-full bg-slate-50">
            <div className="p-6 pb-4 bg-white border-b border-slate-100 z-10">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2 mb-1">
                {isReceived ? '현장에서 실수령한 상품' : '나중에 받기로 한 후발주 상품'}
              </h2>
              <p className="text-slate-500 text-md">
                {isReceived ? '결제 당일 바로 받아간 상품을 모두 선택해주세요.' : '나중에 배송/수령하기로 한 상품을 모두 선택해주세요.'}
              </p>
            </div>

            {/* Selected Items Summary Removed */}

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-3 pb-6">
                {products.map(p => {
                  const image = p.images && p.images.length > 0 ? p.images[0] : '';
                  const productSelections = currentItems.filter(i => i.id === p.id);
                  const qtySum = productSelections.reduce((sum, i) => sum + i.quantity, 0);

                  return (
                    <div key={p.id} className="relative h-full">
                      <button
                        onClick={() => setActiveProductForModal(p)}
                        className="w-full h-full flex flex-col bg-white border border-slate-200 rounded-2xl p-3 items-center hover:border-indigo-400 hover:shadow-md transition-all shadow-sm group"
                      >
                        <div className="w-full h-28 bg-slate-50 rounded-xl mb-3 flex items-center justify-center p-2 group-hover:bg-indigo-50 transition-colors">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt="" className="object-contain w-full h-full mix-blend-multiply drop-shadow-sm" />
                          ) : (
                            <span className="text-xs text-slate-400 font-bold">이미지 없음</span>
                          )}
                        </div>
                        <div className="font-extrabold text-[13px] text-slate-800 text-center w-full truncate mb-1 px-1">{p.name}</div>
                        <div className="text-[13px] font-black text-indigo-600">{p.price.toLocaleString()}원</div>
                      </button>

                      {qtySum > 0 && (
                        <div className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center pointer-events-none shadow-inner p-2">
                          <div className="flex flex-col items-center overflow-y-auto custom-scrollbar w-full mb-2" style={{ maxHeight: 'calc(100% - 50px)' }}>
                            {productSelections.map((sel, i) => (
                              <div key={i} className="text-white text-[11px] font-bold text-center leading-tight mb-1 bg-black/40 px-2 py-0.5 rounded-md w-full truncate">
                                {sel.optionName || '기본'} <span className="text-indigo-300 ml-1">x{sel.quantity}</span>
                              </div>
                            ))}
                          </div>

                          <button
                            className="w-10 h-10 shrink-0 bg-white/95 rounded-full flex items-center justify-center text-red-500 shadow-xl hover:scale-110 active:scale-95 transition-transform border border-slate-200 pointer-events-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentItems(currentItems.filter(i => i.id !== p.id));
                            }}
                          >
                            <X size={20} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white">
              <button onClick={() => { setCurrentItems([]); nextStep(); }} className="w-full bg-slate-100 text-slate-600 font-bold py-3 mb-3 rounded-xl text-sm hover:bg-slate-200 transition">
                {isReceived ? '실수령한 상품 없음' : '후발주 상품 없음'}
              </button>
              <div className="flex gap-3">
                <button onClick={prevStep} className="bg-slate-100 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-200 transition">이전</button>
                <button
                  onClick={() => {
                    if (isReceived) {
                      setShowReceivedConfirmModal(true);
                    } else {
                      nextStep();
                    }
                  }}
                  disabled={totalQty === 0}
                  className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 disabled:active:scale-100 hover:bg-indigo-700 transition active:scale-95 shadow-md flex justify-center items-center gap-2"
                >
                  {totalQty}개 선택 완료
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showReceivedConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl overflow-hidden flex flex-col items-center text-center"
                  >
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-5 mt-2">
                      <AlertTriangle className="text-yellow-500" size={32} />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-2">잠깐만요!</h3>
                    <p className="text-slate-600 text-[15px] leading-relaxed mb-8 break-keep">
                      현재 선택하신 상품은 <span className="font-bold text-indigo-600">현장에서 실수령한 상품</span>입니다. <br />
                      나중에 받을 <span className="font-bold text-red-500">후발주 상품</span>이 실수로 섞여있지 않은지 다시 한 번 확인해주세요!
                    </p>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setShowReceivedConfirmModal(false)}
                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                      >
                        다시 확인
                      </button>
                      <button
                        onClick={() => {
                          setShowReceivedConfirmModal(false);
                          nextStep();
                        }}
                        className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
                      >
                        맞게 선택함
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <ProductSelectionModal
              product={activeProductForModal}
              isOpen={!!activeProductForModal}
              onClose={() => setActiveProductForModal(null)}
              onAdd={handleAddFromModal}
              initialSelections={activeProductForModal ? currentItems.filter(i => i.id === activeProductForModal.id) : []}
            />
          </div>
        );

      case 6:
        return (
          <div className="flex flex-col h-full p-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-10 mb-4">최종 결제 금액을 입력해주세요.</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              할인이나 쿠폰이 적용되었다면 <strong>할인 적용 후 실제로 결제하신 현금 금액</strong>을 입력해주세요.
            </p>
            <div className="relative">
              <input
                type="number"
                value={store.totalAmount}
                onChange={(e) => store.setTotalAmount(e.target.value)}
                placeholder="예: 15000"
                className="w-full text-3xl font-black text-slate-900 border-b-2 border-slate-200 focus:border-indigo-600 outline-none pb-2 bg-transparent transition-colors placeholder-slate-300"
                autoFocus
              />
              <span className="absolute right-0 bottom-3 text-xl font-bold text-slate-400">원</span>
            </div>
            <div className="mt-auto pt-8 flex gap-3">
              <button onClick={prevStep} className="bg-slate-100 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-200 transition">이전</button>
              <button onClick={nextStep} disabled={!store.totalAmount || Number(store.totalAmount) < 0} className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 disabled:active:scale-100 hover:bg-indigo-700 transition active:scale-95 shadow-md">다음</button>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="flex flex-col h-full p-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-10 mb-4">할인이나 쿠폰을 사용하셨나요?</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed break-keep font-medium">
              1학년 또는 교사, 선린냥이지기 협력 동아리는 <strong className="text-indigo-500">5%</strong>의 할인이 적용되며, 선린냥이지기는 <strong className="text-indigo-500">10%</strong>의 할인이 적용됩니다.
            </p>
            <div className="flex flex-col gap-3">
              {['yes', 'no', 'unknown'].map((val) => (
                <button
                  key={val}
                  onClick={() => { store.setHasDiscount(val as any); nextStep(); }}
                  className={`py-4 px-6 rounded-2xl font-bold border-2 text-left transition-all ${store.hasDiscount === val ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:border-indigo-200 text-slate-700'}`}
                >
                  {val === 'yes' ? '사용함' : val === 'no' ? '사용하지 않음' : '기억나지 않음'}
                </button>
              ))}
            </div>
            <div className="mt-auto pt-8">
              <button onClick={prevStep} className="w-full bg-slate-100 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-200 transition">이전</button>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="flex flex-col h-full p-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-10 mb-4">구매 시간대를 선택해주세요.</h2>
            <p className="text-slate-500 text-sm mb-4 leading-relaxed">
              당시 결제가 진행된 시간은 대략 오후 12시부터 1시 사이입니다.<br />
              기억나는 대략적인 시각을 선택해주세요. (±10분 오차 허용)
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
              {[
                '12:00', '12:10', '12:20', '12:30', '12:40', '12:50', '13:00'
              ].map((time) => (
                <button
                  key={time}
                  onClick={() => { store.setPurchaseTime(time); nextStep(); }}
                  className={`py-3 px-4 rounded-xl font-bold border-2 transition-all ${store.purchaseTime === time ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:border-indigo-200 text-slate-700'}`}
                >
                  {time}
                </button>
              ))}
            </div>

            <div className="mb-6 pt-5 border-t border-slate-200">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-bold text-slate-500 block">더 정확한 시간 직접 입력</span>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">초 단위 입력 가능 (선택)</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-white rounded-xl border-2 border-slate-200 overflow-hidden focus-within:border-indigo-600 transition-all">
                  <input
                    type="time"
                    step="1"
                    value={store.purchaseTime !== 'unknown' ? store.purchaseTime : ''}
                    onChange={(e) => store.setPurchaseTime(e.target.value)}
                    className="w-full text-center text-lg font-black py-3 bg-transparent text-slate-800 outline-none"
                  />
                </div>
                <button
                  onClick={() => { if (store.purchaseTime && store.purchaseTime !== 'unknown') nextStep(); }}
                  disabled={!store.purchaseTime || store.purchaseTime === 'unknown'}
                  className="bg-indigo-600 text-white font-bold py-3 px-5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  입력
                </button>
              </div>
            </div>

            <button
              onClick={() => { store.setPurchaseTime('unknown'); nextStep(); }}
              className={`py-4 px-6 rounded-2xl font-bold border-2 text-center transition-all ${store.purchaseTime === 'unknown' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:border-indigo-200 text-slate-700'}`}
            >
              시간이 전혀 기억나지 않습니다.
            </button>
            <div className="mt-auto pt-8">
              <button onClick={prevStep} className="w-full bg-slate-100 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-200 transition">이전</button>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="flex flex-col h-full p-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-6 mb-6">입력 정보 확인</h2>

            <div className="flex-1 overflow-y-auto custom-scrollbar mb-6 bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <dl className="text-sm space-y-4">
                <div>
                  <dt className="text-slate-500 font-semibold mb-1">결제 금액</dt>
                  <dd className="font-black text-indigo-700 text-lg">{Number(store.totalAmount).toLocaleString()}원</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-semibold mb-1">선택한 상품 총 {store.receivedItems.length + store.backorderItems.length}종</dt>
                  <dd className="text-slate-800 font-medium">
                    {store.receivedItems.map(i => `${i.name}${i.optionName ? `(${i.optionName})` : ''} x${i.quantity}`).join(', ')}
                    {store.receivedItems.length > 0 && store.backorderItems.length > 0 && <br />}
                    {store.backorderItems.map(i => `[후발주] ${i.name}${i.optionName ? `(${i.optionName})` : ''} x${i.quantity}`).join(', ')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 font-semibold">할인/쿠폰</dt>
                  <dd className="font-bold text-slate-800">{store.hasDiscount === 'yes' ? '적용' : store.hasDiscount === 'no' ? '미적용' : '모름'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 font-semibold">결제 시각</dt>
                  <dd className="font-bold text-slate-800">{store.purchaseTime === 'unknown' ? '모름' : store.purchaseTime}</dd>
                </div>
              </dl>
            </div>

            <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-800 leading-relaxed font-medium">
              본인의 주문만 조회해 주세요. 타인의 정보로 주문을 조회하거나 허위로 본인 확인하는 행위는 금지됩니다. 부정 조회 방지를 위해 접속 정보 및 입력 기록이 보안 목적으로 저장될 수 있습니다.
            </div>

            <label className="flex items-start gap-3 mb-6 cursor-pointer group">
              <input type="checkbox" id="agree" className="mt-0.5 w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer" />
              <span className="text-sm text-slate-700 font-bold group-hover:text-slate-900 transition-colors">
                입력한 정보가 본인의 실제 주문 정보임을 확인합니다.
              </span>
            </label>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-start gap-2 mb-6">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-3 w-full">
                  <span>{errorMsg}</span>
                  <a href="https://www.instagram.com/sunrin_cat/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full p-3 bg-white/60 border border-red-100 rounded-xl hover:bg-white transition-colors group mt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center">
                        <InstagramIcon size={16} />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-slate-900 text-[12px]">공식 Instagram 문의하기</span>
                        <span className="text-[10px] text-slate-500 font-medium">@sunrin_cat DM</span>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-400 group-hover:text-slate-600 transition-colors" size={16} />
                  </a>
                </div>
              </div>
            )}

            <div className="mt-auto flex gap-3">
              <button onClick={prevStep} className="bg-slate-100 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-200 transition">이전</button>
              <button onClick={() => {
                const agree = (document.getElementById('agree') as HTMLInputElement)?.checked;
                if (!agree) {
                  setErrorMsg('안내 사항을 확인하고 체크해주세요.');
                  return;
                }
                setMatchTimeLeft(3);
                setShowMatchWarningModal(true);
              }} disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 hover:bg-indigo-700 transition shadow-md flex items-center justify-center">
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : '본인 주문 확인하기'}
              </button>
            </div>
          </div>
        );

      case 10:
        return <Receipt onUpdateClick={() => { setPage([11, 1]); store.setStep(11); }} />;

      case 11:
        return <UpdateInfoForm onBack={() => { setPage([10, -1]); store.setStep(10); }} />;

      default:
        return null;
    }
  };

  const progress = store.step > 0 && store.step < 10 ? (store.step / 9) * 100 : 0;

  return (
    <>
      {store.step > 0 && store.step < 10 && (
        <div className="h-1.5 bg-slate-100 w-full absolute top-0 left-0 z-10">
          <motion.div
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
      <AnimatePresence custom={direction}>
        <motion.div
          key={store.step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: { type: "spring", stiffness: 450, damping: 40 }, opacity: { duration: 0.15 } }}
          className="absolute inset-0 w-full h-full bg-white"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showMatchWarningModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[320px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 pb-2 text-center">
                <div className="w-14 h-14 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">조회 보안 경고</h3>
                <p className="text-[13px] font-medium text-slate-600 leading-relaxed break-keep">
                  본인 외 타인의 주문 정보를 무단으로 조회하는 행위는 엄격히 금지됩니다.<br /><br />부정 조회 방지를 위해 <strong className="text-red-500">조회 시도자의 접속 기록이 모두 수집</strong>됩니다. 동의하시고 조회하시겠습니까?
                </p>
              </div>
              <div className="p-4 flex gap-2">
                <button
                  onClick={() => setShowMatchWarningModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  disabled={matchTimeLeft > 0}
                  onClick={() => {
                    setShowMatchWarningModal(false);
                    handleSubmit();
                  }}
                  className="flex-[1.5] py-3.5 bg-red-500 text-white font-bold text-sm rounded-xl disabled:opacity-50 hover:bg-red-600 transition-colors shadow-sm"
                >
                  {matchTimeLeft > 0 ? `${matchTimeLeft}초 후 활성화` : '동의하고 조회'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRecoveryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[320px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden text-center"
            >
              <div className="p-8 pb-6">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info size={32} />
                </div>
                <h3 className="text-[17px] font-black text-slate-900 mb-2 leading-tight break-keep">이전에 입력된 내용이 발견되었어요.</h3>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed break-keep">
                  작성하시던 내용부터 이어서 진행할까요?
                </p>
              </div>
              <div className="p-4 flex gap-2">
                <button
                  onClick={() => {
                    store.reset();
                    setPage([0, 0]);
                    setShowRecoveryModal(false);
                  }}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  처음부터 하기
                </button>
                <button
                  onClick={() => {
                    setPage([store.step, 1]);
                    setShowRecoveryModal(false);
                  }}
                  className="flex-1 py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  계속 진행하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
