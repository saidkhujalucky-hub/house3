const config = window.MARKETPLACE_CONFIG || {};
const API_BASE_URL = String(config.apiBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1') ? 'Sayt hozir lokal backendga ulangan. GitHub Pages orqali ro‘yxatdan o‘tish uchun config.js faylida ommaviy HTTPS API manzilini ko‘rsating.' : `Backendga ulanib bo‘lmadi (${API_BASE_URL}). Server, HTTPS va CORS sozlamalarini tekshiring.`);
  }
  let data = null;
  try { data = await response.json(); } catch { /* empty response */ }
  if (!response.ok) {
    const detail = Array.isArray(data?.message) ? data.message.join(' • ') : data?.message;
    throw new ApiError(detail || `So‘rov bajarilmadi (HTTP ${response.status})`, response.status);
  }
  return data;
}

export const api = {
  baseUrl: API_BASE_URL,
  health: () => request('/categories'),
  categories: () => request('/categories'),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  authMe: (token) => request('/auth/me', { token }),
  profile: (token) => request('/users/me', { token }),
  editProfile: (token, body) => request('/users/me', { method: 'PATCH', token, body }),
  addCategory: (token, body) => request('/categories', { method: 'POST', token, body }),
  editCategory: (token, id, body) => request(`/categories/${encodeURIComponent(id)}`, { method: 'PATCH', token, body }),
  deleteCategory: (token, id) => request(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
  properties: (params={}) => request('/properties?'+new URLSearchParams(params)),
  myProperties: token => request('/properties/my',{token}),
  property: id => request('/properties/'+encodeURIComponent(id)),
  updateProperty: (token,id,body) => request('/properties/'+encodeURIComponent(id),{method:'PATCH',token,body}),
  createProperty: (token,body) => request('/properties',{method:'POST',token,body}),
  deleteProperty: (token,id) => request('/properties/'+encodeURIComponent(id),{method:'DELETE',token}),
  getFavorites: token => request('/favorites',{token}),
  addFavorite: (token,id) => request('/favorites/'+encodeURIComponent(id),{method:'POST',token}),
  removeFavorite: (token,id) => request('/favorites/'+encodeURIComponent(id),{method:'DELETE',token}),
  inquiries: token => request('/inquiries/my',{token}),
  adminProperties: (token,params={}) => request('/admin/properties?'+new URLSearchParams(params),{token}),
  adminStatus: (token,id,status) => request('/admin/properties/'+encodeURIComponent(id)+'/status',{method:'PATCH',token,body:{status}}),
  adminUsers: token => request('/admin/users',{token}),
  deleteImage: (token,id,imageId) => request('/properties/'+encodeURIComponent(id)+'/images/'+encodeURIComponent(imageId),{method:'DELETE',token}),
  sendInquiry: (token,id,body) => request('/properties/'+encodeURIComponent(id)+'/inquiries',{method:'POST',token,body}),
  // Uyma-uy API accepts one image per multipart request, key "image".
  uploadImages: async (token,id,files) => {
    const results=[];
    for(const file of files){
      const form=new FormData();form.append('image',file);
      let response;
      try{response=await fetch(API_BASE_URL+'/properties/'+encodeURIComponent(id)+'/images',{
        method:'POST',headers:{Authorization:'Bearer '+token},body:form
      });}catch{throw new ApiError('Rasm yuklashda serverga ulanib bo‘lmadi');}
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw new ApiError(Array.isArray(data?.message)?data.message.join(' • '):(data?.message||'Rasm yuklash xatosi'),response.status);
      results.push(data);
    }
    return results;
  },
};
