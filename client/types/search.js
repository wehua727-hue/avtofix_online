// Universal qidiruv funksiyalari - mahsulotlar va variantlarni turli maydonlar bo'yicha qidirish

/**
 * @typedef {Object} SearchResultItem
 * @property {'product'|'variant'} type - Natija turi (mahsulot yoki xil)
 * @property {Object} product - Asosiy mahsulot obyekti
 * @property {Object} [variant] - Variant obyekti (faqat variantlar uchun)
 * @property {number} [variantIndex] - Variant indeksi (faqat variantlar uchun)
 * @property {string} displayName - Ko'rsatiladigan nom
 * @property {number} displayPrice - Ko'rsatiladigan narx
 * @property {number} displayStock - Ko'rsatiladigan stok
 * @property {string} [displayImage] - Ko'rsatiladigan rasm
 * @property {number} daromad - Umumiy daromad
 */

/**
 * Universal qidiruv funksiyasi - mahsulotlar va variantlarni turli maydonlar bo'yicha qidirish
 * Rus va kril alifbolariga mos ishlaydi
 * 
 * @param {Array} products - Mahsulotlar massivi
 * @param {string} searchQuery - Qidiruv so'rovi
 * @returns {Array} - Qidiruv natijalari
 */
export const searchProductsAndVariants = (products, searchQuery) => {
  const results = [];
  const q = searchQuery.toLowerCase().trim();
  
  // Agar qidiruv bo'sh bo'lsa - barcha mahsulotlarni qaytarish
  if (!q) {
    return products.map(p => ({
      type: 'product',
      product: p,
      displayName: p.name,
      displayPrice: Number(p.price) || 0,
      displayStock: p.stockCount || p.stock || 0,
      displayImage: p.imagePaths?.[0] || p.imageUrl || p.images?.[0] || undefined,
      daromad: (Number(p.price) || 0) * (p.stockCount || p.stock || 0)
    }));
  }
  
  for (const product of products) {
    // 1. MAHSULOT QIDIRUVI - ko'p maydonlar bo'yicha
    const productMatches = 
      product.name.toLowerCase().includes(q) || 
      (product.sku || '').toLowerCase().includes(q) ||
      (product.code || '').toLowerCase().includes(q) ||
      (product.catalogNumber || '').toLowerCase().includes(q);
    
    if (productMatches) {
      results.push({
        type: 'product',
        product,
        displayName: product.name,
        displayPrice: Number(product.price) || 0,
        displayStock: product.stockCount || product.stock || 0,
        displayImage: product.imagePaths?.[0] || product.imageUrl || product.images?.[0] || undefined,
        daromad: (Number(product.price) || 0) * (product.stockCount || product.stock || 0)
      });
    }
    
    // 2. XILLAR QIDIRUVI - variantlar maydonlari bo'yicha
    if (product.variantSummaries && Array.isArray(product.variantSummaries) && product.variantSummaries.length > 0) {
      for (let i = 0; i < product.variantSummaries.length; i++) {
        const variant = product.variantSummaries[i];
        
        const variantMatches = 
          (variant.name || '').toLowerCase().includes(q) ||
          (variant.sku || '').toLowerCase().includes(q) ||
          (variant.code || '').toLowerCase().includes(q) ||
          (variant.catalogNumber || '').toLowerCase().includes(q);
        
        if (variantMatches) {
          results.push({
            type: 'variant',
            product,
            variant,
            variantIndex: i,
            displayName: `${variant.name} (${product.name})`,
            displayPrice: Number(variant.price) || Number(product.price) || 0,
            displayStock: variant.stockCount || variant.stock || product.stockCount || product.stock || 0,
            displayImage: variant.imagePaths?.[0] || product.imagePaths?.[0] || product.imageUrl || product.images?.[0] || undefined,
            daromad: (Number(variant.price) || Number(product.price) || 0) * (variant.stockCount || variant.stock || product.stockCount || product.stock || 0)
          });
        }
      }
    }
  }
  
  return results;
};

/**
 * Rus va kril alifbolarini o'zaro almashtirish uchun xaritalar
 */
const CYRILLIC_TO_LATIN = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
};

const LATIN_TO_CYRILLIC = {
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'yo': 'ё', 'zh': 'ж', 'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'kh': 'х', 'ts': 'ц', 'ch': 'ч', 'sh': 'ш', 'shch': 'щ', 'e': 'э', 'yu': 'ю', 'ya': 'я',
  'A': 'А', 'B': 'Б', 'V': 'В', 'G': 'Г', 'D': 'Д', 'E': 'Е', 'Yo': 'Ё', 'Zh': 'Ж', 'Z': 'З', 'I': 'И', 'Y': 'Й', 'K': 'К', 'L': 'Л', 'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П', 'R': 'Р', 'S': 'С', 'T': 'Т', 'U': 'У', 'F': 'Ф', 'Kh': 'Х', 'Ts': 'Ц', 'Ch': 'Ч', 'Sh': 'Ш', 'Shch': 'Щ', 'E': 'Э', 'Yu': 'Ю', 'Ya': 'Я'
};

/**
 * Matnni kirildan lotinga o'girish
 * @param {string} text - Kirilcha matn
 * @returns {string} - Lotincha matn
 */
export const cyrillicToLatin = (text) => {
  return text.replace(/[А-Яа-яё]/g, (match) => CYRILLIC_TO_LATIN[match] || match);
};

/**
 * Matnni lotindan kirilga o'girish
 * @param {string} text - Lotincha matn
 * @returns {string} - Kirilcha matn
 */
export const latinToCyrillic = (text) => {
  return text.replace(/[A-Za-z]/g, (match) => LATIN_TO_CYRILLIC[match] || match);
};

/**
 * Rus va kril alifbolariga mos qidiruv - ikkala alifboda ham qidiradi
 * @param {Array} products - Mahsulotlar massivi
 * @param {string} searchQuery - Qidiruv so'rovi
 * @returns {Array} - Qidiruv natijalari
 */
export const searchProductsAndVariantsMultilingual = (products, searchQuery) => {
  const q = searchQuery.trim();
  if (!q) return searchProductsAndVariants(products, '');
  
  // Asl qidiruv
  const originalResults = searchProductsAndVariants(products, q);
  
  // Lotincha versiyasini qidirish (agar kiril bo'lsa)
  const latinQuery = cyrillicToLatin(q);
  const latinResults = searchProductsAndVariants(products, latinQuery);
  
  // Kirilcha versiyasini qidirish (agar lotin bo'lsa)
  const cyrillicQuery = latinToCyrillic(q);
  const cyrillicResults = searchProductsAndVariants(products, cyrillicQuery);
  
  // Barcha natijalarni birlashtirish va dublikatlarni olib tashlash
  const allResults = [...originalResults, ...latinResults, ...cyrillicResults];
  const uniqueResults = [];
  const seen = new Set();
  
  for (const result of allResults) {
    const key = result.type === 'variant' 
      ? `${result.product._id}-v${result.variantIndex}`
      : result.product._id;
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(result);
    }
  }
  
  return uniqueResults;
};

/**
 * Umumiy daromadni hisoblash
 * @param {Object} product - Mahsulot obyekti
 * @returns {number} - Umumiy daromad
 */
export const calculateTotalRevenue = (product) => {
  const price = Number(product.price) || 0;
  const stock = product.stockCount || product.stock || 0;
  return price * stock;
};

export default {
  searchProductsAndVariants,
  searchProductsAndVariantsMultilingual,
  cyrillicToLatin,
  latinToCyrillic,
  calculateTotalRevenue
};
