import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import LocationConfirmModal from "@/components/LocationConfirmModal";
import { ordersAPI, productsAPI } from "@/services/api";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from 'react';
import { formatPrice } from "@/utils/currency";

const Cart = () => {
  const { currentUser: user, updateUser, loading } = useAuth();
  const navigate = useNavigate();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [productStocks, setProductStocks] = useState({});
  const {
    items,
    total,
    itemCount,
    incrementItem,
    decrementItem,
    removeItem,
    clearCart,
  } = useCart();
  
  // Mahsulotlar uchun stockCount'ni serverdan olish
  useEffect(() => {
    const fetchStocks = async () => {
      if (items.length === 0) return;
      
      const stocks = {};
      for (const item of items) {
        // Agar stockCount allaqachon bor bo'lsa, uni ishlatamiz
        if (item.stockCount !== null && item.stockCount !== undefined) {
          stocks[item.productId] = item.stockCount;
          continue;
        }
        
        // Aks holda serverdan olamiz
        try {
          let productId = item.productId;
          // Variant bo'lsa, parent ID'sini olish
          if (productId && productId.includes('_variant_')) {
            productId = productId.split('_variant_')[0];
          }
          
          const product = await productsAPI.getById(productId);
          if (product) {
            // Variant bo'lsa, variant stockCount'ini olish
            if (item.variantName && Array.isArray(product.variantSummaries)) {
              const variant = product.variantSummaries.find(v => v.name === item.variantName);
              if (variant && variant.stockCount !== null && variant.stockCount !== undefined) {
                stocks[item.productId] = variant.stockCount;
                continue;
              }
            }
            // Asosiy mahsulot stockCount'i
            if (product.stockCount !== null && product.stockCount !== undefined) {
              stocks[item.productId] = product.stockCount;
            }
          }
        } catch (error) {
          console.error("Error fetching product stock:", error);
        }
      }
      setProductStocks(stocks);
    };
    
    fetchStocks();
  }, [items]);
  
  // Items bilan stockCount'ni birlashtirish
  const itemsWithStock = useMemo(() => {
    return items.map(item => ({
      ...item,
      stockCount: item.stockCount ?? productStocks[item.productId] ?? null
    }));
  }, [items, productStocks]);

  // Handle order button click
  const handleOrderClick = () => {
    if (loading) {
      toast.info('Iltimos kuting...');
      return;
    }
    
    if (!user) {
      toast.error('Buyurtma berish uchun tizimga kiring');
      navigate('/login');
      return;
    }
    
    setShowLocationModal(true);
  };

  // Handle address update
  const handleUpdateAddress = async (updatedLocation) => {
    try {
      if (!user?.id) {
        toast.error('Foydalanuvchi topilmadi');
        return;
      }
      
      await updateUser({
        name: user.name,
        phone: user.phone,
        region: user.region,
        district: user.district,
        address: updatedLocation.address,
        city: updatedLocation.city
      });
      toast.success('Manzil yangilandi');
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Manzilni yangilashda xatolik');
      throw error;
    }
  };

  // Handle order confirmation
  const handleOrderConfirm = async (customLocation = null) => {
    if (!user) return;
    
    setIsPlacingOrder(true);
    try {
      const rawAddress = customLocation?.address ?? user.address ?? '';
      const trimmedAddress = rawAddress.trim();

      // Agar aniq manzil bo'lmasa, viloyatni ishlatamiz
      const finalAddress = trimmedAddress || user.region || '';
      
      if (!finalAddress) {
        toast.error('Viloyat yoki manzil topilmadi');
        setShowLocationModal(true);
        return;
      }

      const deliveryAddress = {
        address: finalAddress,
        city: (customLocation?.city ?? user.city ?? user.region ?? '').trim(),
        phone: (customLocation?.phone ?? user.phone ?? '').trim(),
      };

      const orderData = {
        items: items.map(item => ({
          productId: item.productId || item.id,
          name: item.name,
          price: item.price,
          currency: item.currency,
          quantity: item.quantity,
          image: item.image,
          variantName: item.variantName || null,
          parentProductId: item.parentProductId || null,
        })),
        total: total,
        deliveryAddress: deliveryAddress
      };

      const result = await ordersAPI.create(orderData);
      
      // Handle multiple orders (items from different stores)
      if (result.orders && result.orders.length > 1) {
        toast.success(`${result.orders.length} ta buyurtma muvaffaqiyatli berildi!`);
      } else {
        const orderNumber = result.orderNumber || result.orders?.[0]?.orderNumber;
        toast.success(`Buyurtma muvaffaqiyatli berildi! Raqam: ${orderNumber}`);
      }
      
      // Bosh sahifa cache'ini tozalash (stockCount yangilangan)
      sessionStorage.removeItem('home_products');
      
      clearCart();
      setShowLocationModal(false);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'Buyurtma berishda xatolik yuz berdi');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Empty cart state
  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-24">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Orqaga</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Savatcha</h1>
          </div>

          {/* Empty state */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-white/10 p-8 sm:p-12 text-center shadow-sm dark:shadow-none">
            <div className="mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 mb-6">
              <ShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-gray-900 dark:text-white">Savatcha bo'sh</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Sevimli mahsulotlaringizni qo'shib, buyurtma berishni boshlang.
            </p>
            <Link to="/">
              <Button className="h-12 sm:h-14 px-8 sm:px-10 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold text-base sm:text-lg shadow-lg shadow-red-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/40">
                Xarid qilishni boshlash
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8 pb-24 sm:pb-32 lg:pb-24">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4 sm:mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Orqaga</span>
          </button>
          
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                Savatcha
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {itemCount} {itemCount === 1 ? 'mahsulot' : 'mahsulot'}
              </p>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/50 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-500 transition-all text-sm sm:text-base"
              >
                <Trash2 className="w-4 h-4" />
                Tozalash
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {/* Mobile: 2 columns grid, Desktop: single column list */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-4">
              {itemsWithStock.map((item) => (
                <div
                  key={item.productId || item.id}
                  className="group bg-white dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-3 transition-all duration-300 hover:border-red-500/50 dark:hover:border-red-500/50 hover:bg-gray-50 dark:hover:bg-white/10 hover:shadow-lg hover:shadow-red-500/10 lg:flex lg:flex-row lg:gap-3"
                >
                  {/* Product Image */}
                  <div className="relative h-32 w-full lg:h-28 lg:w-28 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 mb-3 lg:mb-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-50 dark:opacity-50" />
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="mb-2">
                      <h3 className="text-sm lg:text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {item.name}
                      </h3>
                      {item.variantName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Variant: {item.variantName}
                        </p>
                      )}
                      <p className="text-lg lg:text-xl font-bold text-red-600 dark:text-red-400">
                        {formatPrice(item.price, item.currency)}
                      </p>
                    </div>

                    {/* Ombordagi son - kattaroq */}
                    {item.stockCount !== null && item.stockCount !== undefined && (
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg mb-2 ${
                        item.stockCount <= 5 
                          ? "bg-orange-100 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-500/40" 
                          : "bg-green-100 dark:bg-green-500/20 border border-green-300 dark:border-green-500/40"
                      }`}>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Omborda:</span>
                        <span className={`text-base font-bold ${
                          item.stockCount <= 5 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
                        }`}>
                          {item.stockCount} ta
                        </span>
                      </div>
                    )}

                    {/* Controls */}
                    <div className="flex flex-col gap-2 mt-auto">
                      {/* Quantity Counter - kattaroq */}
                      <div className="flex items-center justify-center gap-3 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-2">
                        <button
                          onClick={() => decrementItem(item.productId || item.id)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/30 text-gray-700 dark:text-white transition-all active:scale-95 shadow-sm"
                          aria-label="Kamaytirish"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="min-w-[2.5rem] text-center text-xl font-bold text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            // Ombordagi miqdordan ko'p bo'lmasin
                            if (item.stockCount !== null && item.stockCount !== undefined && item.quantity >= item.stockCount) {
                              toast.error(`Omborda faqat ${item.stockCount} ta mavjud`);
                              return;
                            }
                            incrementItem({
                              id: item.productId || item.id,
                              _id: item.productId || item.id,
                              name: item.name,
                              price: item.price.toString(),
                              currency: item.currency,
                              image: item.image,
                              imageUrl: item.image,
                              stockCount: item.stockCount,
                            });
                          }}
                          disabled={item.stockCount !== null && item.stockCount !== undefined && item.quantity >= item.stockCount}
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-95 shadow-sm ${
                            item.stockCount !== null && item.stockCount !== undefined && item.quantity >= item.stockCount
                              ? "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                              : "bg-white dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/30 text-gray-700 dark:text-white"
                          }`}
                          aria-label="Ko'paytirish"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Remove Button - kattaroq */}
                      <button
                        onClick={() => removeItem(item.productId || item.id)}
                        className="flex items-center justify-center gap-2 h-10 w-full rounded-xl border border-red-500/50 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-500 transition-all active:scale-95 text-sm font-medium"
                        aria-label="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>O'chirish</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Order Summary - Fixed at bottom (replaces mobile menu) */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-white/10 p-4 z-50 shadow-lg"
            style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 16px)` }}
          >
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Jami</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatPrice(total, items[0]?.currency)}
                  </p>
                </div>
                <Button
                  onClick={handleOrderClick}
                  disabled={isPlacingOrder}
                  className="h-12 px-6 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold text-base shadow-lg shadow-red-500/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isPlacingOrder ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Buyurtma...
                    </span>
                  ) : (
                    'Buyurtma berish'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Order Summary - Sticky on desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="lg:sticky lg:top-24 bg-white dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-white/10 p-6 space-y-6 shadow-sm dark:shadow-none">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Buyurtma xulosa</h2>
              
              {/* Summary Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                  <span className="text-sm">Mahsulotlar ({itemCount})</span>
                  <span className="text-base font-medium text-gray-900 dark:text-white">
                    {formatPrice(total, items[0]?.currency)}
                  </span>
                </div>
                <div className="h-px bg-gray-200 dark:bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Jami</span>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatPrice(total, items[0]?.currency)}
                  </span>
                </div>
              </div>

              {/* Order Button */}
              <Button
                onClick={handleOrderClick}
                disabled={isPlacingOrder}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold text-base shadow-lg shadow-red-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isPlacingOrder ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Buyurtma berilmoqda...
                  </span>
                ) : (
                  'Buyurtma berish'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Location confirmation modal */}
      <LocationConfirmModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onConfirm={handleOrderConfirm}
        onUpdateAddress={handleUpdateAddress}
        userLocation={{
          address: user?.address || user?.region || '',
          city: user?.city || user?.region || '',
          phone: user?.phone
        }}
        userRegion={user?.region}
      />
    </div>
  );
};

export default Cart;
