import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Rasm URL'dan base64 ga o'tkazish
async function imageUrlToBase64(url) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

// Rasmni tahlil qilish va teglar olish (Clarifai REST API)
async function analyzeImage(imageBase64) {
  const PAT = process.env.CLARIFAI_API_KEY;
  
  if (!PAT) {
    throw new Error('CLARIFAI_API_KEY not configured');
  }

  const USER_ID = 'clarifai';
  const APP_ID = 'main';
  const MODEL_ID = 'general-image-recognition';
  const MODEL_VERSION_ID = 'aa7f35c01e0642fda5cf400f543e7c40';

  const raw = JSON.stringify({
    "user_app_id": {
      "user_id": USER_ID,
      "app_id": APP_ID
    },
    "inputs": [
      {
        "data": {
          "image": {
            "base64": imageBase64
          }
        }
      }
    ]
  });

  const requestOptions = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Key ${PAT}`,
      'Content-Type': 'application/json'
    },
    body: raw
  };

  try {
    console.log('🔄 Calling Clarifai API...');
    const response = await fetch(
      `https://api.clarifai.com/v2/models/${MODEL_ID}/versions/${MODEL_VERSION_ID}/outputs`,
      requestOptions
    );

    console.log('📥 Clarifai response status:', response.status);
    const result = await response.json();
    console.log('📥 Clarifai response:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('❌ Clarifai API error:', result);
      throw new Error(result.status?.description || `Clarifai API error: ${response.status}`);
    }

    if (result.status?.code !== 10000) {
      console.error('❌ Clarifai response error:', result.status);
      throw new Error(result.status?.description || 'Failed to analyze image');
    }

    // Teglarni olish
    const concepts = result.outputs[0].data.concepts;
    const tags = concepts
      .filter(c => c.value > 0.7) // Faqat 70% dan yuqori ishonchli teglar
      .map(c => c.name);

    return tags;
  } catch (error) {
    console.error('❌ Clarifai API request error:', error);
    throw error;
  }
}

// Rasm orqali mahsulot qidirish
router.post('/search-by-image', async (req, res) => {
  try {
    console.log('🔍 Image search request received');
    const { imageUrl, imageBase64 } = req.body;

    if (!imageUrl && !imageBase64) {
      console.log('❌ No image provided');
      return res.status(400).json({ message: 'Image URL yoki base64 kerak' });
    }

    // Rasmni tahlil qilish
    let base64Image = imageBase64;
    if (imageUrl && !imageBase64) {
      console.log('🔄 Converting image URL to base64...');
      base64Image = await imageUrlToBase64(imageUrl);
    }

    console.log('🔍 Analyzing image with Clarifai...');
    const tags = await analyzeImage(base64Image);
    console.log('✅ Image tags:', tags);

    if (tags.length === 0) {
      console.log('⚠️ No tags found');
      return res.json({
        products: [],
        tags: [],
        message: 'Rasmdan teglar topilmadi'
      });
    }

    // Teglar bo'yicha mahsulotlarni qidirish
    console.log('🔍 Searching products by tags...');
    const searchRegex = tags.map(tag => new RegExp(tag, 'i'));
    
    const products = await Product.find({
      $or: [
        { name: { $in: searchRegex } },
        { description: { $in: searchRegex } },
        { tags: { $in: tags } }
      ],
      inStock: { $ne: false }
    })
    .limit(20)
    .populate('category', 'name')
    .populate('store', 'name')
    .lean();

    console.log('✅ Found products:', products.length);

    // O'xshashlik foizini hisoblash
    const productsWithScore = products.map(product => {
      let score = 0;
      const productText = `${product.name} ${product.description || ''} ${product.tags?.join(' ') || ''}`.toLowerCase();
      
      tags.forEach(tag => {
        if (productText.includes(tag.toLowerCase())) {
          score += 1;
        }
      });

      return {
        ...product,
        similarityScore: (score / tags.length) * 100
      };
    });

    // O'xshashlik foiziga qarab saralash
    productsWithScore.sort((a, b) => b.similarityScore - a.similarityScore);

    res.json({
      products: productsWithScore,
      tags: tags,
      totalFound: productsWithScore.length
    });

  } catch (error) {
    console.error('❌ Image search error:', error);
    res.status(500).json({ 
      message: 'Rasm orqali qidirishda xatolik',
      error: error.message 
    });
  }
});

export default router;
