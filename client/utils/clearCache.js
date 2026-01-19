// Cache tozalash utility
export const clearCategoriesCache = () => {
  try {
    // localStorage'dan kategoriyalar bilan bog'liq barcha ma'lumotlarni o'chirish
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('categor') || key.includes('catalog'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // sessionStorage'dan ham tozalash
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('categor') || key.includes('catalog'))) {
        sessionStorage.removeItem(key);
      }
    }
    
    console.log('✅ Categories cache cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return false;
  }
};

// Barcha cache'ni tozalash
export const clearAllCache = () => {
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ All cache cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing all cache:', error);
    return false;
  }
};
