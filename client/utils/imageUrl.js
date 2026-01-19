// Утилита для получения правильного URL изображения
// Изображения хранятся с полным URL https://avtofix.uz/api/uploads/filename

export const getImageUrl = (imagePath) => {
  if (!imagePath) return '/placeholder.jpg';
  
  // Возвращаем путь как есть - изображения хранятся с полным URL
  return imagePath;
};

// Получить первое доступное изображение из продукта
export const getProductImage = (product) => {
  if (!product) return '/placeholder.jpg';
  
  const imagePath = 
    product.imageUrl || 
    product.imagePaths?.[0] || 
    product.images?.[0] || 
    product.image;
  
  return getImageUrl(imagePath);
};

export default getImageUrl;
