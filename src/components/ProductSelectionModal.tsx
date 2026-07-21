'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingCart, Check } from 'lucide-react';

interface ProductSelectionModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: any[]) => void;
  initialSelections?: any[];
}

export default function ProductSelectionModal({ product, isOpen, onClose, onAdd, initialSelections = [] }: ProductSelectionModalProps) {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const optionList = useMemo(() => {
    return product?.options && product.options.length > 0
      ? product.options
      : [{ id: `${product?.id}-default`, name: '기본 옵션' }];
  }, [product]);

  useEffect(() => {
    if (isOpen && product) {
      const initialMap: Record<string, number> = {};
      if (initialSelections.length > 0) {
        initialSelections.forEach(item => {
           initialMap[item.optionName || '기본 옵션'] = item.quantity;
        });
      } else {
        // default to 1 for the first option if nothing selected
        initialMap[optionList[0].name] = 1;
      }
      setQuantities(initialMap);
      
      const defaultOption = product.options && product.options.length > 0 ? product.options[0] : null;
      setSelectedImage(defaultOption?.image || (product.images && product.images[0]) || '');
    }
  }, [isOpen, product, initialSelections, optionList]);

  if (!product) return null;

  const handleQtyChange = (optName: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[optName] || 0;
      const next = Math.max(0, current + delta);
      const newMap = { ...prev };
      if (next === 0) {
        delete newMap[optName];
      } else {
        newMap[optName] = Math.min(10, next); // cap at 10
      }
      return newMap;
    });

    const option = product.options?.find((o: any) => o.name === optName);
    if (option && option.image) {
      setSelectedImage(option.image);
    }
  };

  const handleAdd = () => {
    const itemsToAdd = Object.entries(quantities).map(([optName, qty]) => {
      return {
        id: product.id,
        name: product.name,
        optionName: optionList.length > 1 ? optName : undefined,
        quantity: qty,
        image: selectedImage
      };
    });
    onAdd(itemsToAdd);
    onClose();
  };

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full max-w-[500px] max-h-[90vh] bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-800">상품 옵션 선택</h3>
              <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col">
              {/* Image */}
              <div className="bg-slate-50 rounded-2xl p-4 flex justify-center items-center h-52 sm:h-64 mb-6 border border-slate-100">
                {selectedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedImage} alt={product.name} className="max-h-full object-contain drop-shadow-md" />
                ) : (
                  <div className="text-slate-400 font-bold text-sm">이미지 없음</div>
                )}
              </div>
              
              {/* Title & Desc */}
              <h4 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-2">
                {product.name}
                {product.backorder && (
                  <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded shadow-sm shrink-0">후발주</span>
                )}
              </h4>
              {product.description && (
                <div className="text-sm text-slate-600 mb-6 leading-relaxed bg-slate-50 p-4 rounded-xl font-medium border border-slate-100" dangerouslySetInnerHTML={{ __html: product.description }} />
              )}

              {/* Options */}
              <div className="mb-4">
                <label className="block text-sm font-black text-slate-800 mb-3">옵션 수량 선택</label>
                <div className="flex flex-col gap-3">
                  {optionList.map((opt: any) => {
                    const qty = quantities[opt.name] || 0;
                    return (
                      <div key={opt.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${qty > 0 ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white'}`}>
                         <span className={`font-bold text-sm ${qty > 0 ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.name}</span>
                         <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                           <button 
                             onClick={() => handleQtyChange(opt.name, -1)}
                             disabled={qty <= 0}
                             className="p-1.5 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-white text-slate-700"
                           >
                             <Minus size={18} />
                           </button>
                           <span className="w-8 text-center font-extrabold text-base text-slate-800">{qty}</span>
                           <button 
                             onClick={() => handleQtyChange(opt.name, 1)}
                             className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-700"
                           >
                             <Plus size={18} />
                           </button>
                         </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-white pb-safe">
              <button 
                onClick={handleAdd} 
                disabled={totalQty === 0}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-md active:scale-95 text-lg tracking-tight"
              >
                <ShoppingCart size={22} />
                <span>선택 완료 ({totalQty}개)</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
