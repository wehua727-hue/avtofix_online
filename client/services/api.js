const API_BASE_URL = '/api';

// Auth headers helper
const getAuthHeaders = () => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      return { "x-user-id": storedUserId };
    }
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser?.id) {
        return { "x-user-id": parsedUser.id };
      }
    }
  } catch (error) {
    console.warn("Failed to read auth headers:", error);
  }
  return {};
};

// Owner API
export const ownerAPI = {
  assignManager: async (storeId, managerUserId) => {
    const response = await fetch(`${API_BASE_URL}/owner/assign-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ storeId, managerUserId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Menedjerni tayinlashda xatolik");
    }
    return response.json();
  },
};

// Manager API
export const managerAPI = {
  getHelpers: async () => {
    const response = await fetch(`${API_BASE_URL}/manager/helpers`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Yordamchilarni olishda xatolik");
    }
    return response.json();
  },
  createHelper: async ({ name, phone, address, password, permissions }) => {
    const response = await fetch(`${API_BASE_URL}/manager/helpers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ name, phone, address, password, permissions }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Yordamchi yaratishda xatolik");
    }
    return response.json();
  },
  assignExistingHelper: async ({ userId, permissions }) => {
    const response = await fetch(`${API_BASE_URL}/manager/helpers/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ userId, permissions }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Yordamchini tayinlashda xatolik");
    }
    return response.json();
  },
  updateHelperPermissions: async (id, permissions) => {
    const response = await fetch(`${API_BASE_URL}/manager/helpers/${id}/permissions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ permissions }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Yordamchi huquqlarini yangilashda xatolik");
    }
    return response.json();
  },
  removeHelper: async (id) => {
    const response = await fetch(`${API_BASE_URL}/manager/helpers/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Yordamchini olib tashlashda xatolik");
    }
    return response.json();
  },
};

// Products API
export const productsAPI = {
  // Search products with filters
  search: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.q) params.set("q", options.q);
      if (options.minPrice) params.set("minPrice", options.minPrice);
      if (options.maxPrice) params.set("maxPrice", options.maxPrice);
      if (options.category) params.set("category", options.category);
      if (options.limit) params.set("limit", options.limit);
      
      const response = await fetch(`${API_BASE_URL}/products/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  },

  // Get search suggestions (autocomplete)
  getSuggestions: async (query) => {
    try {
      if (!query || query.length < 2) return [];
      const response = await fetch(`${API_BASE_URL}/products/suggestions?q=${encodeURIComponent(query)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  },

  // Get all products
  getAll: async (options = {}) => {
    try {
      const params = new URLSearchParams();

      if (options.storeId) {
        params.set("storeId", options.storeId);
      }

      if (options.includeInactive) {
        params.set("includeInactive", "true");
      }

      if (options.adminPanel) {
        params.set("adminPanel", "true");
      }

      if (options.page) {
        params.set("page", options.page);
      }

      if (options.limit) {
        params.set("limit", options.limit);
      }

      if (options.categoryId) {
        params.set("categoryId", options.categoryId);
      }

      if (options.minPrice) {
        params.set("minPrice", options.minPrice);
      }

      if (options.maxPrice) {
        params.set("maxPrice", options.maxPrice);
      }

      if (options.expandVariants) {
        params.set("expandVariants", "true");
      }

      const queryString = params.toString();
      const response = await fetch(
        `${API_BASE_URL}/products${queryString ? `?${queryString}` : ""}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get product by ID
  getById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Keyingi mahsulot kodini olish (magazin bo'yicha)
  getNextCode: async (storeId) => {
    try {
      const params = storeId ? `?storeId=${storeId}` : '';
      const response = await fetch(`${API_BASE_URL}/products/next-code${params}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to get next code');
      }
      const data = await response.json();
      return data.code;
    } catch (error) {
      console.error('Error getting next code:', error);
      return "1";
    }
  },

  // Create new product
  create: async (formData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Mahsulotni yaratib bo'lmadi");
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  },

  // Update product
  update: async (id, formData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Mahsulotni yangilashda xatolik");
      }
      return await response.json();
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  },

  // Delete product
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
};

export const storesAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/stores`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Magazinlarni olishda xatolik");
    }
    return response.json();
  },

  getById: async (storeId) => {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Magazin ma'lumotlarini olishda xatolik");
    }
    return response.json();
  },

  create: async (formData) => {
    const response = await fetch(`${API_BASE_URL}/stores`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Magazin qo'shishda xatolik");
    }

    return response.json();
  },

  update: async (storeId, formData) => {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Magazinni yangilashda xatolik");
    }

    return response.json();
  },

  remove: async (storeId) => {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Magazinni o'chirishda xatolik");
    }

    return response.json();
  },

  toggleVisibility: async (storeId, isVisible) => {
    const response = await fetch(`${API_BASE_URL}/stores/${storeId}/visibility`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ isVisible }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Magazin ko'rinishini o'zgartirishda xatolik");
    }

    return response.json();
  },
};

// Favorites API
export const favoritesAPI = {
  getFavorites: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/favorites/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch favorites");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching favorites:", error);
      throw error;
    }
  },

  toggleFavorite: async (userId, item) => {
    try {
      const response = await fetch(`${API_BASE_URL}/favorites/${userId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        throw new Error("Failed to toggle favorite");
      }
      return await response.json();
    } catch (error) {
      console.error("Error toggling favorite:", error);
      throw error;
    }
  },

  removeFavorite: async (userId, productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/favorites/${userId}/remove/${productId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to remove favorite");
      }
      return await response.json();
    } catch (error) {
      console.error("Error removing favorite:", error);
      throw error;
    }
  },
};

export const authAPI = {
  getCurrentUser: async (id) => {
    const response = await fetch(`${API_BASE_URL}/auth/${id}`);

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Foydalanuvchi ma'lumotlarini yuklashda xatolik");
    }

    return response.json();
  },

  register: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Ro'yxatdan o'tishda xatolik");
    }

    return response.json();
  },

  login: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Kirishda xatolik");
    }

    return response.json();
  },

  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = "Foydalanuvchilarni olishda xatolik";
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error || errorMessage;
      } catch (parseError) {
        const text = await response.text();
        if (text.startsWith("<!doctype") || text.startsWith("<html")) {
          errorMessage = "Server manzili topilmadi (404)";
        } else {
          errorMessage = text || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  update: async (id, payload) => {
    const response = await fetch(`${API_BASE_URL}/auth/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Profilni yangilashda xatolik");
    }

    return response.json();
  },

  updateRole: async (id, role) => {
    const headers = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    };

    const response = await fetch(`${API_BASE_URL}/auth/${id}/role`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Rolni yangilashda xatolik");
    }

    return response.json();
  },

  assignStore: async (id, storeId) => {
    const headers = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    };

    const response = await fetch(`${API_BASE_URL}/auth/${id}/assign-store`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ storeId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Magazin biriktirishda xatolik");
    }

    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/auth/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Foydalanuvchini o'chirishda xatolik");
    }

    return response.json();
  },
};

// Uploads API
export const uploadsAPI = {
  upload: async (file, scope = "") => {
    const form = new FormData();
    form.append("image", file);
    if (scope) form.append("scope", scope);

    const response = await fetch(`${API_BASE_URL}/uploads`, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.error || "Rasmni yuklashda xatolik");
    }

    return response.json(); // { filename, path, url, mimetype, size }
  },
};

// Professionals API
export const professionalsAPI = {
  // Get all professionals
  getAll: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.page) {
        params.set("page", options.page);
      }
      
      if (options.limit) {
        params.set("limit", options.limit);
      }
      
      if (options.adminPanel) {
        params.set("adminPanel", "true");
      }
      
      const queryString = params.toString();
      const response = await fetch(
        `${API_BASE_URL}/professionals${queryString ? `?${queryString}` : ""}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch professionals');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching professionals:', error);
      throw error;
    }
  },

  // Get professional by ID
  getById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/professionals/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch professional');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching professional:', error);
      throw error;
    }
  },

  // Create new professional
  create: async (professionalData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/professionals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(professionalData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to create professional');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating professional:', error);
      throw error;
    }
  },

  // Update professional
  update: async (id, professionalData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/professionals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(professionalData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to update professional');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating professional:', error);
      throw error;
    }
  },

  // Delete professional
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/professionals/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to delete professional');
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting professional:', error);
      throw error;
    }
  }
};

// Cart API
export const cartAPI = {
  // Get user's cart
  getCart: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  },

  // Add item to cart
  addItem: async (userId, item) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${userId}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Failed to add item to cart');
      }
      return await response.json();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  // Update item quantity
  updateQuantity: async (userId, productId, quantity) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${userId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity }),
      });
      if (!response.ok) {
        throw new Error('Failed to update cart');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating cart:', error);
      throw error;
    }
  },

  // Remove item from cart
  removeItem: async (userId, productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${userId}/remove/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove item from cart');
      }
      return await response.json();
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  },

  // Clear cart
  clearCart: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${userId}/clear`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to clear cart');
      }
      return await response.json();
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }
};

// Categories API
export const categoriesAPI = {
  // Get all categories as tree (public - no auth required)
  getAll: async (flat = false, storeId = null) => {
    try {
      // Public endpoint - auth kerak emas
      let url = `${API_BASE_URL}/categories/public`;
      if (flat) {
        url += '?flat=true';
      }
      // Cache'ni disable qilish uchun timestamp qo'shamiz
      const timestamp = Date.now();
      url += (flat ? '&' : '?') + `_t=${timestamp}`;
      
      const response = await fetch(url, {
        cache: 'no-store', // Cache'ni disable qilish
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get categories by parentId (for hierarchical picker)
  getByParent: async (parentId = null, storeId = null) => {
    try {
      const normalized = parentId == null ? 'null' : String(parentId);
      let url = `${API_BASE_URL}/categories?parentId=${encodeURIComponent(normalized)}`;
      if (storeId) {
        url += `&storeId=${storeId}`;
      }
      const response = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories by parent:', error);
      throw error;
    }
  },

  // Get single category by ID
  getById: async (id, storeId = null) => {
    try {
      let url = `${API_BASE_URL}/categories/${id}`;
      if (storeId) {
        url += `?storeId=${storeId}`;
      }
      const response = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch category');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  },

  // Create new category
  create: async (categoryData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  // Update category
  update: async (id, categoryData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  // Delete category
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // Reorder categories
  reorder: async (updates, storeId = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ updates, storeId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder categories');
      }
      return await response.json();
    } catch (error) {
      console.error('Error reordering categories:', error);
      throw error;
    }
  },
};

// Professional Categories API
export const professionalCategoriesAPI = {
  // Get all categories as tree
  getAll: async (flat = false) => {
    try {
      const url = flat ? `${API_BASE_URL}/professional-categories?flat=true` : `${API_BASE_URL}/professional-categories`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch professional categories');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching professional categories:', error);
      throw error;
    }
  },

  // Get categories by parentId (for hierarchical picker)
  getByParent: async (parentId = null) => {
    try {
      const normalized = parentId == null ? 'null' : String(parentId);
      const response = await fetch(`${API_BASE_URL}/professional-categories?parentId=${encodeURIComponent(normalized)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch professional categories');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching professional categories by parent:', error);
      throw error;
    }
  },

  // Create new category
  create: async (categoryData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/professional-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create professional category');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating professional category:', error);
      throw error;
    }
  },

  // Update category
  update: async (id, categoryData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/professional-categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update professional category');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating professional category:', error);
      throw error;
    }
  },

  // Delete category
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/professional-categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete professional category');
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting professional category:', error);
      throw error;
    }
  },
};

// Orders API
export const ordersAPI = {
  // Create new order
  create: async (orderData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Buyurtma yaratishda xatolik');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Get user's orders
  getMyOrders: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/my`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Buyurtmalarni yuklashda xatolik');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  },

  // Get all orders (admin only)
  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Buyurtmalarni yuklashda xatolik');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  // Get single order
  getById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Buyurtmani yuklashda xatolik');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  // Update order status (admin only)
  updateStatus: async (id, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Status yangilashda xatolik');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  // Delete order (admin/owner only)
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Buyurtmani o\'chirishda xatolik');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  },
};

// Car Brands API
export const carBrandsAPI = {
  // Get all car brands
  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/car-brands`);
      if (!response.ok) {
        throw new Error("Mashina brendlarini olishda xatolik");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching car brands:", error);
      throw error;
    }
  },

  // Add new car brand
  add: async (name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/car-brands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Mashina brendini qo'shishda xatolik");
      }
      return await response.json();
    } catch (error) {
      console.error("Error adding car brand:", error);
      throw error;
    }
  },

  // Search car brands
  search: async (query) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/car-brands/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error("Error searching car brands:", error);
      return [];
    }
  },
};

// Specialties API (Mutaxassisliklar)
export const specialtiesAPI = {
  // Get all specialties
  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/specialties`);
      if (!response.ok) {
        throw new Error("Mutaxassisliklarni olishda xatolik");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching specialties:", error);
      throw error;
    }
  },

  // Add new specialty
  add: async (name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/specialties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Mutaxassislik qo'shishda xatolik");
      }
      return await response.json();
    } catch (error) {
      console.error("Error adding specialty:", error);
      throw error;
    }
  },

  // Update specialty
  update: async (id, name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/specialties/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Mutaxassislikni tahrirlashda xatolik");
      }
      return await response.json();
    } catch (error) {
      console.error("Error updating specialty:", error);
      throw error;
    }
  },

  // Delete specialty
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/specialties/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Mutaxassislikni o'chirishda xatolik");
      }
      return await response.json();
    } catch (error) {
      console.error("Error deleting specialty:", error);
      throw error;
    }
  },
};


// Comments API
export const commentsAPI = {
  // Get unread comment counts for all products
  getUnreadCounts: async () => {
    try {
      const storedUserId = localStorage.getItem("userId");
      const storedUser = localStorage.getItem("user");
      let userId = storedUserId;
      
      if (!userId && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          userId = parsedUser?.id;
        } catch (e) {
          console.error("Error parsing user:", e);
        }
      }
      
      if (!userId) {
        return {}; // Agar user login qilmagan bo'lsa, bo'sh object qaytarish
      }
      
      const response = await fetch(`${API_BASE_URL}/comments/unread-counts`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      });
      if (!response.ok) {
        throw new Error("O'qilmagan izohlar sonini olishda xatolik");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching unread counts:", error);
      return {}; // Bo'sh object qaytarish
    }
  },

  // Mark product comments as read
  markAsRead: async (productId) => {
    try {
      const storedUserId = localStorage.getItem("userId");
      const storedUser = localStorage.getItem("user");
      let userId = storedUserId;
      
      if (!userId && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          userId = parsedUser?.id;
        } catch (e) {
          console.error("Error parsing user:", e);
        }
      }
      
      if (!userId) {
        return; // Agar user login qilmagan bo'lsa, hech narsa qilmaslik
      }
      
      const response = await fetch(`${API_BASE_URL}/comments/mark-read/${productId}`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error marking comments as read:', errorData);
        return; // Xatolikni throw qilmaslik
      }
      return await response.json();
    } catch (error) {
      console.error("Error marking comments as read:", error);
      // Xatolikni throw qilmaslik - foydalanuvchi tajribasini buzmaslik uchun
    }
  },
};
