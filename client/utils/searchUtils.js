// We can handle this by adding 'с' to the queries if 'c' is present, or just checking loosely.
// But for now, let's keep the map standard but add logic below.

const cyrillicToLatinMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'x', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': "'",
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': "o'", 'ғ': "g'"
};

const transliterate = (text, toCyrillic = true) => {
    let result = text.toLowerCase();
    const map = toCyrillic ? latinToCyrillicMap : cyrillicToLatinMap;

    // Maxsus harflar (sh, ch, yo, yu, ya, o', g')
    if (toCyrillic) {
        result = result
            .replace(/sh/g, 'ш')
            .replace(/ch/g, 'ч')
            .replace(/yo/g, 'ё')
            .replace(/yu/g, 'ю')
            .replace(/ya/g, 'я')
            .replace(/o'/g, 'ў')
            .replace(/g'/g, 'ғ');
    }

    return result.split('').map(char => map[char] || char).join('');
};

const calculateTotalRevenue = (item) => {
    const price = parseFloat(item.price || 0);
    const stock = parseInt(item.stockCount || item.stock || 0);
    return price * stock;
};

/**
 * Mahsulotlar va variantlarni qidirish funksiyasi
 * @param {Array} products - Mahsulotlar ro'yxati
 * @param {String} searchQuery - Qidiruv so'zi
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
            displayPrice: p.price || 0,
            displayStock: p.stockCount || 0,
            displayImage: p.imagePaths?.[0] || p.imageUrl || undefined,
            daromad: calculateTotalRevenue(p)
        }));
    }

    // Qidiruv so'zining muqobillarini yaratish (Lotin <-> Kirill)
    const qCyrillic = transliterate(q, true); // Lotindan Kirillga

    const queries = [q, qCyrillic];

    // Agar qidiruvda 'c' bo'lsa, 'с' (kirill es) ni ham qo'shib qo'yamiz (klaviatura adashish holati)
    if (q.includes('c')) {
        queries.push(q.replace(/c/g, 'с'));
    }

    const validQueries = queries.filter(Boolean);

    // Yordamchi funksiya: Matn ichida qidiruv so'zlaridan biri bormi?
    const matchesAny = (text) => {
        if (!text) return false;
        const lowerText = String(text).toLowerCase();
        return validQueries.some(query => lowerText.includes(query));
    };

    for (const product of products) {
        // 1. MAHSULOT QIDIRUVI
        const productMatches =
            matchesAny(product.name) ||
            matchesAny(product.sku) ||
            matchesAny(product.code) ||
            matchesAny(product.catalogNumber) ||
            matchesAny(product.description);

        // Agar mahsulot o'zi mos kelsa, uni qo'shamiz
        if (productMatches) {
            results.push({
                type: 'product',
                product,
                displayName: product.name,
                displayPrice: product.price || 0,
                displayStock: product.stockCount || 0,
                displayImage: product.imagePaths?.[0] || product.imageUrl || undefined,
                daromad: calculateTotalRevenue(product)
            });
        }

        // 2. XILLAR (VARIANTS) QIDIRUVI
        // variantSummaries yoki variants arrayini tekshirish
        const variants = product.variantSummaries || product.variants || [];

        if (variants.length > 0) {
            for (let i = 0; i < variants.length; i++) {
                const variant = variants[i];

                const variantMatches =
                    matchesAny(variant.name) ||
                    matchesAny(variant.sku) ||
                    matchesAny(variant.code) ||
                    matchesAny(variant.catalogNumber);

                if (variantMatches) {
                    // Narxni to'g'irlash
                    let displayPrice = variant.price || product.price || 0;
                    let displayStock = variant.stockCount ?? variant.stock ?? 0;

                    results.push({
                        type: 'variant',
                        product,
                        variant,
                        variantIndex: i,
                        displayName: `${variant.name}`,
                        displayPrice: displayPrice,
                        displayStock: displayStock,
                        displayImage: variant.imagePaths?.[0] || variant.imageUrl || product.imagePaths?.[0] || product.imageUrl || undefined,
                        daromad: parseFloat(displayPrice) * parseInt(displayStock)
                    });
                }
            }
        }
    }

    // FALLBACK: Agar client side deep-search hech narsa topmasa, lekin server ma'lumot qaytargan bo'lsa
    // Demak server regex'i nimadir topgan. Biz ularni shunchaki main product sifatida ko'rsatamiz.
    // Bu backend va frontend logic orasidagi farqni yopadi.
    if (results.length === 0 && products.length > 0) {
        return products.map(p => ({
            type: 'product',
            product: p,
            displayName: p.name,
            displayPrice: p.price || 0,
            displayStock: p.stockCount || 0,
            displayImage: p.imagePaths?.[0] || p.imageUrl || undefined,
            daromad: calculateTotalRevenue(p)
        }));
    }

    return results;
};
