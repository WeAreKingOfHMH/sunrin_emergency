'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { AlertTriangle, CheckCircle2, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UpdateInfoForm({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const order = store.matchedOrder;

  const [updateName, setUpdateName] = useState(store.customerName);
  const [updateStudentId, setUpdateStudentId] = useState(store.studentId);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  if (!order) return null;

  const submitUpdate = async () => {
    setUpdateError('');
    if (!updateName.trim() || !updateStudentId.trim()) {
      setUpdateError('이름과 학번을 모두 입력해주세요.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/claim-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          dailyOrderNumber: order.dailyOrderNumber,
          newCustomerName: updateName,
          newCustomerStudentId: updateStudentId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setUpdateError(data.error || '요청 중 오류가 발생했습니다.');
        return;
      }

      setUpdateSuccess(true);
    } catch (err) {
      setUpdateError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (updateSuccess) {
    return (
      <div className="flex flex-col h-full p-8 pt-16">
        <div className="flex flex-col items-center py-6 text-center mb-8">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">요청이 접수되었습니다!</h2>
          <p className="text-slate-500 leading-relaxed">
            관리자 확인 후 정보가 수정될 예정입니다. <br />이용해 주셔서 감사합니다.
          </p>
        </div>
        <div className="mt-auto">
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-200 text-slate-700 text-base font-bold rounded-2xl flex items-center justify-center hover:bg-slate-300 transition active:scale-95 shadow-sm">
            처음으로 돌아가기 <Home size={18} className="ml-2" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8">
      <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-10 mb-1">정보 수정 요청</h2>
      <p className="text-slate-500 text-sm mb-8 leading-relaxed break-keep">
        조회된 정보가 본인의 정보와 다를 경우, 올바른 이름과 학번을 다시 기재하여 수정을 요청해 주세요.
      </p>

      <div className="flex flex-col gap-8 flex-1">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-400">올바른 이름</span>
          <input
            type="text"
            value={updateName}
            onChange={(e) => setUpdateName(e.target.value)}
            placeholder="예: 홍길동"
            className="w-full text-3xl font-black text-slate-900 border-b-2 border-slate-200 focus:border-indigo-600 outline-none pb-2 bg-transparent transition-colors placeholder-slate-300"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-slate-400">올바른 학번</span>
          <input
            type="text"
            value={updateStudentId}
            onChange={(e) => setUpdateStudentId(e.target.value)}
            placeholder="예: 10101"
            className="w-full text-3xl font-black text-slate-900 border-b-2 border-slate-200 focus:border-indigo-600 outline-none pb-2 bg-transparent transition-colors placeholder-slate-300"
          />
        </div>

        {updateError && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold flex items-start gap-2">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>{updateError}</span>
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-3">
        <button
          onClick={onBack}
          id="back-btn"
          className="bg-slate-100 text-slate-600 font-bold py-4 px-6 rounded-2xl hover:bg-slate-200 transition"
        >
          이전
        </button>
        <button
          disabled={isUpdating}
          onClick={submitUpdate}
          className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-2xl disabled:opacity-50 hover:bg-indigo-700 transition shadow-md flex justify-center items-center"
        >
          {isUpdating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '수정 요청하기'}
        </button>
      </div>
    </div>
  );
}
