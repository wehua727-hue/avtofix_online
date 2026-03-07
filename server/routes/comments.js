import express from 'express';
const router = express.Router();
import Comment from '../models/Comment.js';
import { authenticateToken } from '../middleware/auth.js';

// Barcha izohlarni olish (umumiy chat yoki mahsulot uchun)
router.get('/', async (req, res) => {
  try {
    const { productId, limit = 50, skip = 0, userId } = req.query;
    
    const filter = { isDeleted: false };
    if (productId) {
      filter.productId = productId;
    } else {
      filter.productId = null; // Umumiy chat
    }
    
    const comments = await Comment.find(filter)
      .sort({ createdAt: 1 }) // 1 = ascending (eski -> yangi)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();
    
    console.log('Comments sorted by createdAt ascending:', comments.map(c => ({
      id: c._id,
      text: c.text.substring(0, 20),
      createdAt: c.createdAt
    })));
    
    // ObjectId ni string ga aylantirish - user field ni to'g'ri format qilish
    const formattedComments = comments.map(comment => ({
      ...comment,
      user: comment.user?.toString() || comment.user,
      reactions: comment.reactions?.map(r => ({
        ...r,
        user: r.user?.toString() || r.user
      })) || []
    }));
    
    // Agar userId berilgan bo'lsa, foydalanuvchiga kelgan reply'lar sonini hisoblash
    let unreadReplies = 0;
    if (userId) {
      // Foydalanuvchining barcha commentlarini topish
      const userComments = formattedComments.filter(c => c.user === userId);
      const userCommentIds = userComments.map(c => c._id.toString());
      
      // Bu commentlarga reply qilingan commentlarni sanash
      unreadReplies = formattedComments.filter(c => 
        c.parentComment && userCommentIds.includes(c.parentComment.toString())
      ).length;
    }
    
    res.json({
      comments: formattedComments,
      unreadReplies
    });
  } catch (error) {
    console.error('Izohlarni olishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Yangi izoh qo'shish
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { text, productId, parentComment } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Izoh matni bo\'sh bo\'lishi mumkin emas' });
    }
    
    if (text.length > 1000) {
      return res.status(400).json({ message: 'Izoh 1000 belgidan oshmasligi kerak' });
    }
    
    const comment = new Comment({
      user: req.user.userId,
      userName: req.user.name || 'Foydalanuvchi',
      text: text.trim(),
      productId: productId || null,
      parentComment: parentComment || null,
      readBy: [req.user.userId] // O'zi yozgan izohni o'zi uchun o'qilgan deb belgilash
    });
    
    await comment.save();
    
    const populatedComment = await Comment.findById(comment._id).lean();
    
    // ObjectId ni string ga aylantirish
    const formattedComment = {
      ...populatedComment,
      user: populatedComment.user?.toString() || populatedComment.user,
      reactions: populatedComment.reactions?.map(r => ({
        ...r,
        user: r.user?.toString() || r.user
      })) || [],
      readBy: populatedComment.readBy?.map(id => id.toString()) || []
    };
    
    res.status(201).json(formattedComment);
  } catch (error) {
    console.error('Izoh qo\'shishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Reaksiya qo'shish/o'chirish
router.post('/:id/react', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const commentId = req.params.id;
    const userId = req.user.userId;
    
    const validEmojis = ['👍', '❤️', '😊', '🔥', '👏'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ message: 'Noto\'g\'ri emoji' });
    }
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Izoh topilmadi' });
    }
    
    // Foydalanuvchining aynan shu emoji bilan reaksiyasi bormi?
    const hasThisReaction = comment.reactions.some(
      r => r.user.toString() === userId && r.emoji === emoji
    );
    
    if (hasThisReaction) {
      // Agar aynan shu emoji bilan reaksiya qo'shgan bo'lsa, uni o'chirish
      comment.reactions = comment.reactions.filter(
        r => !(r.user.toString() === userId && r.emoji === emoji)
      );
    } else {
      // Aks holda, avval barcha eski reaksiyalarni o'chirish
      comment.reactions = comment.reactions.filter(
        r => r.user.toString() !== userId
      );
      // Keyin yangi reaksiya qo'shish
      comment.reactions.push({ user: userId, emoji });
    }
    
    await comment.save();
    
    // Yangilangan izohni qaytarish
    const updatedComment = await Comment.findById(commentId).lean();
    
    // ObjectId ni string ga aylantirish
    const formattedComment = {
      ...updatedComment,
      user: updatedComment.user?.toString() || updatedComment.user,
      reactions: updatedComment.reactions?.map(r => ({
        ...r,
        user: r.user?.toString() || r.user
      })) || []
    };
    
    res.json(formattedComment);
  } catch (error) {
    console.error('Reaksiya qo\'shishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Izohni o'chirish (faqat o'z izohi)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.userId;
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Izoh topilmadi' });
    }
    
    // Faqat o'z izohini o'chirish mumkin
    if (comment.user.toString() !== userId) {
      return res.status(403).json({ message: 'Ruxsat yo\'q' });
    }
    
    comment.isDeleted = true;
    await comment.save();
    
    res.json({ message: 'Izoh o\'chirildi' });
  } catch (error) {
    console.error('Izohni o\'chirishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Mahsulotlar uchun o'qilmagan izohlar sonini olish
router.get('/unread-counts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    // Faqat admin, owner, xodim uchun notification
    // Oddiy userlar uchun bo'sh object qaytarish
    if (!['admin', 'owner', 'xodim'].includes(userRole)) {
      return res.json({});
    }
    
    // Barcha mahsulotlar uchun o'qilmagan izohlar sonini hisoblash
    const unreadCounts = await Comment.aggregate([
      {
        $match: {
          isDeleted: false,
          productId: { $ne: null }, // Faqat mahsulot izohlarini
          readBy: { $nin: [userId] } // Foydalanuvchi o'qimagan (array ichida yo'q)
        }
      },
      {
        $group: {
          _id: '$productId',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Object formatiga o'tkazish: { productId: count }
    const countsMap = {};
    unreadCounts.forEach(item => {
      countsMap[item._id.toString()] = item.count;
    });
    
    res.json(countsMap);
  } catch (error) {
    console.error('O\'qilmagan izohlar sonini olishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Mahsulot izohlarini o'qilgan deb belgilash
router.post('/mark-read/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;
    
    // Mahsulotning barcha o'qilmagan izohlarini topish va o'qilgan deb belgilash
    const result = await Comment.updateMany(
      {
        productId: productId,
        isDeleted: false,
        readBy: { $nin: [userId] } // Foydalanuvchi hali o'qimagan (array ichida yo'q)
      },
      {
        $addToSet: { readBy: userId }
      }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} comments as read for product ${productId} by user ${userId}`);
    
    res.json({ 
      message: 'Izohlar o\'qilgan deb belgilandi',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Izohlarni o\'qilgan deb belgilashda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

export default router;
