import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Trash2, Reply, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function ProductComments({ productId, productName }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [highlightedComment, setHighlightedComment] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const { currentUser } = useAuth();
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  const commentRefs = useRef({});

  // Izohlarni yuklash
  useEffect(() => {
    fetchComments();
    // Har 30 soniyada yangilanish
    const interval = setInterval(fetchComments, 30000);
    return () => clearInterval(interval);
  }, [productId]);

  // Scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?productId=${productId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.comments && Array.isArray(data.comments)) {
          if (comments.length === 0) {
            setComments(data.comments);
          } else {
            const existingIds = new Set(comments.map(c => c._id));
            const newComments = data.comments.filter(c => !existingIds.has(c._id));
            if (newComments.length > 0) {
              setComments([...comments, ...newComments]);
            }
          }
        } else if (Array.isArray(data)) {
          if (comments.length === 0) {
            setComments(data);
          }
        }
      }
    } catch (error) {
      console.error('Izohlarni yuklashda xatolik:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('Izoh yozish uchun avval saytga kiring yoki ro\'yxatdan o\'ting');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Izoh matni bo\'sh bo\'lishi mumkin emas');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({
          text: newComment,
          productId: productId,
          parentComment: replyTo?._id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data]);
        setNewComment('');
        setReplyTo(null);
        toast.success('Izoh qo\'shildi');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Xatolik yuz berdi');
      }
    } catch (error) {
      console.error('Izoh qo\'shishda xatolik:', error);
      toast.error('Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUser.id}`
        }
      });

      if (response.ok) {
        setComments(comments.filter(c => c._id !== commentId));
        toast.success('Izoh o\'chirildi');
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Izohni o\'chirishda xatolik:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const scrollToComment = (commentId) => {
    const commentElement = commentRefs.current[commentId];
    if (commentElement) {
      commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedComment(commentId);
      setTimeout(() => setHighlightedComment(null), 2000);
    } else {
      toast.error('Izoh topilmadi yoki o\'chirilgan');
    }
  };

  const getAvatarGradient = (userId) => {
    if (!userId) return 'from-blue-500 via-purple-500 to-pink-500';
    
    const gradients = [
      'from-purple-500 via-pink-500 to-red-500',
      'from-blue-500 via-cyan-500 to-teal-500',
      'from-green-500 via-emerald-500 to-cyan-500',
      'from-yellow-500 via-orange-500 to-red-500',
      'from-pink-500 via-purple-500 to-indigo-500',
      'from-indigo-500 via-blue-500 to-cyan-500',
      'from-teal-500 via-green-500 to-lime-500',
      'from-orange-500 via-red-500 to-pink-500',
    ];
    
    const userIdStr = String(userId);
    const hash = userIdStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
  };

  const formatTime = (date) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diff = Math.floor((now - commentDate) / 1000);

    if (diff < 60) return 'Hozir';
    if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    return `${Math.floor(diff / 86400)} kun oldin`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Fikrlar ({comments.length})
        </h2>
      </div>

      {/* Comments List */}
      <div className="space-y-4 mb-6 max-h-[600px] overflow-y-auto">
        {comments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Hali izohlar yo'q</p>
            <p className="text-sm">Birinchi bo'lib izoh qoldiring!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              ref={(el) => (commentRefs.current[comment._id] = el)}
              className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-all ${
                highlightedComment === comment._id 
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : ''
              }`}
            >
              {/* Reply Preview */}
              {comment.parentComment && (
                <button
                  onClick={() => scrollToComment(comment.parentComment)}
                  className="w-full mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 mb-1">
                    <Reply className="w-3 h-3" />
                    <span className="font-semibold">
                      {comments.find(c => c._id === comment.parentComment)?.userName || 'Foydalanuvchi'} ga javob
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 pl-4">
                    {comments.find(c => c._id === comment.parentComment)?.text || 'Izoh topilmadi'}
                  </p>
                </button>
              )}

              {/* Comment Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(comment.user)} flex items-center justify-center text-white font-bold text-base shadow-lg ring-2 ring-white dark:ring-gray-800`}>
                      {comment.userName?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {comment.userName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {formatTime(comment.createdAt)}
                      </p>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap break-words">
                      {comment.text}
                    </p>
                  </div>
                </div>
                
                {currentUser && String(currentUser.id) === String(comment.user) && (
                  <button
                    onClick={() => setDeleteConfirm({ commentId: comment._id, show: true })}
                    className="flex-shrink-0 ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-all"
                    title="Izohni o'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Reply Button */}
              <div className="flex items-center gap-2 flex-wrap ml-13 mt-2">
                <button
                  onClick={() => setReplyTo(comment)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium"
                >
                  <Reply className="w-3 h-3" />
                  <span>Javob</span>
                </button>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        {replyTo && (
          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700 dark:text-gray-300">
                {replyTo.userName} ga javob
              </span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={currentUser ? "Izoh yozing..." : "Izoh yozish uchun kiring..."}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows="1"
            maxLength="1000"
            disabled={!currentUser || loading}
          />
          <button
            type="submit"
            disabled={!currentUser || loading || !newComment.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="font-semibold text-sm">Yuborish</span>
          </button>
        </form>
        {!currentUser && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Izoh yozish uchun <a href="/login" className="text-blue-600 hover:underline">kiring</a> yoki <a href="/login" className="text-blue-600 hover:underline">ro'yxatdan o'ting</a>
          </p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm?.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Izohni o'chirish</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Bu amalni qaytarib bo'lmaydi</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Rostdan ham bu izohni o'chirmoqchimisiz?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.commentId)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium"
              >
                Ha, o'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
