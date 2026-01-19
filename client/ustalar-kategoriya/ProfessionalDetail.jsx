import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, Phone, MapPin, Clock, Award } from "lucide-react";

const ProfessionalDetail = () => {
  const { id } = useParams();

  // Mock professional data - in real app this would come from API
  const professional = {
    id: id,
    name: "Bobur Karimov",
    specialty: "Motor ustasi",
    phone: "+998 91 405 84 81",
    rating: 4.8,
    experience: "8 yil",
    location: "Toshkent, Chilonzor tumani",
    image:
      "https://images.unsplash.com/photo-1581092795442-8d2c4c5b7e8b?w=600&h=400&fit=crop",
    description:
      "Tajribali avtomobil ta'mirlash mutaxassisi. Barcha turdagi avtomobil muammolarini hal qilaman.",
    services: [
      "Dvigatel ta'mirlash",
      "Elektr tizimi",
      "Tormoz tizimi",
      "Konditsioner ta'mirlash",
      "Diagnostika",
    ],
    workingHours: "09:00 - 18:00",
    reviews: [
      {
        id: 1,
        name: "Akmal Toshev",
        rating: 5,
        comment: "Juda yaxshi usta, tez va sifatli ish qiladi.",
      },
      {
        id: 2,
        name: "Sardor Aliyev",
        rating: 5,
        comment: "Tavsiya qilaman, professional yondashuv.",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            to="/"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Orqaga
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="space-y-4">
            {/* Favorite button */}
            <div className="flex justify-start">
              <button className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center hover:bg-yellow-200 transition-colors">
                <Star className="w-6 h-6 text-yellow-500" />
              </button>
            </div>

            {/* Main image */}
            <div className="aspect-[4/3] bg-white rounded-2xl overflow-hidden shadow-lg">
              <img
                src={professional.image}
                alt={professional.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Professional Info Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="space-y-6">
              {/* Name and specialty */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {professional.name}
                </h1>
                <p className="text-xl text-gray-600 mb-4">
                  {professional.specialty}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < Math.floor(professional.rating) ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {professional.rating}
                  </span>
                </div>
              </div>

              {/* Contact and details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900">
                    {professional.phone}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">{professional.location}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">
                    {professional.workingHours}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">
                    Tajriba: {professional.experience}
                  </span>
                </div>
              </div>

              {/* Services */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Xizmatlar:</h3>
                <div className="flex flex-wrap gap-2">
                  {professional.services.map((service, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact button */}
              <Link
                to="/contact"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
              >
                <Phone className="w-5 h-5" />
                Bog'lanish
              </Link>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Mijozlar fikrlari
          </h2>
          <div className="space-y-4">
            {professional.reviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-gray-100 pb-4 last:border-b-0"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium text-gray-900">
                    {review.name}
                  </span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDetail;
