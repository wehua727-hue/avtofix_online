import { Eye } from "lucide-react";
import { Link } from "react-router-dom";

export default function CarCard({ id, name, price, image }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative aspect-video bg-gray-200 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{name}</h3>
        <p className="text-sm text-gray-600 mb-4">eng yangi avtomobil</p>

        <div className="mb-4">
          <p className="text-2xl font-bold text-red-600">
            {price.toLocaleString()} so'm
          </p>
        </div>

        <Link
          to={`/product/${id}`}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded transition"
        >
          <Eye className="w-4 h-4" />
          Ko'rish
        </Link>
      </div>
    </div>
  );
}
