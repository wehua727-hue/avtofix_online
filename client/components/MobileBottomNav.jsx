import { Link, useLocation } from "react-router-dom";
import { Home, ListTree, ShoppingCart, User, Wrench } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

import { useAuth } from "@/context/AuthContext";
import CatalogModal from "./CatalogModal";
import ProfessionalsCatalogModal from "./ProfessionalsCatalogModal";

const MobileBottomNav = () => {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [professionalsOpen, setProfessionalsOpen] = useState(false);
  const { itemCount } = useCart();
  const { currentUser } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Bosh", icon: Home },
    { label: "Katalog", icon: ListTree, action: () => setCatalogOpen(true) },
    { label: "Ustalar", icon: Wrench, action: () => setProfessionalsOpen(true), isLarge: true },
    { to: "/cart", label: "Savat", icon: ShoppingCart, count: itemCount },
    { to: currentUser ? "/profile" : "/login", label: "Profil", icon: User },
  ];

  return (
    <>
      <nav
        className="fixed left-0 right-0 bottom-0 z-50 border-t border-gray-200 dark:border-white/10 bg-white/90 dark:bg-black/80 px-3 pb-2 pt-2 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-black/60 md:hidden transition-colors duration-300 overflow-hidden"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 8px)` }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {navItems.map(({ to, label, icon: Icon, count, action, isLarge }) => {
            const active = to && (location.pathname === to || (to !== "/" && location.pathname.startsWith(to)));
            
            // Agar action bo'lsa, button ishlatamiz
            if (action) {
              return (
                <button
                  key={label}
                  onClick={action}
                  className={`group relative flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium text-gray-500 dark:text-white/70 ${isLarge ? 'w-[22%]' : 'w-1/5'}`}
                >
                  <div className={`relative flex items-center justify-center rounded-xl border ${
                    isLarge 
                      ? "h-12 w-12 border-rose-300 dark:border-rose-500/40 bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg shadow-rose-500/30" 
                      : "h-9 w-9 border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-white/5"
                  }`}>
                    <Icon className={`${isLarge ? "h-5 w-5 text-white" : "h-4 w-4 text-gray-700 dark:text-white"}`} />
                  </div>
                  <span className={`mt-1 leading-none w-full text-center truncate ${isLarge ? "text-rose-500 dark:text-rose-300 font-semibold" : ""}`}>{label}</span>
                </button>
              );
            }

            return (
              <Link
                key={to}
                to={to}
                className={`group relative flex w-1/5 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium ${
                  active ? "text-rose-500 dark:text-rose-200" : "text-gray-500 dark:text-white/70"
                }`}
              >
                <div
                  className={`relative flex h-9 w-9 items-center justify-center rounded-xl border ${
                    active 
                      ? "border-rose-300 dark:border-rose-400/40 bg-rose-100 dark:bg-rose-500/20" 
                      : "border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-white/5"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-rose-500 dark:text-rose-200" : "text-gray-700 dark:text-white"}`} />
                  {typeof count === "number" && count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-4 rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white shadow-lg">
                      {count}
                    </span>
                  )}
                </div>
                <span className="mt-1 leading-none w-full text-center truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Catalog Modal */}
      <CatalogModal isOpen={catalogOpen} onClose={() => setCatalogOpen(false)} />
      
      {/* Professionals Catalog Modal */}
      <ProfessionalsCatalogModal isOpen={professionalsOpen} onClose={() => setProfessionalsOpen(false)} />
    </>
  );
};

export default MobileBottomNav;