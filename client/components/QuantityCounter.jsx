import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";

const QuantityCounter = ({ product, className = "" }) => {
  const { getItemQuantity, incrementItem, decrementItem } = useCart();
  const navigate = useNavigate();

  const productId = product?.id || product?._id;
  const quantity = getItemQuantity(productId);

  const handleIncrement = async () => {
    const result = await incrementItem(product);
    if (result?.requiresAuth) {
      navigate("/login");
    }
  };

  const handleDecrement = () => {
    decrementItem(productId);
  };

  const handleAddToCart = async () => {
    const result = await incrementItem(product);
    if (result?.requiresAuth) {
      navigate("/login");
    }
  };

  // If quantity is 0, show "Add to Cart" button
  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={handleAddToCart}
        className={`flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors ${className}`}
      >
        <ShoppingCart className="w-5 h-5" />
        Savatga
      </button>
    );
  }

  // If quantity > 0, show quantity counter
  return (
    <div
      className={`flex-1 flex items-center justify-center gap-4 bg-gray-800 rounded-2xl py-4 px-6 ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrement}
        className="w-10 h-10 bg-red-600 hover:bg-red-500 text-white rounded-xl flex items-center justify-center transition-colors"
        aria-label="Miqdorni kamaytirish"
      >
        <Minus className="w-4 h-4" />
      </button>

      <span className="text-white font-semibold text-lg min-w-[2rem] text-center">
        {quantity}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        className="w-10 h-10 bg-red-600 hover:bg-red-500 text-white rounded-xl flex items-center justify-center transition-colors"
        aria-label="Miqdorni oshirish"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

export default QuantityCounter;
