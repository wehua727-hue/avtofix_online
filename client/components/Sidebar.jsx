import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function Sidebar() {
  const [expandedSections, setExpandedSections] = useState(["brandi", "narxi"]);

  const toggleSection = (section) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const brands = [
    "BMW",
    "Mercedes",
    "Audi",
    "Volkswagen",
    "Tesla",
    "Toyota",
    "Honda",
    "Hyundai",
    "Kia",
  ];

  const renderSection = (title, key, items) => (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => toggleSection(key)}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition"
      >
        <span className="font-medium text-gray-900">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-600 transition-transform ${
            expandedSections.includes(key) ? "rotate-180" : ""
          }`}
        />
      </button>

      {expandedSections.includes(key) && (
        <div className="bg-gray-50 px-4 py-2 space-y-2">
          {items.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                className="w-4 h-4 accent-red-600 rounded"
              />
              <span className="text-sm text-gray-700">{item}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <aside className="bg-white rounded-lg h-fit sticky top-20">
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Filtirlar</h2>

        {renderSection("Brandi", "brandi", brands)}

        {renderSection("Narxi", "narxi", [
          "0 - 10 000 000 so'm",
          "10 000 000 - 25 000 000 so'm",
          "25 000 000 - 50 000 000 so'm",
          "50 000 000+ so'm",
        ])}

        {renderSection("Yili", "yili", [
          "2024",
          "2023",
          "2022",
          "2021",
          "2020",
          "2019",
        ])}

        {renderSection("Rangi", "rangi", [
          "Qora",
          "Oq",
          "Kumush",
          "Qizil",
          "Binafsha",
        ])}

        <button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded transition">
          Qayta o'rnatish
        </button>
      </div>
    </aside>
  );
}
