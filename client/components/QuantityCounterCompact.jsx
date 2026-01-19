import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const QuantityCounterCompact = ({ product, className = "" }) => {
  const { getItemQuantity, incrementItem, decrementItem } = useCart();
  const navigate = useNavigate();

  const productId = product?.id || product?._id;
  const quantity = getItemQuantity(productId);
  
  // Ombordagi miqdorni olish
  const stockCount = product?.stockCount !== null && product?.stockCount !== undefined 
    ? Number(product.stockCount) 
    : null;
  
  // Omborda mavjudmi
  const isOutOfStock = stockCount !== null && stockCount <= 0;
  
  // Maksimal miqdorga yetdimi
  const isMaxReached = stockCount !== null && quantity >= stockCount;

  const handleIncrement = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Ombordagi miqdordan ko'p bo'lmasin
    if (stockCount !== null && quantity >= stockCount) {
      toast.error(`Omborda faqat ${stockCount} ta mavjud`);
      return;
    }

    try {
      const result = await incrementItem(product);
      if (result?.requiresAuth) {
        navigate("/login");
      } else if (result?.error) {
        console.error("Cart error:", result.error);
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error in handleIncrement:", error);
      toast.error("Savatga qo'shishda xatolik yuz berdi");
    }
  };

  const handleDecrement = (event) => {
    event.preventDefault();
    event.stopPropagation();
    decrementItem(productId);
  };

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Omborda yo'q bo'lsa qo'shish mumkin emas
    if (isOutOfStock) {
      toast.error("Mahsulot omborda mavjud emas");
      return;
    }

    try {
      const result = await incrementItem(product);

      if (result?.requiresAuth) {
        navigate("/login");
      } else if (result?.error) {
        console.error("Cart error:", result.error);
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error in handleAddToCart:", error);
      toast.error("Savatga qo'shishda xatolik yuz berdi");
    }
  };

  // Agar omborda yo'q bo'lsa
  if (isOutOfStock) {
    return (
      <button
        type="button"
        disabled
        className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-gray-400 text-white text-[10px] sm:text-sm font-medium cursor-not-allowed ${className}`}
      >
        <span>Mavjud emas</span>
      </button>
    );
  }

  // If quantity is 0, show "Add to Cart" button
  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={handleAddToCart}
        className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-red-600 text-white text-[10px] sm:text-sm font-medium transition-colors hover:bg-red-500 ${className}`}
      >
        <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Savatga</span>
      </button>
    );
  }

  // If quantity > 0, show quantity counter
  return (
    <div
      className={`w-full flex items-center justify-between sm:justify-center gap-1 sm:gap-3 bg-gray-200 dark:bg-gray-700 rounded-lg sm:rounded-xl py-1 sm:py-2 px-1.5 sm:px-3 transition-colors ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrement}
        className="w-6 h-6 sm:w-8 sm:h-8 bg-red-600 hover:bg-red-500 text-white rounded-md sm:rounded-lg flex items-center justify-center transition-colors"
        aria-label="Miqdorni kamaytirish"
      >
        <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      </button>

      <span className="text-gray-800 dark:text-white font-semibold text-xs sm:text-base min-w-[1.25rem] sm:min-w-[1.5rem] text-center">
        {quantity}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={isMaxReached}
        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center transition-colors ${
          isMaxReached 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-red-600 hover:bg-red-500"
        } text-white`}
        aria-label="Miqdorni oshirish"
        title={isMaxReached ? `Omborda faqat ${stockCount} ta mavjud` : ""}
      >
        <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      </button>
    </div>
  );
};

export default QuantityCounterCompact;
