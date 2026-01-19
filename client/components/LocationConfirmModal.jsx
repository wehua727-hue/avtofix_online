import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, X, Edit } from "lucide-react";

/**
 * Modal for confirming delivery location before placing order
 */
const LocationConfirmModal = ({ isOpen, onClose, onConfirm, userLocation, onUpdateAddress }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditing, setIsEditing] = useState(!userLocation?.address);
  const [editedAddress, setEditedAddress] = useState(userLocation?.address || '');
  const [editedCity, setEditedCity] = useState(userLocation?.city || '');
  const [editedPhone, setEditedPhone] = useState(userLocation?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update state when userLocation changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const hasAddress = userLocation?.address && userLocation.address.trim() !== '';
      setIsEditing(!hasAddress);
      setEditedAddress(userLocation?.address || '');
      setEditedCity(userLocation?.city || '');
      setEditedPhone(userLocation?.phone || '');
    }
  }, [isOpen, userLocation]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm({
        address: (userLocation?.address || '').trim(),
        city: (userLocation?.city || '').trim(),
        phone: (userLocation?.phone || '').trim(),
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedAddress(userLocation?.address || '');
    setEditedCity(userLocation?.city || '');
    setEditedPhone(userLocation?.phone || '');
  };

  const handleSave = async () => {
    if (!editedAddress.trim()) {
      return;
    }
    
    setIsSaving(true);
    try {
      const updatedLocation = {
        address: editedAddress.trim(),
        city: editedCity.trim(),
        phone: editedPhone.trim()
      };
      
      if (onUpdateAddress) {
        await onUpdateAddress(updatedLocation);
      }
      
      setIsEditing(false);
      // После сохранения автоматически подтверждаем заказ
      await onConfirm(updatedLocation);
    } finally {
      setIsSaving(false);
    }
  };

  const address = isEditing ? editedAddress : userLocation?.address || 'Manzil ko\'rsatilmagan';
  const city = isEditing ? editedCity : userLocation?.city || '';
  const phone = isEditing ? editedPhone : userLocation?.phone || 'Telefon ko\'rsatilmagan';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Yetkazib berish manzili
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              Buyurtmangizni quyidagi manzilga yetkazib berishni tasdiqlaysizmi?
            </p>
            
            {/* Location display/edit */}
            <div className="p-4 rounded-xl bg-gray-700/50 border border-gray-600">
              {!isEditing ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">
                        {address}
                      </p>
                      {city && (
                        <p className="text-sm text-gray-400 mt-1">
                          {city}
                        </p>
                      )}
                      {phone && phone !== 'Telefon ko\'rsatilmagan' && (
                        <p className="text-sm text-gray-400 mt-1">
                          Tel: {phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleEditClick}
                    className="p-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white transition-colors"
                    title="Manzilni tahrirlash"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address" className="text-sm text-gray-300">
                      Manzil *
                    </Label>
                    <Input
                      id="address"
                      value={editedAddress}
                      onChange={(e) => setEditedAddress(e.target.value)}
                      placeholder="Manzilni kiriting"
                      className="mt-1 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-sm text-gray-300">
                      Shahar
                    </Label>
                    <Input
                      id="city"
                      value={editedCity}
                      onChange={(e) => setEditedCity(e.target.value)}
                      placeholder="Shahar nomi"
                      className="mt-1 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm text-gray-300">
                      Telefon raqami
                    </Label>
                    <Input
                      id="phone"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      placeholder="+998 90 123 45 67"
                      className="mt-1 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {!userLocation?.address && !isEditing && (
              <p className="text-sm text-yellow-400 mt-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Iltimos, yetkazib berish manzilini kiriting
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!isEditing ? (
              <>
                <Button
                  onClick={handleEditClick}
                  variant="outline"
                  className="flex-1 h-11 border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Yo'q
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirming || !userLocation?.address}
                  className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConfirming ? 'Buyurtma berilmoqda...' : 'Ha'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="flex-1 h-11 border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Bekor qilish
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !editedAddress.trim()}
                  className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationConfirmModal;
