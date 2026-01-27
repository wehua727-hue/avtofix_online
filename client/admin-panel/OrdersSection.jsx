import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ordersAPI } from '@/services/api';
import { toast } from 'sonner';
import { formatPrice } from '@/utils/currency';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  User, 
  MapPin,
  Calendar,
  Eye,
  Trash2,
  RefreshCw
} from 'lucide-react';

/**
 * Orders management section for admin panel
 */
const OrdersSection = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersAPI.getAll();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Buyurtmalarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Get order status info
  const getOrderStatusInfo = (status) => {
    const statusMap = {
      pending: { 
        label: 'Kutilmoqda', 
        icon: Clock, 
        color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
      },
      confirmed: { 
        label: 'Tasdiqlandi', 
        icon: CheckCircle, 
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        buttonColor: 'bg-blue-600 hover:bg-blue-700'
      },
      preparing: { 
        label: 'Tayyorlanmoqda', 
        icon: Package, 
        color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        buttonColor: 'bg-orange-600 hover:bg-orange-700'
      },
      shipping: { 
        label: 'Yetkazilmoqda', 
        icon: Truck, 
        color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        buttonColor: 'bg-purple-600 hover:bg-purple-700'
      },
      delivered: { 
        label: 'Yetkazildi', 
        icon: CheckCircle, 
        color: 'bg-green-500/10 text-green-500 border-green-500/20',
        buttonColor: 'bg-green-600 hover:bg-green-700'
      },
      returned: { 
        label: 'Qaytarildi', 
        icon: XCircle, 
        color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        buttonColor: 'bg-orange-600 hover:bg-orange-700'
      },
      cancelled: { 
        label: 'Bekor qilindi', 
        icon: XCircle, 
        color: 'bg-red-500/10 text-red-500 border-red-500/20',
        buttonColor: 'bg-red-600 hover:bg-red-700'
      }
    };
    return statusMap[status] || statusMap.pending;
  };

  // Get next status options
  // const getNextStatusOptions = (currentStatus) => {
  //   const statusFlow = {
  //     pending: ['confirmed', 'cancelled'],
  //     confirmed: ['preparing', 'cancelled'],
  //     preparing: ['shipping', 'cancelled'],
  //     shipping: ['delivered'],
  //     delivered: [],
  //     cancelled: []
  //   };
  //   return statusFlow[currentStatus] || [];
  // };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingStatus(orderId);
      await ordersAPI.updateStatus(orderId, newStatus);
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId 
            ? { ...order, status: newStatus, updatedAt: new Date() }
            : order
        )
      );
      
      toast.success('Buyurtma statusi yangilandi');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Status yangilashda xatolik');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Open order details modal
  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setDetailsModalOpen(true);
  };

  // Delete order
  const handleDeleteOrderClick = (orderId) => {
    setOrderToDelete(orderId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      setDeletingOrder(orderToDelete);
      await ordersAPI.delete(orderToDelete);
      setOrders(prevOrders => prevOrders.filter(order => order._id !== orderToDelete));
      toast.success('Buyurtma o\'chirildi');
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(error.message || 'Buyurtmani o\'chirishda xatolik');
    } finally {
      setDeletingOrder(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#0a0b14] dark:via-[#0f1117] dark:to-[#05060d] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto" />
            <div className="absolute inset-0 h-16 w-16 border-4 border-transparent border-t-orange-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Yuklanmoqda...
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Admin panel tayyorlanmoqda
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800/50 border-gray-200/60 dark:border-gray-700/60 backdrop-blur-xl shadow-2xl rounded-3xl">
      <CardHeader className="p-6 border-b border-gray-200/50 dark:border-gray-600/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-gray-900 dark:text-white text-xl font-bold">Buyurtmalar</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 text-sm">
                Barcha buyurtmalarni boshqaring
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={fetchOrders}
            variant="outline"
            className="group border-gray-300/60 dark:border-gray-600/60 bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-500/10 dark:hover:to-cyan-500/10 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-400/60 transition-all duration-200 rounded-xl shadow-sm hover:shadow-lg"
          >
            <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            Yangilash
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative mb-8">
              <div className="h-24 w-24 mx-auto rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <Package className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">0</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Buyurtmalar yo'q
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Hozircha hech qanday buyurtma yo'q. Yangi buyurtmalar paydo bo'lganda bu yerda ko'rinadi.
            </p>
            <button
              onClick={fetchOrders}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold hover:from-rose-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <RefreshCw className="w-4 h-4" />
              Yangilash
            </button>
          </div>
        ) : (
          <>
            {/* Enhanced Mobile card view */}
            <div className="sm:hidden space-y-4">
              {orders.map((order) => {
                const statusInfo = getOrderStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <div 
                    key={order._id}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-700/40 backdrop-blur-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/10 dark:hover:shadow-black/20 hover:-translate-y-1"
                    onClick={() => handleOrderClick(order)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-gray-900 dark:text-white font-bold text-base">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl ${statusInfo.color} border text-xs font-semibold shadow-sm`}>
                          <StatusIcon className="w-3 h-3 mr-1.5 inline" />
                          {statusInfo.label}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div className="space-y-1">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Mijoz:</span>
                          <p className="text-gray-900 dark:text-white font-medium">{order.userId?.name || 'Noma\'lum'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Summa:</span>
                          <p className="text-gray-900 dark:text-white font-bold">{order.total.toLocaleString()} so'm</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-200/60 dark:border-gray-600/60">
                        <p className="text-gray-600 dark:text-gray-400 text-xs truncate max-w-[60%]">
                          {order.deliveryAddress?.address || 'Manzil yo\'q'}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors text-xs font-medium"
                            onClick={(e) => { e.stopPropagation(); handleOrderClick(order); }}
                          >
                            <Eye className="w-3 h-3" />
                            Ko'rish
                          </button>
                          <button
                            disabled={deletingOrder === order._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-xs font-medium disabled:opacity-50"
                            onClick={(e) => { e.stopPropagation(); handleDeleteOrderClick(order._id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium text-sm">Buyurtma</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium text-sm">Mijoz</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium text-sm">Manzil</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium text-sm">Telefon</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium text-sm">Summa</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-4 text-gray-700 dark:text-gray-300 font-medium text-sm">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                {orders.map((order) => {
                  const statusInfo = getOrderStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr 
                      key={order._id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                      onClick={() => handleOrderClick(order)}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString('uz-UZ')}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900 dark:text-white">{order.userId?.name || 'Noma\'lum'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-700 dark:text-gray-300 max-w-xs truncate">
                          {order.deliveryAddress?.address || 'Manzil yo\'q'}
                        </p>
                        {order.deliveryAddress?.city && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{order.deliveryAddress.city}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-700 dark:text-gray-300">
                          {order.deliveryAddress?.phone || order.userId?.phone || 'Telefon yo\'q'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900 dark:text-white font-medium">
                          {order.total.toLocaleString()} so'm
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => {
                              // Не открывать модалку заказа при клике по статусу
                              e.stopPropagation();
                            }}
                          >
                            <button type="button">
                              <Badge className={`${statusInfo.color} border`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            side="bottom"
                            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white min-w-[180px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {["pending", "shipping", "cancelled"]
                              .filter((status) => status !== order.status)
                              .map((nextStatus) => {
                                const nextStatusInfo = getOrderStatusInfo(nextStatus);
                                const NextIcon = nextStatusInfo.icon;
                                return (
                                  <DropdownMenuItem
                                    key={nextStatus}
                                    disabled={updatingStatus === order._id}
                                    className={`${nextStatusInfo.color} flex items-center gap-2 cursor-pointer`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateOrderStatus(order._id, nextStatus);
                                    }}
                                  >
                                    <NextIcon className="w-3 h-3 mr-1" />
                                    <span>{nextStatusInfo.label}</span>
                                  </DropdownMenuItem>
                                );
                              })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order);
                            }}
                            className="h-8 px-2 border-gray-300 dark:border-gray-600 bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={deletingOrder === order._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrderClick(order._id);
                            }}
                            className="h-8 px-2 border-red-500 dark:border-red-600 bg-transparent text-red-500 dark:text-red-400 hover:bg-red-500 dark:hover:bg-red-600 hover:text-white"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </CardContent>

      {/* Enhanced Order Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl border-gray-200/60 dark:border-gray-700/60 text-gray-900 dark:text-white max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl">
          <DialogHeader className="pb-6 border-b border-gray-200/50 dark:border-gray-600/50">
            <DialogTitle className="flex items-center gap-4 text-2xl font-bold">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <span>Buyurtma #{selectedOrder?.orderNumber}</span>
                <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
                  {selectedOrder && new Date(selectedOrder.createdAt).toLocaleDateString('uz-UZ', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Mijoz ma'lumotlari
                    </h3>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p>
                        <span className="text-gray-500 dark:text-gray-400">Ism:</span>{' '}
                        {selectedOrder.userId?.name || "Noma'lum"}
                      </p>
                      {selectedOrder.userId?.phone && (
                        <p>
                          <span className="text-gray-500 dark:text-gray-400">Telefon:</span>{' '}
                          +998{selectedOrder.userId.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Buyurtma ma'lumotlari
                    </h3>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p><span className="text-gray-500 dark:text-gray-400">Sana:</span> {new Date(selectedOrder.createdAt).toLocaleDateString('uz-UZ')}</p>
                      <p><span className="text-gray-500 dark:text-gray-400">Vaqt:</span> {new Date(selectedOrder.createdAt).toLocaleTimeString('uz-UZ')}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                        {(() => {
                          const statusInfo = getOrderStatusInfo(selectedOrder.status);
                          const StatusIcon = statusInfo.icon;
                          return (
                            <Badge className={`${statusInfo.color} border`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Yetkazib berish manzili
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p><span className="text-gray-500 dark:text-gray-400">Manzil:</span> {selectedOrder.deliveryAddress?.address || 'Manzil ko\'rsatilmagan'}</p>
                    {selectedOrder.deliveryAddress?.city && (
                      <p><span className="text-gray-500 dark:text-gray-400">Shahar:</span> {selectedOrder.deliveryAddress.city}</p>
                    )}
                    {selectedOrder.deliveryAddress?.phone && (
                      <p><span className="text-gray-500 dark:text-gray-400">Telefon:</span> {selectedOrder.deliveryAddress.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Buyurtma tarkibi
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-md object-cover"
                          />
                        )}
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{item.name}</p>
                          {item.variantName && (
                            <p className="text-xs text-blue-500 dark:text-blue-400">Variant: {item.variantName}</p>
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.quantity} x {formatPrice(item.price, item.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total */}
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Jami summa:</span>
                  <span className="text-2xl font-bold text-red-500 dark:text-red-400">
                    {formatPrice(selectedOrder.total, selectedOrder.items?.[0]?.currency)}
                  </span>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-red-200/60 dark:border-red-800/60 text-gray-900 dark:text-white rounded-3xl shadow-2xl max-w-md">
          <DialogHeader className="text-center pb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
              <Trash2 className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Buyurtmani o'chirish
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Bu buyurtmani butunlay o'chirishni xohlaysizmi?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Bu amalni ortga qaytarib bo'lmaydi.
            </p>
          </div>
          <div className="flex gap-3 justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setOrderToDelete(null);
              }}
              className="px-6 py-2.5 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={confirmDeleteOrder}
              disabled={deletingOrder !== null}
              className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            >
              {deletingOrder ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  O'chirilmoqda...
                </div>
              ) : (
                "O'chirish"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default OrdersSection;
