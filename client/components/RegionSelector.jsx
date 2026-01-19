import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UZBEKISTAN_REGIONS, VILOYAT_LIST } from '@/hooks/useRegionLocation';

const RegionSelector = ({ 
  location, 
  loading, 
  onDetect, 
  onSelect, 
  onClear,
  compact = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('viloyat'); // 'viloyat' | 'tuman'
  const [selectedViloyat, setSelectedViloyat] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('viloyat');
      setSelectedViloyat(null);
    }
  }, [isOpen]);

  const handleViloyatSelect = (viloyat) => {
    setSelectedViloyat(viloyat);
    setStep('tuman');
  };

  const handleTumanSelect = (tuman) => {
    onSelect(selectedViloyat, tuman);
    setIsOpen(false);
  };

  const handleSelectAllTumans = () => {
    onSelect(selectedViloyat, null);
    setIsOpen(false);
  };

  const tumans = selectedViloyat ? UZBEKISTAN_REGIONS[selectedViloyat] || [] : [];

  // Компактный вид — только кнопка
  if (compact && !isOpen) {
    return (
      <button
        onClick={() => location ? setIsOpen(true) : onDetect()}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {loading ? "Aniqlanmoqda..." : location ? `${location.tuman || location.viloyat}` : "Hududni tanlang"}
        </span>
        {location && !loading && (
          <ChevronDown className="w-4 h-4 opacity-60" />
        )}
      </button>
    );
  }

  return (
    <>
      {/* Trigger Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-medium">
            {location 
              ? `${location.viloyat}${location.tuman ? ` / ${location.tuman}` : ''}${location.qishloq ? ` / ${location.qishloq}` : ''}`
              : "Hududni tanlang"
            }
          </span>
          <ChevronDown className="w-4 h-4 opacity-60" />
        </button>

        {location && (
          <button
            onClick={onClear}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Tozalash"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative w-full max-w-md max-h-[80vh] bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {step === 'tuman' && (
                      <button
                        onClick={() => setStep('viloyat')}
                        className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <ChevronDown className="w-5 h-5 rotate-90 text-gray-500" />
                      </button>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {step === 'viloyat' ? 'Viloyatni tanlang' : selectedViloyat}
                      </h3>
                      {step === 'tuman' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tumanni tanlang</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Auto-detect button */}
                {step === 'viloyat' && (
                  <button
                    onClick={async () => {
                      await onDetect();
                      setIsOpen(false);
                    }}
                    disabled={loading}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                    <span>{loading ? "Aniqlanmoqda..." : "Avtomatik aniqlash"}</span>
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto max-h-[60vh] p-2 pb-20">
                {step === 'viloyat' ? (
                  <div className="space-y-1">
                    {VILOYAT_LIST.map((viloyat) => (
                      <button
                        key={viloyat}
                        onClick={() => handleViloyatSelect(viloyat)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                          location?.viloyat === viloyat
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="font-medium">{viloyat}</span>
                        {location?.viloyat === viloyat && (
                          <Check className="w-5 h-5 text-emerald-500" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* All tumans option */}
                    <button
                      onClick={handleSelectAllTumans}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                    >
                      <span>Barcha tumanlar</span>
                      <ChevronDown className="w-5 h-5 -rotate-90" />
                    </button>
                    
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                    
                    {tumans.map((tuman) => (
                      <button
                        key={tuman}
                        onClick={() => handleTumanSelect(tuman)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                          location?.tuman === tuman
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="font-medium">{tuman}</span>
                        {location?.tuman === tuman && (
                          <Check className="w-5 h-5 text-emerald-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RegionSelector;
