import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
// Главная страница загружается сразу для быстрого первого рендера
import Index from "./bosh-sahifa/Index";

// Lazy loading для остальных страниц
const ProductDetail = lazy(() => import("./korish/ProductDetail"));
const Cart = lazy(() => import("./savatcha/Cart"));
const Professionals = lazy(() => import("./ustalar-kategoriya/Professionals"));
const ProfessionalDetail = lazy(() => import("./ustalar-kategoriya/ProfessionalDetail"));
const Favorites = lazy(() => import("./sevimli/Favorites"));
const NotFound = lazy(() => import("./NotFound"));
const ProductCategory = lazy(() => import("./mahsulot-kategoriya/ProductCategory"));
const SearchResults = lazy(() => import("./search/SearchResults"));
const Login = lazy(() => import("./login/Login"));
const Register = lazy(() => import("./register/Register"));
const Profile = lazy(() => import("./profil/Profile"));
const Contact = lazy(() => import("./bog'lanish/Contact"));
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import { useAuth } from "@/context/AuthContext";
import MobileBottomNav from "@/components/MobileBottomNav";

const AdminPanel = lazy(() => import("./admin-panel/AdminPanel"));

// Быстрый компонент загрузки
const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minut - ma'lumotlar yangi deb hisoblanadi
      gcTime: 1000 * 60 * 10, // 10 minut - cache saqlanadi
      refetchOnWindowFocus: true, // Oyna fokusga kelganda yangilash
      retry: 1, // Faqat 1 ta qayta urinish
      refetchOnMount: "stale", // Stale bo'lsa yangilash
    },
  },
});

const RequireAdmin = ({ children }) => {
  const { currentUser, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-200">
        Yuklanmoqda...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RequireManager = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-200">Yuklanmoqda...</div>;
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location }} />;
  if (currentUser.role !== 'manager') return <Navigate to="/" replace />;
  return children;
};

const RequireHelper = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-200">Yuklanmoqda...</div>;
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location }} />;
  if (currentUser.role !== 'helper') return <Navigate to="/" replace />;
  return children;
};

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/manager/admin") || location.pathname.startsWith("/helper/admin");
  const isProductDetailPage = location.pathname.startsWith("/product/");
  const isCartPage = location.pathname === "/cart";

  return (
    <>
      <ScrollToTop />
      {!isAdminRoute && <Header />}
      {/* Main content wrapper with padding for fixed header */}
      <main className={!isAdminRoute ? "pt-32" : ""}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
                {/* Bosh sahifa */}
                <Route path="/" element={<Index />} />

                {/* Mahsulot kategoriyalari */}
                <Route path="/categories" element={<ProductCategory />} />

                {/* Qidiruv natijalari */}
                <Route path="/search" element={<SearchResults />} />

                {/* Mahsulot ko'rish */}
                <Route path="/product/:id" element={<ProductDetail />} />

                {/* Savatcha */}
                <Route path="/cart" element={<Cart />} />
                <Route path="/favorites" element={<Favorites />} />

                {/* Ustalar */}
                <Route path="/professionals" element={<Professionals />} />
                <Route
                  path="/professional/:id"
                  element={<ProfessionalDetail />}
                />

                {/* Foydalanuvchi autentifikatsiyasi */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Profil */}
                <Route path="/profile/:section?" element={<Profile />} />

                {/* Admin panel */}
                <Route
                  path="/admin/:section?"
                  element={
                    <RequireAdmin>
                      <Suspense
                        fallback={
                          <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-200">
                            Yuklanmoqda...
                          </div>
                        }
                      >
                        <AdminPanel />
                      </Suspense>
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/:section/:storeId"
                  element={
                    <RequireAdmin>
                      <Suspense
                        fallback={
                          <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-200">
                            Yuklanmoqda...
                          </div>
                        }
                      >
                        <AdminPanel />
                      </Suspense>
                    </RequireAdmin>
                  }
                />

                {/* Manager Admin */}
                <Route
                  path="/manager/admin"
                  element={
                    <RequireManager>
                      <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-200">Yuklanmoqda...</div>}>
                        {/** Lazy import inline to avoid top-level split complexity */}
                        {(() => {
                          const ManagerPanel = lazy(() => import("./manager-panel/ManagerAdminPanel"));
                          return <ManagerPanel />;
                        })()}
                      </Suspense>
                    </RequireManager>
                  }
                />

                {/* Helper Admin */}
                <Route
                  path="/helper/admin"
                  element={
                    <RequireHelper>
                      <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-200">Yuklanmoqda...</div>}>
                        {(() => {
                          const HelperPanel = lazy(() => import("./helper-panel/HelperAdminPanel"));
                          return <HelperPanel />;
                        })()}
                      </Suspense>
                    </RequireHelper>
                  }
                />

                {/* Bog'lanish */}
                <Route path="/contact" element={<Contact />} />

                {/* 404 sahifa */}
              <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </main>
            {!isAdminRoute && !isProductDetailPage && !isCartPage && <MobileBottomNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
