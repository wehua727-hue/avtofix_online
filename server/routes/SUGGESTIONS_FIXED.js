// Get search suggestions (autocomplete) - BARCHA MAHSULOTLAR
router.get("/suggestions", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }
    
    // Regex maxsus belgilarini escape qilish
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedQuery = escapeRegex(q.trim());
    
    // Qidiruv so'zi bilan boshlanadigan mahsulotlarni topish
    const searchRegex = `^${escapedQuery}`;
    
    console.log('💡 Suggestions query:', q, '-> regex:', searchRegex);
    
    // Barcha ko'rinadigan mahsulotlar (isHidden != true)
    const products = await Product.find({
      $or: [{ isHidden: { $ne: true } }, { isHidden: { $exists: false } }],
      name: { $regex: searchRegex, $options: 'i' }
    })
      .select('name variantSummaries sku')
      .limit(50)
      .lean();
    
    // Mahsulot nomlarini va variantlarni yig'ish
    const allSuggestions = [];
    
    products.forEach(product => {
      // Agar variantlar bo'lsa
      if (Array.isArray(product.variantSummaries) && product.variantSummaries.length > 0) {
        // Har bir variantni alohida qo'shish
        product.variantSummaries.forEach((variant, index) => {
          if (variant && variant.name) {
            // Format: "Элемент - Variant1" yoki faqat variant nomi
            const displayName = `${product.name} - ${variant.name}`;
            allSuggestions.push(displayName);
          }
        });
      } else {
        // Agar variantlar bo'lmasa, faqat mahsulot nomini qo'shish
        allSuggestions.push(product.name);
      }
    });
    
    // Unique qilish va limit (agar bir xil nomli mahsulotlar bo'lsa, barchasini ko'rsatish)
    const uniqueSuggestions = [...new Set(allSuggestions)].slice(0, 10);
    
    console.log('💡 Found suggestions:', uniqueSuggestions.length, 'from', products.length, 'products');
    
    res.json(uniqueSuggestions);
  } catch (error) {
    console.error("Error getting suggestions:", error);
    res.status(500).json({ error: "Tavsiyalarni olishda xatolik" });
  }
});
