import { api } from './api.js?v=20261108-uyma-uy-v3';
import { mountMarket } from './features.js?v=20261108-uyma-uy-v4';
import { assignDemoPhotos, createResidenceListing, galleryViews, hasTour, MISSING_PHOTO } from './media.js?v=20261108-unique-rooms';
import { mountTour } from './tour.js?v=20261108-fix2';

const root = document.getElementById('app');
let market;
const TOKEN_KEY = 'marketplace-front-jwt';
const FAV_KEY = 'marketplace-front-demo-favorites';
const ASSET = './assets/';
const demoCategories = [
  { name: 'Uylar', slug: 'uylar', photo: 'category-house.webp', icon: 'house' },
  { name: 'Kvartiralar', slug: 'kvartiralar', photo: 'category-apartment.webp', icon: 'building' },
  { name: 'Villalar', slug: 'villalar', photo: 'category-villa.webp', icon: 'sun' },
  { name: 'Yer uchastkalari', slug: 'yer-uchastkalari', photo: 'category-land.webp', icon: 'layers' },
  { name: 'Tijorat obyektlari', slug: 'tijorat-obyektlari', photo: 'category-office.webp', icon: 'briefcase' },
  { name: 'Ijara', slug: 'ijara', photo: 'living-room.webp', icon: 'key' },
];
const houses = [
  {id:1,title:'Hashamatli villa, Yakkasaroy',city:'Toshkent',district:'Yakkasaroy',price:720000,category:'Villalar',type:'SALE',rooms:6,area:460,bathrooms:4,gallery:[],description:'Keng hovli, basseyn, yorug‘ mehmonxona va zamonaviy arxitekturaga ega hashamatli villa. Oilaviy hayot uchun qulay joylashuv va nafis interyer.'},
  {id:2,title:'Yangi kvartira, Chilonzor',city:'Toshkent',district:'Chilonzor',price:138000,category:'Kvartiralar',type:'SALE',rooms:3,area:92,bathrooms:2,gallery:[],description:'Yangi binoda joylashgan qulay 3 xonali kvartira. Keng yashash xonasi va zamonaviy loyiha.'},
  {id:3,title:'Kvartira ijaraga, Mirzo Ulug‘bek',city:'Toshkent',district:'Mirzo Ulug‘bek',price:650,category:'Kvartiralar',type:'RENT',rooms:2,area:65,bathrooms:1,gallery:[],description:'Yorug‘ va qulay jihozlangan kvartira. O‘qish va ishlash uchun kerakli sharoitlar bor.'},
  {id:4,title:'Zamonaviy uy, Bektemir',city:'Toshkent',district:'Bektemir',price:310000,category:'Uylar',type:'SALE',rooms:4,area:220,bathrooms:3,gallery:[],description:'Zamonaviy uslubdagi shinam xususiy uy. Keng oshxona, hovli va avtomobil uchun joy.'},
  {id:5,title:'Shinam hovli, Yunusobod',city:'Toshkent',district:'Yunusobod',price:275000,category:'Uylar',type:'SALE',rooms:5,area:300,bathrooms:2,gallery:[],description:'Sokin hududdagi oilaviy hovli, yashil maydon va keng xonalar.'},
  {id:6,title:'Biznes uchun zamonaviy ofis',city:'Toshkent',district:'Mirobod',price:390000,category:'Tijorat obyektlari',type:'SALE',rooms:7,area:265,bathrooms:2,gallery:[],description:'Kompaniya uchun zamonaviy ish joyi. Keng ofis maydoni va qulay transport.'},
  {id:7,title:'Yorug‘ studiya, Shayxontohur',city:'Toshkent',district:'Shayxontohur',price:480,category:'Kvartiralar',type:'RENT',rooms:1,area:46,bathrooms:1,gallery:[],description:'Ixcham va zamonaviy studiya-kvartira, qisqa yoki uzoq muddatga mo‘ljallangan.'},
  {id:8,title:'Keng yer uchastkasi, Zangiota',city:'Toshkent viloyati',district:'Zangiota',price:95000,category:'Yer uchastkalari',type:'SALE',rooms:0,area:600,bathrooms:0,gallery:[],description:'Yangi uy qurish uchun qulay hududdagi bo‘sh yer uchastkasi.'},
];

const additionalShowcase = [
  {"id":9,"title":"Bog‘li villa, Qibray","district":"Qibray","price":460000,"category":"Villalar","type":"SALE","rooms":6,"area":370,"bathrooms":3,"description":"Yashil hovli va ochiq terrasaga ega zamonaviy oilaviy villa."},
  {"id":10,"title":"Oilaviy hovli, Sergeli","district":"Sergeli","price":215000,"category":"Uylar","type":"SALE","rooms":5,"area":210,"bathrooms":2,"description":"Keng xonalari va shinam hovlisi bo‘lgan oilaviy uy."},
  {"id":11,"title":"Yorug‘ uy, Olmazor","district":"Olmazor","price":288000,"category":"Uylar","type":"SALE","rooms":4,"area":235,"bathrooms":2,"description":"Oddiy va nafis arxitektura, kunduzgi yorug‘likka boy yashash maydoni."},
  {"id":12,"title":"Yangi townhouse, Yashnobod","district":"Yashnobod","price":335000,"category":"Uylar","type":"SALE","rooms":5,"area":250,"bathrooms":3,"description":"Zamonaviy loyihaga ega ikki qavatli shaharcha uyi."},
  {"id":13,"title":"Tog‘ manzarali villa, Chorvoq","district":"Chorvoq","price":610000,"category":"Villalar","type":"SALE","rooms":7,"area":410,"bathrooms":4,"description":"Dam olish uchun keng hovlili villa va panoramali ko‘rinish."},
  {"id":14,"title":"Penthaus, Mirobod","district":"Mirobod","price":490000,"category":"Kvartiralar","type":"SALE","rooms":4,"area":184,"bathrooms":3,"description":"Shahar markaziga yaqin baland qavatdagi keng xonadon."},
  {"id":15,"title":"3 xonali kvartira, Olmazor","district":"Olmazor","price":125000,"category":"Kvartiralar","type":"SALE","rooms":3,"area":85,"bathrooms":1,"description":"Oila uchun qulay rejalashtirilgan zamonaviy kvartira."},
  {"id":16,"title":"Dizaynerlik kvartira, Chilonzor","district":"Chilonzor","price":172000,"category":"Kvartiralar","type":"SALE","rooms":3,"area":104,"bathrooms":2,"description":"Minimalistik interyer, qulay oshxona va yashash hududi."},
  {"id":17,"title":"Keng hovli, Uchtepa","district":"Uchtepa","price":245000,"category":"Uylar","type":"SALE","rooms":5,"area":265,"bathrooms":2,"description":"Oila va mehmonlar uchun mo‘ljallangan shinam hovli."},
  {"id":18,"title":"Modern villa, Parkent","district":"Parkent","price":520000,"category":"Villalar","type":"SALE","rooms":6,"area":350,"bathrooms":3,"description":"Yorug‘ fasadli yangi villa konsepti, katta maydon va ochiq terasa."},
  {"id":19,"title":"Jihozlangan kvartira ijaraga, Yakkasaroy","district":"Yakkasaroy","price":850,"category":"Kvartiralar","type":"RENT","rooms":3,"area":97,"bathrooms":2,"description":"Yangi ta’mirlangan, yashashga tayyor jihozlangan kvartira."},
  {"id":20,"title":"Hovlili uy, Qorasuv","district":"Qorasuv","price":365000,"category":"Uylar","type":"SALE","rooms":5,"area":295,"bathrooms":3,"description":"Yashil maydonli hovli, keng xona va avtomobil uchun joy."}
];
for (const listing of additionalShowcase) {
  houses.push({ ...listing, city: ['Qibray','Chorvoq','Parkent'].includes(listing.district) ? 'Toshkent viloyati' : 'Toshkent', gallery: [] });
}
// Demo suratlari e’lon IDsi bo‘yicha saqlanadi; kartochka va galereya bir suratdan foydalanadi.
assignDemoPhotos(houses);
houses.unshift(createResidenceListing());

const paths = {
 house:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
 pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 bed:'<path d="M3 18v-8m18 8v-8M3 13h18v5H3v-5Zm2-1V7h6v5m2 0V7h6v5"/>',
 bath:'<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3Zm2 8v2m12-2v2M7 12V6a3 3 0 0 1 6 0"/>',
 area:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 16 16 8m-5 0h5v5"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 users:'<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 left:'<path d="m15 18-6-6 6-6"/>',
 right:'<path d="m9 18 6-6-6-6"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 shield:'<path d="m12 22 7-4V7l-7-4-7 4v11l7 4Z"/><path d="m9 12 2 2 4-4"/>',
 bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 building:'<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M9 21v-3h6v3"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
 layers:'<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
 briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20"/>',
 key:'<circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 8-8L22 6l-3 3 2 2-3 3"/>',
 mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 edit:'<path d="M12 20h9M4 20h4l11-11a3 3 0 0 0-4-4L4 16v4Z"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 logout:'<path d="M10 17l5-5-5-5m5 5H3m9-9h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.8 1.4-2 3.4-2.2-.8a8 8 0 0 1-2.2 1.3l-.4 2.3h-4l-.4-2.3a8 8 0 0 1-2.2-1.3l-2.2.8-2-3.4 1.8-1.4a8 8 0 0 1 0-2.6L3.7 11l2-3.4 2.2.8A8 8 0 0 1 10 7.1l.4-2.3h4l.4 2.3a8 8 0 0 1 2.2 1.3l2.2-.8 2 3.4-1.8 1.4a8 8 0 0 1 0 2.6Z"/>',
 alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.7 7-4.4m-7 7 7 4.4"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
 filter:'<path d="M4 7h16M7 12h10m-7 5h4"/>',
 tag:'<path d="M20 13 13 20a2 2 0 0 1-3 0l-7-7V4h9l8 7a2 2 0 0 1 0 2Z"/><circle cx="7.5" cy="8" r="1"/>',
 link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m2 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>',
 checkcircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 crown:'<path d="M2 7 7 12l5-8 5 8 5-5-2 12H4L2 7Zm3 14h14"/>',
 globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
 camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3V7Z"/><circle cx="12" cy="13" r="4"/>',
 logout2:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
};
const I = (key, size = 18, cls = '') => `<svg class="i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key] || paths.house}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatMoney = p => `${p.currency==='UZS'?'so‘m ':'$'}${Number(p.price).toLocaleString('en-US')}${p.type === 'RENT' ? ' / oy' : ''}`;
const getFavs = () => { try { const v=JSON.parse(localStorage.getItem(FAV_KEY)||'[]'); return Array.isArray(v)?v.map(Number):[]; } catch { return []; } };
const state = { visibleListings: 12, categories: [], catStatus: 'loading', catError: '', user: null, token: sessionStorage.getItem(TOKEN_KEY)||'', favorites: getFavs(), menuOpen: false, filter: { location:'', category:'', type:'', max:'' }, galleryIndex: 0, detailTab:'about', editCategory:null, busy:false, propertyApi:'loading', propertyLoading:true, propertyMeta:null, propertyError:'', detailError:null };
const sampleCats = () => demoCategories.map(x=>({...x,demo:true}));
const currentCats = () => state.categories.length ? state.categories.map(c=>({...c, photo: getCategoryImage(c.name), icon: getCategoryIcon(c.name)})) : sampleCats();
const getCategoryImage = (name) => { const s=String(name).toLowerCase(); return s.includes('kvart')?'category-apartment.webp':s.includes('villa')?'category-villa.webp':s.includes('yer')?'category-land.webp':s.includes('tijor')||s.includes('ofis')?'category-office.webp':'category-house.webp'; };
const getCategoryIcon = name => { const s=String(name).toLowerCase(); return s.includes('kvart')?'building':s.includes('villa')?'sun':s.includes('yer')?'layers':s.includes('tijor')||s.includes('ofis')?'briefcase':'house'; };
// Full-size architectural photos. The small bundled photos remain as offline/error fallbacks.
const PHOTO_URLS = Object.freeze({
  'hero-villa.webp': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=78',
  'category-house.webp': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=72',
  'category-apartment.webp': 'https://images.unsplash.com/photo-1464938050520-ef2270bb8ce8?auto=format&fit=crop&w=600&q=72',
  'category-villa.webp': 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=600&q=72',
  'category-land.webp': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=72',
  'category-office.webp': 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=72',
  'villa-modern.webp': 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1400&q=78',
  'apartment.webp': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=78',
  'villa-pool.webp': 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=78',
  'living-room.webp': 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=78',
  'house-night.webp': 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=78',
});
const source = file => !file ? ASSET + MISSING_PHOTO : /^https?:\/\//i.test(String(file)) ? file : PHOTO_URLS[file] || ASSET + file;
const photoTag = (file, alt, cls='', loading='lazy') => {
  const backup = ASSET + MISSING_PHOTO;
  const main = cls.includes('detail-main-image');
  const thumb = cls.includes('gallery-thumb-image');
  const small = cls.includes('category-thumb');
  let imageUrl = source(file);
  const listingPhoto = /^(listings\/\d{2}|residence\/gallery\/[a-z0-9-]+)\.webp$/.test(String(file));
  const srcset = listingPhoto ? `srcset="${esc(ASSET + file.replace('.webp', '-card.webp'))} 720w, ${esc(ASSET + file)} 1600w" sizes="${main ? '(max-width: 900px) 100vw, 60vw' : thumb ? '150px' : '(max-width: 650px) 100vw, (max-width: 1050px) 50vw, 33vw'}"` : '';
  if (listingPhoto && !main) imageUrl = ASSET + file.replace('.webp', '-card.webp');
  if (/^https:\/\/images\.unsplash\.com\//i.test(imageUrl)) {
    const image = new URL(imageUrl);
    image.searchParams.set('w', main ? '1400' : thumb ? '180' : small ? '520' : '680');
    image.searchParams.set('q', main ? '78' : thumb ? '55' : '70');
    image.searchParams.set('auto', 'format');
    imageUrl = image.toString();
  }
  return `<img class="${cls}" src="${esc(imageUrl)}" ${srcset} alt="${esc(file ? alt : `Rasm hali qo‘shilmagan: ${alt}`)}" loading="${loading}" decoding="async" ${loading==='eager'?'fetchpriority="high"':'fetchpriority="low"'} onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.removeAttribute('srcset');this.src='${backup}'}" />`;
};
const url = (path, params={}) => { const q=new URLSearchParams(Object.entries(params).filter(([k,v])=>String(v).length>0)); return `#/${path}${q.size?'?'+q:''}`; };
const route = () => {const text=decodeURI(location.hash.slice(1)||'/'); const [path,query='']=text.split('?'); return { path: path||'/', query: new URLSearchParams(query) }; };
const navigate = (path) => { state.menuOpen=false; if (location.hash === path) { render(); window.scrollTo({top:0,behavior:'smooth'}); } else location.hash=path; };
let toastHandle;
function toast(message, kind='success') { const el=document.getElementById('toast'); el.className=`toast show ${kind}`; el.innerHTML=`${I(kind==='error'?'alert':'checkcircle',19)}<span>${esc(message)}</span>`; clearTimeout(toastHandle); toastHandle=setTimeout(()=>el.className='toast',4400); }
function status() { return state.catStatus==='ok' ? `<span class="status-pip online"></span> Backend ulangan` : `<span class="status-pip offline"></span> ${state.catStatus==='loading'?'Tekshirilmoqda':'Demo rejim'}`; }
function sampleBadge() { return state.propertyApi==='online'?'':`<div class="demo-note">${I('info',15)} Backendga ulanish yo‘q. Bu e’lonlar namunaviy suratlar bilan ko‘rsatilmoqda.</div>`; }
function navbar(current){
 const active = (p) => current===p || (p==='listings'&&current==='detail');
 const navItems=[['Bosh sahifa','#/','home'],['Kategoriyalar','#/categories','categories'],["E’lonlar",'#/listings','listings'],['Biz haqimizda','#/about','about']];
 return `<header class="header"><div class="header-inner container">
   <a href="#/" class="logo" aria-label="MarketPlace bosh sahifa">${I('house',31)}<span>Market<span class="accent">Place</span></span></a>
   <nav class="nav-links ${state.menuOpen?'open':''}">${navItems.map(([label,href,p])=>`<a href="${href}" class="nav-link ${active(p)?'active':''}">${label}</a>`).join('')}</nav>
   <div class="header-actions"><a href="#/favorites" class="icon-button ${current==='favorites'?'selected':''}" title="Sevimlilar" aria-label="Sevimlilar">${I('heart',21)}${state.favorites.length?`<span class="dot-counter">${state.favorites.length}</span>`:''}</a>
   <span class="header-divider"></span>
   ${state.user?`<a class="user-pill" href="#/profile">${I('user',16)}<span>${esc(state.user.fullName.split(' ')[0])}</span></a>`:`<a class="login-link" href="#/login">${I('user',17)} Kirish</a><a class="btn btn-sm btn-primary register-top" href="#/register">Ro‘yxatdan o‘tish</a>`}
   <button type="button" class="icon-button mobile-toggle" aria-label="Menyuni ochish" data-action="toggle-menu">${I(state.menuOpen?'x':'menu',23)}</button></div>
 </div></header>`;
}
function footer(){return `<footer class="footer container"><div class="footer-brand"><div class="logo">${I('house',30)}<span>Market<span class="accent">Place</span></span></div><p>Orzuingizdagi uy sari birinchi qadam.<br>Ko‘chmas mulk uchun zamonaviy platforma.</p><small>© 2026 MarketPlace. Frontend namoyishi.</small></div><div><strong>Platforma</strong><a href="#/">Bosh sahifa</a><a href="#/categories">Kategoriyalar</a><a href="#/listings">E’lonlar</a></div><div><strong>Shaxsiy sahifa</strong><a href="#/profile">Mening profilim</a><a href="#/favorites">Sevimlilar</a><a href="#/about">Loyiha haqida</a></div><div><strong>Backend holati</strong><div class="footer-status">${status()}</div><small>API: <span class="wrap-anywhere">${esc(api.baseUrl)}</span></small></div></footer>`;}
function pageBanner(title,sub='',right=''){return `<div class="page-banner"><div><span class="eyebrow">MARKETPLACE</span><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>${right}</div>`;}
function categoryCard(cat){return `<a class="category-card" href="${url('listings',{category:cat.name})}"><div class="cat-cover">${photoTag(cat.photo||getCategoryImage(cat.name),cat.name,'category-thumb')}</div><div class="cat-shade"></div><div class="cat-text"><span class="cat-icon">${I(cat.icon||getCategoryIcon(cat.name),20)}</span><strong>${esc(cat.name)}</strong><span>${I('arrow',15)}</span></div></a>`;}
function propertyCard(p){const liked=state.favorites.includes(p.id);return `<article class="property-card"><a href="#/property/${p.id}" class="property-image">${photoTag(p.photo,p.title)}<span class="type-badge ${p.type==='RENT'?'rent':''}">${p.type==='RENT'?'Ijara':'Sotuvda'}</span>${hasTour(p)?`<span class="property-tour-pill">◈ 3D TUR</span>`:''}</a><button class="favorite-button ${liked?'liked':''}" type="button" aria-label="${liked?'Sevimlilardan olib tashlash':'Sevimlilarga qo‘shish'}" data-action="favorite" data-id="${p.id}">${I('heart',19)}</button><div class="property-info"><a href="#/property/${p.id}" class="property-title">${esc(p.title)}</a><p class="property-location">${I('pin',14)} ${esc(p.city)}, ${esc(p.district)}</p><div class="property-bottom"><strong class="price">${formatMoney(p)}</strong><div class="property-features">${p.rooms?`<span>${I('bed',14)}${p.rooms}</span>`:''}<span>${I('area',14)}${p.area} m²</span></div></div></div></article>`;}
function homePage(){return `<main>
 <section class="hero"><div class="hero-photo" aria-hidden="true"></div><div class="hero-violet-glow" aria-hidden="true"></div><div class="hero-content container"><div class="hero-copy"><div class="hero-label">${I('shield',16)} O‘ZBEKISTONDA ZAMONAVIY KO‘CHMAS MULK PLATFORMASI</div><h1>Orzuingizdagi<br>uyni <span>toping</span></h1><p>Toshkent va O‘zbekiston bo‘ylab eng yaxshi uy-joy takliflari bir joyda. Sotib oling, soting yoki ijaraga bering.</p><div class="hero-trust"><span>${I('shield',17)} Qulay va ishonchli</span><span>${I('bolt',17)} Tez qidiruv</span><span>${I('users',17)} Barchasi bir joyda</span></div></div>
 <form id="hero-search" class="hero-search" autocomplete="off"><div class="hero-input">${I('house',23)}<label>Joy turi<select name="category"><option value="">Barchasi</option>${currentCats().map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}</select></label></div><div class="search-sep"></div><div class="hero-input">${I('pin',23)}<label>Hudud<select name="location"><option value="">Barcha hududlar</option>${(state.propertyApi==='online'?['Toshkent','Samarqand','Buxoro','Farg‘ona','Andijon','Namangan']:['Yakkasaroy','Chilonzor','Yunusobod','Mirzo Ulug‘bek','Bektemir','Mirobod','Zangiota']).map(x=>`<option>${esc(x)}</option>`).join('')}</select></label></div><div class="search-sep"></div><div class="hero-input">${I('tag',22)}<label>Narx (USD)<select name="max"><option value="">Barchasi</option><option value="100000">$100,000 gacha</option><option value="300000">$300,000 gacha</option><option value="500000">$500,000 gacha</option><option value="1000000">$1,000,000 gacha</option></select></label></div><button class="btn btn-primary search-submit" type="submit">${I('search',21)} Qidirish</button></form></div></section>
 <section class="section container"><div class="section-head"><div><span class="small-label">KATEGORIYALAR</span><h2>Mashhur kategoriyalar</h2><p>O‘zingizga mos ko‘chmas mulk turini tanlang</p></div><a class="text-link" href="#/categories">Barchasini ko‘rish ${I('arrow',18)}</a></div>${state.catStatus!=='ok'?`<div class="tiny-notice">${I('info',14)} ${state.catStatus==='loading'?'Kategoriyalar yuklanmoqda':'Backend ulanmagan yoki kategoriyalar bo‘sh. Namuna kategoriyalar ko‘rsatilmoqda.'}</div>`:''}<div class="categories-grid">${currentCats().slice(0,6).map(categoryCard).join('')}</div></section>
 <section class="section listings-section container"><div class="section-head"><div><span class="small-label">TANLANGAN UYLAR</span><h2>So‘nggi e’lonlar <span class="title-sparkle">✦</span></h2><p>Eng chiroyli uy va kvartira namunalarini kashf eting</p></div><a class="text-link" href="#/listings">Barchasini ko‘rish ${I('arrow',18)}</a></div><div class="section-toolbar"><div class="tabs" role="tablist"><a href="${url('listings')}" class="tab active">Barchasi</a><a href="${url('listings',{type:'SALE'})}" class="tab">Sotuvda</a><a href="${url('listings',{type:'RENT'})}" class="tab">Ijaraga beriladi</a></div><span class="tiny-demo-tag">${I('info',14)} Demo e’lonlar</span></div><div class="properties-grid">${houses.slice(0,8).map(propertyCard).join('')}</div>${sampleBadge()}</section>
 <section class="section container"><div class="journey-banner"><div class="journey-art">${photoTag('hero-villa.webp','Zamonaviy villa')}</div><div class="journey-copy"><span class="small-label">SIZNING YANGI MANZILINGIZ</span><h2>Yangi hayot yangi uydan boshlanadi</h2><p>Har bir uy — alohida hikoya. O‘zingiznikini topish uchun katalogni ko‘ring.</p><a href="#/listings" class="btn btn-primary">E’lonlarni ko‘rish ${I('arrow',17)}</a></div></div></section>
 </main>`;}
function categoriesPage(){let cats=currentCats();return `<main class="container inside-page">${pageBanner('Kategoriyalar','O‘zingizga mos ko‘chmas mulk turini tanlang.')}<div class="info-strip">${I('info',19)} ${state.catStatus==='ok' ? `Backenddan ${state.categories.length} ta kategoriya olindi.${state.categories.length?'':' Namuna kartalar ham ko‘rsatilmoqda.'}` : 'Backend bilan aloqa yo‘q. Namuna kategoriya kartalari ko‘rsatilmoqda.'}</div><div class="categories-grid categories-large">${cats.map(categoryCard).join('')}</div></main>`;}
function getFilters(q){return {category:q.get('category')||'',location:q.get('location')||'',type:q.get('type')||'',max:q.get('max')||'',min:q.get('min')||'',rooms:q.get('rooms')||'',sort:q.get('sort')||'newest'};}
function applyFilters(items, filters){const f=filters;return items.filter(p=>{
 const isCat=!f.category||p.category.toLowerCase()===f.category.toLowerCase()||((f.category.toLowerCase().includes('uy'))&&p.category==='Uylar')||(f.category.toLowerCase()==='ijara'&&p.type==='RENT');
 const isLoc=!f.location||`${p.city} ${p.district}`.toLowerCase().includes(f.location.toLowerCase());
 return isCat && isLoc && (!f.type||p.type===f.type) && (!f.max || p.price<=Number(f.max)) && (!f.min || p.price>=Number(f.min)) && (!f.rooms || p.rooms===Number(f.rooms));
});}
function filterField(label,name,value,options){return `<label class="form-field"><span>${label}</span><select name="${name}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;}
function listingPage(q){const f=getFilters(q);const visible=state.propertyApi==='online'?houses:applyFilters(houses,f);const optsCats=[['','Barcha kategoriyalar'],...currentCats().map(c=>[c.name,c.name])]; const optsLoc=[['',state.propertyApi==='online'?'Barcha shaharlar':'Barcha hududlar'], ...(state.propertyApi==='online'?['Toshkent','Samarqand','Buxoro','Farg‘ona','Andijon','Namangan','Qarshi','Nukus']:['Yakkasaroy','Chilonzor','Mirzo Ulug‘bek','Yunusobod','Bektemir','Mirobod','Zangiota','Sergeli','Olmazor','Yashnobod','Uchtepa','Qibray','Parkent','Chorvoq','Qorasuv','Shayxontohur']).map(x=>[x,x])];return `<main class="container inside-page">${pageBanner('Ko‘chmas mulk e’lonlari','Sotuv va ijara uchun zamonaviy uylar — dizayn namunalari.',`<a class="btn btn-primary" href="#/add-listing">${I('plus',18)} E’lon joylash</a>`)}${sampleBadge()}<div class="listing-layout"><aside class="filter-panel"><div class="filter-title">${I('filter',21)} <h3>Qidiruv va filtrlar</h3></div><form id="listing-filter" class="filter-form">${filterField('Kategoriya','category',f.category,optsCats)}${filterField('Hudud','location',f.location,optsLoc)}${filterField('E’lon turi','type',f.type,[['','Barchasi'],['SALE','Sotuv'],['RENT','Ijara']])}${filterField('Maksimal narx (USD)','max',f.max,[['','Cheklanmagan'],['1000','$1,000'],['100000','$100,000'],['300000','$300,000'],['500000','$500,000'],['1000000','$1,000,000']])}<label class="form-field"><span>Minimal narx</span><input type="number" min="0" name="min" value="${esc(f.min)}" placeholder="0" /></label><label class="form-field"><span>Xonalar soni</span><input type="number" min="1" name="rooms" value="${esc(f.rooms)}" placeholder="Barchasi" /></label>${filterField('Saralash','sort',f.sort,[['newest','Eng yangi'],['price_asc','Arzonidan'],['price_desc','Qimmatidan']])}<button class="btn btn-primary full" type="submit">${I('search',18)} Natijalarni ko‘rish</button><a class="reset-filters" href="#/listings">Filtrlarni tozalash</a></form></aside><div class="results"><div class="results-top"><div><h2>E’lonlar</h2><p>${visible.length} ta namuna topildi</p></div><span class="chip">${I('grid',16)} Kartalar</span></div>${visible.length?`<div class="properties-grid listing-grid">${visible.slice(0,state.visibleListings).map(propertyCard).join('')}</div>${visible.length>state.visibleListings?`<div class="load-more-wrap"><button type="button" class="btn btn-outline load-more" data-action="load-more">${I('plus',18)} Yana ${Math.min(12,visible.length-state.visibleListings)} ta e’lonni ko‘rish</button><p>${Math.min(state.visibleListings,visible.length)} / ${visible.length} ta e’lon ko‘rsatilmoqda</p></div>`:''}`:`<div class="empty-state">${I('search',40)}<h3>Natija topilmadi</h3><p>Filtrlarni o‘zgartirib ko‘ring.</p><a class="btn btn-primary" href="#/listings">Barcha e’lonlar</a></div>`}</div></div></main>`;}
function detailPage(id){const p=houses.find(x=>x.id===Number(id));if(!p) return state.propertyApi==='online'&&state.detailError!==Number(id)?'<main class="container inside-page"><div class="empty-state"><h2>E’lon yuklanmoqda…</h2></div></main>':notFound();const views=galleryViews(p), index=views.length?state.galleryIndex%views.length:0, active=views[index]||{file:null,zoom:1,origin:'50% 50%'};let detailBody='';if(state.detailTab==='about') detailBody=`<h3>E’lon tavsifi</h3><p>${esc(p.description)}</p>${p.real?'':'<p>Bu e’lon faqat namuna uchun berilgan.</p>'}`;else if(state.detailTab==='features') detailBody=`<h3>Xususiyatlar</h3><div class="features-list"><span>${I('pin',18)} Hudud <b>${esc(p.district)}</b></span><span>${I('area',18)} Maydon <b>${p.area} m²</b></span>${p.rooms?`<span>${I('bed',18)} Xonalar <b>${p.rooms}</b></span>`:''}<span>${I('key',18)} Turi <b>${p.type==='SALE'?'Sotuv':'Ijara'}</b></span></div>`;else if(state.detailTab==='place') detailBody=`<h3>Joylashuv</h3><div class="location-display">${I('pin',28)}<div><b>${esc(p.city)}, ${esc(p.district)}</b><p>${p.real?'Manzil e’lon egasi kiritgan ma’lumot asosida berilgan.':'Bu namunaviy e’lon, haqiqiy manzil berilmagan.'}</p></div></div>`;else detailBody=`<h3>Sotuvchi haqida</h3><p>${p.real&&p.owner?esc(p.owner.fullName)+' · '+esc(p.owner.phone||'Telefon kiritilmagan'): 'Namuna uylar uchun real aloqa mavjud emas.'}</p>`;
 return `<main class="container inside-page detail-page"><div class="breadcrumb"><a href="#/">Bosh sahifa</a>${I('right',15)}<a href="#/listings">E’lonlar</a>${I('right',15)}<span>${esc(p.title)}</span></div><div class="detail-top"><div class="detail-gallery"><div class="main-photo"><div class="gallery-image-frame" style="--photo-zoom:${active.zoom};--photo-origin:${active.origin}">${photoTag(active.file,p.title,'detail-main-image','eager')}</div>${views.length>1?`<span class="image-count">${I('camera',16)} ${index+1} / ${views.length}${p.gallery.length===1?' ko‘rinish':''}</span><button class="gallery-control prev" type="button" data-action="gallery-prev" data-id="${p.id}" aria-label="Oldingi rasm">${I('left',22)}</button><button class="gallery-control next" type="button" data-action="gallery-next" data-id="${p.id}" aria-label="Keyingi rasm">${I('right',22)}</button>`:''}${hasTour(p)?`<div class="tour-photo-overlay"><span class="tour-live-dot">◈ AYNAN SHU UYNING 3D MODELI</span><button type="button" class="btn btn-primary" data-tour-id="${p.id}">${I('house',18)} 3D sayohatni ochish</button></div>`:''}</div>${views.length?`<div class="gallery-section-heading"><h2>${p.gallery.length===1?'Rasm ko‘rinishlari':'Uy rasmlari'}</h2><span>${hasTour(p)?'3D modelning o‘zidan olingan':p.gallery.length===1?'Umumiy surat va yaqinlashtirilgan detallar':`${p.galleryNote?p.galleryNote+' · ':''}${p.gallery.length} ta rasm`}</span></div><div class="gallery-thumbs" aria-label="E’lon rasmlari">${views.map((view,i)=>`<button class="gallery-thumb ${index===i?'active':''}" data-action="gallery-set" data-index="${i}" type="button" aria-pressed="${index===i}" aria-label="${esc(view.label)}"><span class="gallery-thumb-visual" style="--photo-zoom:${view.zoom};--photo-origin:${view.origin}">${photoTag(view.file,p.title+' — '+view.label,'gallery-thumb-image')}</span><span class="gallery-thumb-caption">${esc(view.label)}</span></button>`).join('')}</div>`:''}${hasTour(p)?`<div class="tour-hint">${I('house',19)} <div><b>Rasmdagi uyning ichida yuring</b><small>2 qavat · Mehmonxona · Oshxona · Yotoqxonalar · Basseyn</small></div><button type="button" class="text-link" data-tour-id="${p.id}">3D ochish</button></div>`:''}</div><div class="detail-summary card-surface"><div class="details-inline"><span class="type-badge static-badge ${p.type==='RENT'?'rent':''}">${p.type==='RENT'?'Ijaraga':'Sotuvda'}</span><div class="detail-action-icons"><button type="button" class="icon-button ${state.favorites.includes(p.id)?'liked':''}" data-action="favorite" data-id="${p.id}" aria-label="Sevimlilarga qo‘shish">${I('heart',20)}</button><button type="button" class="icon-button" data-action="share" aria-label="Havolani nusxalash">${I('share',19)}</button></div></div><h1>${esc(p.title)}</h1><p class="property-location">${I('pin',16)} ${esc(p.city)}, ${esc(p.district)}</p><div class="big-price">${formatMoney(p)}</div><div class="detail-stats">${p.rooms?`<span>${I('bed',18)} ${p.rooms} xona</span>`:''}<span>${I('area',18)} ${p.area} m²</span>${p.bathrooms?`<span>${I('bath',18)} ${p.bathrooms} sanuzel</span>`:''}</div>${hasTour(p)?`<button type="button" data-tour-id="${p.id}" class="btn btn-primary full 3d-detail-btn">${I('house',19)} 3D ichiga kirib ko‘rish</button>`:''}<button type="button" class="btn btn-primary full" data-action="demo-contact">${I('mail',18)} Sotuvchi bilan bog‘lanish</button><button type="button" class="btn btn-outline full" data-action="favorite" data-id="${p.id}">${I('heart',18)} ${state.favorites.includes(p.id)?'Sevimlilardan olib tashlash':'Sevimlilarga qo‘shish'}</button>${p.real?'':`<p class="summary-disclaimer">${I('info',15)} Bu uy demo ma’lumotlari asosida ko‘rsatilgan.</p>`}</div></div><div class="detail-tabs card-surface"><div class="detail-tabs-nav">${[['about','Tavsif'],['features','Xususiyatlar'],['place','Joylashuv'],['seller','Sotuvchi haqida']].map(([k,label])=>`<button type="button" data-action="detail-tab" data-tab="${k}" class="detail-tab ${state.detailTab===k?'active':''}">${label}</button>`).join('')}</div><div class="detail-tab-content">${detailBody}</div></div><div class="section-head related-title"><div><h2>Shunga o‘xshash e’lonlar</h2><p>Ko‘proq variantlarni ko‘ring</p></div><a class="text-link" href="#/listings">Barchasini ko‘rish ${I('arrow',16)}</a></div><div class="properties-grid">${houses.filter(x=>x.id!==p.id).slice(0,3).map(propertyCard).join('')}</div></main>`;}
function favPage(){const fav=houses.filter(p=>state.favorites.includes(p.id));return `<main class="container inside-page">${pageBanner('Sevimlilar','Sizga yoqqan uylar ro‘yxati.')}<div class="info-strip">${I('info',19)} ${state.propertyApi==='online'?'Sevimlilar profil orqali serverda saqlanadi.':'Backend ulanmagan: demo sevimlilar faqat brauzerda saqlanadi.'}</div>${fav.length?`<div class="properties-grid">${fav.map(propertyCard).join('')}</div>`:`<div class="empty-state">${I('heart',43)}<h3>Hozircha sevimlilar bo‘sh</h3><p>Yoqtirgan uyingizdagi yurakchani bosing.</p><a class="btn btn-primary" href="#/listings">Uylarni ko‘rish</a></div>`}</main>`;}
function authPage(kind){const login=kind==='login';return `<main class="auth-page"><div class="auth-frame"><div class="auth-art"><div class="art-overlay"></div><div class="auth-art-content"><a href="#/" class="logo">${I('house',31)}<span>Market<span class="accent">Place</span></span></a><div><span class="small-label">SIZNING KELAJAKDAGI UYINGIZ</span><h2>Orzularingiz sari<br>birinchi qadam.</h2><p>Eng chiroyli uylarni toping va o‘z profilingizni boshqaring.</p></div></div></div><div class="auth-form-area"><div class="auth-heading"><span class="auth-icon">${I(login?'lock':'users',25)}</span><h1>${login?'Tizimga kirish':'Ro‘yxatdan o‘tish'}</h1><p>${login?'Hisobingizga kirib imkoniyatlardan foydalaning':'Yangi hisob yarating va o‘zingizga mos uy toping'}</p></div><form id="${login?'login-form':'register-form'}" class="form-stack">${!login?`<label class="form-field"><span>Ism va familiya</span><div class="field-with-icon">${I('user',18)}<input name="fullName" autocomplete="name" minlength="2" maxlength="100" required placeholder="Ismingiz va familiyangiz" /></div></label>`:''}<label class="form-field"><span>Email manzil</span><div class="field-with-icon">${I('mail',18)}<input name="email" type="email" autocomplete="email" required placeholder="example@gmail.com" /></div></label>${!login?`<label class="form-field"><span>Telefon (ixtiyoriy)</span><div class="field-with-icon">${I('pin',18)}<input name="phone" type="tel" inputmode="tel" autocomplete="tel" pattern="[+]?[0-9 ()-]{9,20}" title="Telefon raqamini kiriting, masalan +998901234567" placeholder="+998901234567" /></div></label>`:''}<label class="form-field"><span>Parol</span><div class="field-with-icon">${I('lock',18)}<input name="password" type="password" autocomplete="${login?'current-password':'new-password'}" minlength="8" required placeholder="Kamida 8 ta belgi" /><button type="button" class="password-eye" data-action="toggle-password" aria-label="Parolni ko‘rsatish">${I('eye',18)}</button></div></label><button class="btn btn-primary full big-submit" type="submit" ${state.busy?'disabled':''}>${state.busy?'Yuborilmoqda…':(login?'Kirish':'Ro‘yxatdan o‘tish')}${state.busy?'':I('arrow',17)}</button></form><div class="auth-switch">${login?'Hisobingiz yo‘qmi? <a href="#/register">Ro‘yxatdan o‘tish</a>':'Hisobingiz bormi? <a href="#/login">Tizimga kirish</a>'}</div><div class="auth-footnote">${I('shield',17)} Xavfsiz kirish va himoyalangan hisob</div></div></div></main>`;}
function profilePage(){if(!state.user)return lockedPage();const u=state.user;return `<main class="container inside-page profile-page">${pageBanner('Mening profilim','Shaxsiy ma’lumotlaringizni boshqaring.')}<div class="profile-layout"><aside class="profile-sidebar card-surface"><div class="profile-aside-user"><div class="avatar-big">${esc(u.fullName?.slice(0,1)||'U')}</div><h3>${esc(u.fullName)}</h3><p>${esc(u.email)}</p><span class="role-badge ${u.role==='ADMIN'?'admin':''}">${esc(u.role==='ADMIN'?'ADMIN':'FOYDALANUVCHI')}</span></div><nav class="side-links"><a class="active" href="#/profile">${I('user',18)} Mening profilim</a><a href="#/favorites">${I('heart',18)} Sevimlilar</a><a href="#/add-listing">${I('house',18)} Mening e’lonlarim <small>Demo</small></a>${u.role==='ADMIN'?`<a href="#/admin">${I('crown',18)} Admin panel</a>`:''}<button data-action="logout" type="button" class="logout-link">${I('logout2',18)} Chiqish</button></nav></aside><div class="profile-main"><div class="profile-summary card-surface"><div class="avatar-big avatar-large">${esc(u.fullName?.slice(0,1)||'U')}</div><div><span class="small-label">PROFIL</span><h2>${esc(u.fullName)}</h2><p>${esc(u.email)}</p></div><div class="role-badge ${u.role==='ADMIN'?'admin':''}">${esc(u.role)}</div></div><section class="card-surface profile-form-card"><div class="section-head compact"><div><h2>Profil ma’lumotlari</h2><p>O‘zgartirish mumkin bo‘lgan ma’lumotlarni kiriting</p></div>${I('edit',22)}</div><form id="profile-form" class="form-stack profile-form"><label class="form-field"><span>Ism va familiya</span><div class="field-with-icon">${I('user',18)}<input name="fullName" minlength="2" maxlength="100" required value="${esc(u.fullName)}" /></div></label><label class="form-field"><span>Email (o‘zgartirib bo‘lmaydi)</span><div class="field-with-icon disabled-field">${I('mail',18)}<input value="${esc(u.email)}" disabled /></div></label><label class="form-field"><span>Telefon</span><div class="field-with-icon">${I('pin',18)}<input name="phone" placeholder="+998901234567" value="${esc(u.phone||'')}" /></div></label><button class="btn btn-primary" ${state.busy?'disabled':''} type="submit">${I('check',18)} ${state.busy?'Saqlanmoqda…':'O‘zgarishlarni saqlash'}</button></form></section><div class="info-strip">${I('info',18)} Profil ma’lumotlaringiz serverda saqlanadi.</div></div></div></main>`;}
function adminPage(){if(!state.user)return lockedPage();if(state.user.role!=='ADMIN')return `<main class="container inside-page"><div class="empty-state">${I('shield',44)}<h2>Faqat administratorlar uchun</h2><p>Bu sahifani ko‘rish uchun sizga ADMIN roli kerak.</p><a class="btn btn-primary" href="#/">Bosh sahifa</a></div></main>`;const cats=state.categories;const edit=cats.find(c=>c.id===state.editCategory);return `<main class="container inside-page admin-page">${pageBanner('Admin panel — kategoriyalar','Kategoriyalarni mavjud backend orqali boshqarish.',`<span class="role-badge admin">${I('crown',15)} ADMIN</span>`)}<div class="admin-grid"><div class="card-surface admin-form-card"><h2>${edit?'Kategoriyani tahrirlash':'Yangi kategoriya qo‘shish'}</h2><p>${edit?'Mavjud kategoriya ma’lumotlarini tahrirlang':'Kategoriya nomi va URL slugini kiriting.'}</p><form id="category-form" class="form-stack"><label class="form-field"><span>Kategoriya nomi</span><div class="field-with-icon">${I('tag',18)}<input name="name" required maxlength="100" placeholder="Masalan: Kvartiralar" value="${esc(edit?.name||'')}" /></div></label><label class="form-field"><span>Slug (kichik lotin harflari, raqam, tire)</span><div class="field-with-icon">${I('link',18)}<input name="slug" required pattern="[a-z0-9-]+" placeholder="kvartiralar" value="${esc(edit?.slug||'')}" /></div></label><button type="submit" class="btn btn-primary full" ${state.busy?'disabled':''}>${I(edit?'check':'plus',18)} ${edit?'Saqlash':'Kategoriya qo‘shish'}</button>${edit?`<button class="btn btn-outline full" type="button" data-action="cancel-edit">Bekor qilish</button>`:''}</form><div class="tiny-notice">${I('shield',15)} Barcha o‘zgarishlar faqat mavjud API orqali amalga oshiriladi.</div></div><div class="card-surface admin-table-card"><div class="admin-table-head"><div><h2>Kategoriyalar</h2><p>Backenddan yuklangan: ${cats.length} ta</p></div><button type="button" data-action="reload-categories" class="btn btn-outline btn-sm">Yangilash</button></div>${state.catStatus==='error'?`<div class="error-banner">${I('alert',18)} ${esc(state.catError)}</div>`:cats.length?`<div class="table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>Nomi</th><th>Slug</th><th>Amallar</th></tr></thead><tbody>${cats.map(c=>`<tr><td>#${Number(c.id)}</td><td><span class="category-table-name">${I(getCategoryIcon(c.name),18)} ${esc(c.name)}</span></td><td><code>${esc(c.slug)}</code></td><td class="table-actions"><button data-action="edit-category" data-id="${Number(c.id)}" type="button" title="Tahrirlash">${I('edit',17)}</button><button data-action="delete-category" data-id="${Number(c.id)}" type="button" title="O‘chirish" class="danger">${I('trash',17)}</button></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state small-empty">${I('layers',32)}<h3>Kategoriyalar hozircha yo‘q</h3><p>Chapdagi formadan birinchi kategoriyani yarating.</p></div>`}</div></div><div class="info-strip">${I('info',18)} Eslatma: Backenddagi <code>PATCH/DELETE /categories/:id</code> da ID raqamga o‘girilmagan bo‘lishi mumkin. Agar tahrirlash/o‘chirishda xato qaytsa, frontend backendni o‘zi o‘zgartirmaydi.</div></main>`;}
function lockedPage(){return `<main class="container inside-page"><div class="empty-state">${I('lock',40)}<h2>Hisobingizga kiring</h2><p>Ushbu sahifani ochish uchun avval tizimga kiring.</p><a class="btn btn-primary" href="#/login">Kirish</a></div></main>`;}
function addPage(){return `<main class="container inside-page">${pageBanner('E’lon joylashtirish','Sahifa dizayni tayyor — server funksiyasi keyin qo‘shiladi.')}<div class="coming-panel"><div class="coming-photo">${photoTag('hero-villa.webp','Zamonaviy uy')}</div><div class="coming-body"><span class="eyebrow">KEYINGI BOSQICH</span><h2>Uy e’lonlarini yaratish API hali yo‘q</h2><p>Prisma bazada Property modeli bor, ammo NestJS da <code>POST /properties</code> endpointi hali yaratilmagan. Backendga tegmagan holda haqiqiy e’lonni jo‘natib bo‘lmaydi.</p><a class="btn btn-primary" href="#/listings">Namuna e’lonlarni ko‘rish ${I('arrow',17)}</a></div></div></main>`;}
function aboutPage(){return `<main class="container inside-page">${pageBanner('MarketPlace haqida','Yangi uy topish uchun qulay va zamonaviy dizayn.')}<div class="about-layout"><div class="about-photo">${photoTag('villa-pool.webp','Zamonaviy villa')}</div><div class="about-content"><span class="small-label">BIZNING G‘OYAMIZ</span><h2>Oddiy qidiruv. Chiroyli uylar. Qulay tajriba.</h2><p>MarketPlace uylar, kvartiralar va tijorat obyektlarini bir platformada ko‘rsatishga mo‘ljallangan loyiha. Ushbu frontend tanlangan binafsha-qora dizayn asosida qurilgan.</p><div class="feature-check">${I('checkcircle',20)} Responsive mobil va desktop dizayn</div><div class="feature-check">${I('checkcircle',20)} JWT bilan login va profil</div><div class="feature-check">${I('checkcircle',20)} ADMIN uchun kategoriyalar API</div><div class="feature-check">${I('checkcircle',20)} Demo katalog, filtr va sevimlilar</div><a href="#/listings" class="btn btn-primary">Katalogga o‘tish ${I('arrow',17)}</a></div></div></main>`;}
function notFound(){return `<main class="container inside-page"><div class="empty-state">${I('search',45)}<h2>Sahifa topilmadi</h2><p>Qidirgan sahifangiz mavjud emas.</p><a class="btn btn-primary" href="#/">Bosh sahifa</a></div></main>`;}
function render(){const r=route();const p=r.path;const current=p==='/'?'home':p.includes('/property/')?'detail':p.split('/')[1];let body;
 if(p==='/')body=homePage();else if(p==='/categories')body=categoriesPage();else if(p==='/listings')body=listingPage(r.query);else if(p.startsWith('/property/'))body=detailPage(p.split('/')[2]);else if(p==='/favorites')body=favPage();else if(p==='/login'||p==='/register')body=authPage(p.slice(1));else if(p==='/profile')body=profilePage();else if(p==='/admin')body=adminPage();else if(p==='/add-listing')body=addPage();else if(p==='/about')body=aboutPage();else body=notFound();
 root.innerHTML=`${navbar(current)}${body}${footer()}`;if(market)market.afterRender();
 const propertyTitle=p.startsWith('/property/')?houses.find(x=>x.id===Number(p.split('/')[2]))?.title:null;
 document.title=`${propertyTitle|| (p==='/'?'Orzuingizdagi uyni toping':({'/listings':'E’lonlar','/categories':'Kategoriyalar','/profile':'Mening profilim','/admin':'Admin panel','/favorites':'Sevimlilar'}[p]||'MarketPlace'))} • MarketPlace`;
}
async function loadCategories(){try{const result=await api.categories();if(!Array.isArray(result))throw Error('Kategoriya ro‘yxati kutilgan formatda emas');state.categories=result;state.catStatus='ok';state.catError='';}catch(e){state.categories=[];state.catStatus='error';state.catError=e.message;} render();}
async function loadUser(){if(!state.token)return;try{state.user=await api.authMe(state.token);}catch(e){ if(e.status===401){state.token='';sessionStorage.removeItem(TOKEN_KEY);if(location.hash!=='#/login')navigate('#/login');} state.user=null; }render();}
function logout(){state.user=null;state.token='';sessionStorage.removeItem(TOKEN_KEY);navigate('#/');toast('Hisobdan chiqdingiz');}
function setBusy(v){state.busy=v; const form=root.querySelector('form:has(button[type="submit"])'); if(form){const btn=form.querySelector('button[type="submit"]');if(btn)btn.disabled=v;}}
function formData(form){return Object.fromEntries(new FormData(form).entries());}
function humanError(e){return e?.message || 'Noma’lum xatolik yuz berdi';}
function toggleFav(id){id=Number(id);const set=new Set(state.favorites);if(set.has(id))set.delete(id);else set.add(id);state.favorites=Array.from(set);localStorage.setItem(FAV_KEY,JSON.stringify(state.favorites));render();toast(set.has(id)?'Sevimlilarga saqlandi (brauzerda)':'Sevimlilardan olib tashlandi');}
async function submitHandler(e){const form=e.target;if(!form?.id)return;e.preventDefault();const data=formData(form);if(form.id==='hero-search'||form.id==='listing-filter'){navigate(url('listings',data));return;}
 if(state.busy)return;
 try{
  setBusy(true);
  if(form.id==='login-form'){
   const response=await api.login({email:data.email.trim(),password:data.password});
   if(!response?.accessToken||!response?.user)throw new Error('Backend accessToken yoki user qaytarmadi');
   state.token=response.accessToken;sessionStorage.setItem(TOKEN_KEY,state.token);state.user=response.user;navigate('#/profile');toast('Xush kelibsiz!');
  } else if(form.id==='register-form'){
   const body={fullName:data.fullName.trim(),email:data.email.trim(),password:data.password};
   if(data.phone?.trim()){if(!/^\+?[0-9 ()-]{9,20}$/.test(data.phone.trim()))throw new Error('Telefon raqami noto‘g‘ri. Masalan: +998901234567');body.phone=data.phone.trim();}
   await api.register(body);
   navigate('#/login');toast('Ro‘yxatdan o‘tdingiz. Endi tizimga kiring.');
  } else if(form.id==='profile-form'){
   const body={fullName:data.fullName.trim()};if(data.phone?.trim())body.phone=data.phone.trim();
   state.user=await api.editProfile(state.token,body);render();toast('Profil saqlandi');
  } else if(form.id==='category-form'){
   const body={name:data.name.trim(),slug:data.slug.trim()};
   if(state.editCategory!=null)await api.editCategory(state.token,state.editCategory,body);
   else await api.addCategory(state.token,body);
   state.editCategory=null; await loadCategories();toast('Kategoriya saqlandi');
  }
 }catch(e){toast(humanError(e),'error');}finally{state.busy=false;const btn=form.querySelector('button[type="submit"]');if(btn)btn.disabled=false;}
}
async function clickHandler(e){const el=e.target.closest('[data-action]');if(!el)return;const action=el.dataset.action;
 if(action==='load-more'){state.visibleListings+=12;render();return;}
 if(action==='toggle-menu'){state.menuOpen=!state.menuOpen;render();return;}
 if(action==='favorite'){toggleFav(el.dataset.id);return;}
 if(action==='gallery-prev'||action==='gallery-next'||action==='gallery-set'){
  const p=houses.find(x=>x.id===Number(route().path.split('/')[2]));if(!p)return;const views=galleryViews(p);if(!views.length)return;
  const galleryScroll=root.querySelector('.gallery-thumbs')?.scrollLeft||0;
  state.galleryIndex=action==='gallery-set'?Math.min(views.length-1,Math.max(0,Number(el.dataset.index)||0)):(state.galleryIndex+(action==='gallery-next'?1:-1)+views.length)%views.length;
  render();
  const strip=root.querySelector('.gallery-thumbs'),selected=strip?.querySelector('.gallery-thumb.active');
  if(strip&&selected){strip.scrollLeft=galleryScroll;const a=selected.getBoundingClientRect(),b=strip.getBoundingClientRect();if(a.left<b.left)strip.scrollLeft-=b.left-a.left;else if(a.right>b.right)strip.scrollLeft+=a.right-b.right;}
  (action==='gallery-set'?selected:root.querySelector(`[data-action="${action}"]`))?.focus({preventScroll:true});
  return;
 }
 if(action==='detail-tab'){state.detailTab=el.dataset.tab;render();return;}
 if(action==='share'){if(navigator.clipboard)navigator.clipboard.writeText(location.href).then(()=>toast('Havola nusxalandi')).catch(()=>toast('Havolani manzil satridan nusxalang','error'));else toast('Havolani manzil satridan nusxalang','error');return;}
 if(action==='demo-contact'){toast('Sotuvchiga xabar yuborish API hozircha mavjud emas','error');return;}
 if(action==='logout'){logout();return;}
 if(action==='toggle-password'){const input=el.closest('.field-with-icon')?.querySelector('input');if(input){input.type=input.type==='password'?'text':'password';}return;}
 if(action==='edit-category'){state.editCategory=Number(el.dataset.id);render();return;}
 if(action==='cancel-edit'){state.editCategory=null;render();return;}
 if(action==='reload-categories'){await loadCategories();toast('Kategoriyalar qayta yuklandi');return;}
 if(action==='delete-category'){
  const cat=state.categories.find(c=>c.id===Number(el.dataset.id));if(!cat)return;
  if(!window.confirm(`“${cat.name}” kategoriyasini o‘chirmoqchimisiz?`))return;
  try{await api.deleteCategory(state.token,cat.id);await loadCategories();toast('Kategoriya o‘chirildi');}catch(e){toast(humanError(e),'error');}
 }
}
function onRouteChange(){state.visibleListings=12;state.galleryIndex=0;state.detailTab='about';state.menuOpen=false;render();window.scrollTo(0,0);}
window.addEventListener('hashchange',onRouteChange);
root.addEventListener('click',clickHandler);
root.addEventListener('submit',submitHandler);
mountTour({houses,toast});
market=mountMarket({api,state,houses,root,render,navigate,toast,esc,photoTag});
render();
loadCategories();
loadUser();
market.init();

