import { propertyImages } from './media.js?v=20261108-unique-rooms';

export function mountMarket(ctx) {
  const {api,state,houses,root,render,navigate,toast,esc,photoTag}=ctx;
  let online=false, my=[], sent=[], favoriteItems=[], adminListings=[], adminUsers=[];
  let lastToken='', lastAdminToken='', loadingMy=false, loadingAdmin=false, loadingSent=false, requestId=0, detailId=0;
  const route=()=>location.hash.split('?')[0];
  const opts=(items,selected)=>items.map(([value,label])=>'<option value="'+esc(value)+'" '+(String(selected)===String(value)?'selected':'')+'>'+esc(label)+'</option>').join('');
  const normalize=p=>{
    const pics=propertyImages(p,api.baseUrl);
    return {id:Number(p.id),title:p.title||'',description:p.description||'',price:Number(p.price)||0,
      currency:p.currency||'USD',type:p.listingType,city:p.city||'',district:p.address||'',
      category:p.category?.name||'',categoryId:p.categoryId,rooms:Number(p.rooms)||0,
      area:Number(p.area)||0,bathrooms:Number(p.bathrooms)||0,
      photo:pics[0]||null,gallery:pics,images:Array.isArray(p.images)?p.images:[],
      ownerId:Number(p.ownerId ?? p.sellerId),owner:p.owner||p.seller||null,real:true,status:p.status};
  };
  const error=e=>{if(e?.status===401&&state.token){state.token='';state.user=null;state.favorites=[];sessionStorage.removeItem('marketplace-front-jwt');toast('Sessiya tugadi. Qayta kiring.','error');navigate('#/login');return true;}return false;};
  const refresh=async(search={})=>{
    const seq=++requestId;state.propertyLoading=true;state.propertyError='';render();
    try{
      const response=await api.properties({...search,limit:12});
      if(!response||!Array.isArray(response.data)||!response.meta)throw Error('API ro‘yxat formati noto‘g‘ri');
      if(seq!==requestId)return;
      houses.splice(0,houses.length,...response.data.map(normalize));
      online=true;state.propertyApi='online';state.propertyMeta=response.meta;
      state.propertyLoading=false;state.propertyError='';render();
      if(state.token&&state.token!==lastToken)await favorites();
    }catch(e){
      if(seq!==requestId)return;
      state.propertyLoading=false;state.propertyError=e.message;
      if(!online)state.propertyApi='offline';
      else if(route()==='#/listings'){houses.splice(0,houses.length);state.propertyMeta={page:1,limit:12,total:0,totalPages:0};}
      render();
    }
  };
  const serverParams=()=>{
    const q=new URLSearchParams(location.hash.split('?')[1]||'');
    const params={page:Math.max(1,Number(q.get('page'))||1),sort:q.get('sort')||'newest'};
    if(q.get('type'))params.type=q.get('type');
    if(q.get('max'))params.maxPrice=q.get('max');
    if(q.get('min'))params.minPrice=q.get('min');
    if(q.get('rooms'))params.rooms=q.get('rooms');
    if(q.get('location'))params.city=q.get('location');
    if(q.get('category')){
      const key=q.get('category').toLocaleLowerCase();
      const cat=state.categories.find(x=>x.name.toLocaleLowerCase()===key||x.slug===key);
      if(cat)params.category=cat.slug;
      else if(/^[a-z0-9-]+$/.test(key))params.category=key;
    }
    return params;
  };
  async function favorites(){
    if(!state.token||!online)return;
    lastToken=state.token;
    try{
      const a=await api.getFavorites(state.token);
      if(!Array.isArray(a))throw Error('Sevimlilar formati noto‘g‘ri');
      favoriteItems=a.map(x=>x.property).filter(Boolean).map(normalize);
      state.favorites=a.map(x=>Number(x.propertyId));
      render();
    }catch(e){if(!error(e))toast(e.message,'error');}
  }
  const field=(name,label,type='text',value='',extra='')=>
    '<label class="form-field"><span>'+label+'</span><input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+' required></label>';
  const optionalField=(name,label,type='text',value='',extra='')=>
    '<label class="form-field"><span>'+label+'</span><input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
  const notice=message=>'<div class="info-strip">'+esc(message)+'</div>';
  function editor(p=null){
    if(!state.user)return '<main class="container inside-page"><div class="empty-state"><h2>E’lon berish uchun kiring</h2><a class="btn btn-primary" href="#/login">Kirish</a></div></main>';
    const editing=Boolean(p),cats=state.categories;
    return '<main class="container inside-page premium-editor">'+
      '<div class="page-banner"><div><span class="eyebrow">SELLER DASHBOARD</span><h1>'+(editing?'E’lonni tahrirlash':'Yangi e’lon joylash')+'</h1><p>Uy ma’lumotlari backendda saqlanadi va admin tasdig‘ini kutadi.</p></div></div>'+
      notice('Yangi va tahrirlangan e’lonlar PENDING holatda bo‘ladi. Admin tasdiqlamaguncha ommaga ko‘rinmaydi.')+
      '<div class="editor-columns"><form id="property-editor" class="card-surface editor-form form-stack" data-property-id="'+(p?.id||'')+'">'+
      '<h2>Uy haqida ma’lumot</h2>'+
      field('title','Sarlavha','text',p?.title||'','minlength="5" maxlength="150"')+
      '<label class="form-field"><span>Tavsif</span><textarea name="description" minlength="20" maxlength="5000" rows="5" required>'+esc(p?.description||'')+'</textarea></label>'+
      '<div class="editor-grid"><label class="form-field"><span>Kategoriya</span><select name="categoryId" required>'+opts([['','Tanlang'],...cats.map(x=>[x.id,x.name])],p?.categoryId||'')+'</select></label>'+
      '<label class="form-field"><span>Turi</span><select name="listingType">'+opts([['SALE','Sotuv'],['RENT','Ijara']],p?.type||'SALE')+'</select></label>'+
      '<label class="form-field"><span>Valyuta</span><select name="currency">'+opts([['USD','USD ($)'],['UZS','UZS (so‘m)']],p?.currency||'USD')+'</select></label>'+
      field('price','Narx','number',p?.price||'','min="0.01" step="0.01"')+
      field('area','Maydon (m²)','number',p?.area||'','min="0.01" step="0.01"')+
      field('city','Shahar','text',p?.city||'','minlength="2"')+
      field('address','Manzil','text',p?.district||'','minlength="3"')+
      field('rooms','Xonalar','number',p?.rooms||1,'min="1" step="1"')+
      field('bathrooms','Sanuzellar','number',p?.bathrooms??0,'min="0" step="1"')+'</div>'+
      '<h2>Fotogalereya</h2><label class="form-field"><span>JPEG / PNG / WebP — bitta rasm 5 MB dan oshmasin</span><input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple></label>'+
      (editing&&p.images.length?'<div class="market-image-grid">'+p.images.map(image=>
        '<div class="market-image">'+photoTag(propertyImages({id:p.id,images:[image]},api.baseUrl)[0],p.title)+
        '<button type="button" class="btn btn-outline btn-sm" data-market="delete-image" data-id="'+p.id+'" data-image-id="'+Number(image.id)+'">Rasmni o‘chirish</button></div>').join('')+'</div>':'')+
      '<button class="btn btn-primary full" type="submit">'+(editing?'O‘zgarishlarni saqlash':'E’lon yaratish')+'</button></form>'+
      '<aside class="card-surface editor-aside"><h2>Rasmlar va moderatsiya</h2><p>Har bir rasm serverga alohida <code>image</code> maydoni bilan yuboriladi. E’lonni saqlashdan keyin qayta tasdiqlash kerak bo‘ladi.</p><a href="#/my-listings" class="text-link">Mening e’lonlarim</a></aside></div></main>';
  }
  function myPage(){
    if(!state.user)return editor();
    return '<main class="container inside-page"><div class="page-banner"><div><span class="eyebrow">SELLER</span><h1>Mening e’lonlarim</h1><p>Holat va rasmlarni boshqaring.</p></div><a class="btn btn-primary" href="#/add-listing">+ E’lon</a></div>'+
      '<div class="properties-grid">'+my.map(p=>
        '<article class="property-card">'+photoTag(p.photo,p.title,'my-property-image')+
        '<div class="property-info"><span class="market-status '+esc(p.status)+'">'+esc(p.status||'PENDING')+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.city)+'</p><strong class="price">'+(p.currency==='UZS'?'so‘m ':'$')+p.price.toLocaleString('en-US')+'</strong><div class="editor-actions">'+
        (p.status==='APPROVED'?'<a class="btn btn-outline btn-sm" href="#/property/'+p.id+'">Ko‘rish</a>':'')+
        '<a class="btn btn-outline btn-sm" href="#/edit-listing/'+p.id+'">Tahrirlash</a>'+
        '<button type="button" class="btn btn-outline btn-sm" data-market="delete" data-id="'+p.id+'">O‘chirish</button></div></div></article>').join('')+'</div>'+
      (my.length?'':'<div class="empty-state">Hozircha e’lon yo‘q. Yangi e’lon yarating.</div>')+'</main>';
  }
  function sentPage(){
    if(!state.user)return editor();
    return '<main class="container inside-page"><div class="page-banner"><div><span class="eyebrow">INQUIRIES</span><h1>Mening murojaatlarim</h1><p>Siz yuborgan xabarlar.</p></div></div>'+
      (sent.length?sent.map(x=>'<article class="card-surface inbox-item"><h3>'+esc(x.property?.title||'E’lon')+'</h3><p>'+esc(x.message)+'</p><small>'+esc(x.phone||'')+'</small></article>').join(''):'<div class="empty-state">Hozircha murojaat yo‘q.</div>')+'</main>';
  }
  function favoritesPage(){
    if(!state.user)return '<main class="container inside-page"><div class="empty-state">Sevimlilarni ko‘rish uchun tizimga kiring. <a href="#/login">Kirish</a></div></main>';
    return '<main class="container inside-page"><div class="page-banner"><div><span class="eyebrow">FAVORITES</span><h1>Sevimli e’lonlar</h1></div></div><div class="properties-grid">'+
      favoriteItems.map(p=>'<article class="property-card"><a class="property-image" href="#/property/'+p.id+'">'+photoTag(p.photo,p.title)+'</a><div class="property-info"><h3>'+esc(p.title)+'</h3><p>'+esc(p.city)+'</p><strong class="price">$'+p.price.toLocaleString('en-US')+'</strong><div class="editor-actions"><a href="#/property/'+p.id+'" class="btn btn-outline btn-sm">Ko‘rish</a><button type="button" class="btn btn-outline btn-sm" data-market="unfavorite" data-id="'+p.id+'">Olib tashlash</button></div></div></article>').join('')+
      '</div>'+(favoriteItems.length?'':'<div class="empty-state">Sevimlilar hali yo‘q.</div>')+'</main>';
  }
  function adminPanel(){
    const cards=adminListings.map(p=>'<article class="market-review-item"><div>'+photoTag(p.photo,p.title,'market-review-photo')+'</div><div><b>'+esc(p.title)+'</b><p>'+esc(p.owner?.fullName||'Sotuvchi')+' · '+esc(p.city)+' · '+esc(p.status)+'</p><strong>$'+Number(p.price).toLocaleString('en-US')+'</strong></div><div class="market-review-actions">'+
      '<button class="btn btn-primary btn-sm" data-market="moderate" data-status="APPROVED" data-id="'+p.id+'">Tasdiqlash</button>'+
      '<button class="btn btn-outline btn-sm" data-market="moderate" data-status="REJECTED" data-id="'+p.id+'">Rad etish</button></div></article>').join('');
    const users=adminUsers.map(u=>'<tr><td>'+Number(u.id)+'</td><td>'+esc(u.fullName)+'</td><td>'+esc(u.email)+'</td><td>'+esc(u.role)+'</td><td>'+Number(u._count?.properties||0)+'</td></tr>').join('');
    return '<section class="card-surface market-review"><div class="section-head"><div><h2>E’lonlar moderatsiyasi</h2><p>Faqat ADMIN: PENDING → APPROVED / REJECTED</p></div><button class="btn btn-outline btn-sm" data-market="reload-admin">Yangilash</button></div>'+
      (adminListings.length?cards:'<div class="empty-state">Tasdiqlashni kutayotgan e’lonlar yo‘q.</div>')+
      '<h2>Foydalanuvchilar</h2><div class="table-wrap"><table class="admin-table"><thead><tr><th>ID</th><th>Ism</th><th>Email</th><th>Rol</th><th>E’lonlar</th></tr></thead><tbody>'+users+'</tbody></table></div></section>';
  }
  function pages(){
    const m=state.propertyMeta;if(!m||Number(m.totalPages)<=1)return '';
    const q=new URLSearchParams(location.hash.split('?')[1]||'');
    const page=Number(m.page)||1,total=Number(m.totalPages)||1;
    const url=n=>{q.set('page',n);return '#/listings?'+q.toString();};
    return '<nav class="market-pages" aria-label="Sahifalar">'+
      (page>1?'<a class="btn btn-outline btn-sm" href="'+url(page-1)+'">← Oldingi</a>':'')+
      '<span>'+page+' / '+total+' sahifa</span>'+
      (page<total?'<a class="btn btn-outline btn-sm" href="'+url(page+1)+'">Keyingi →</a>':'')+'</nav>';
  }
  function afterRender(){
    const path=route(),main=root.querySelector('main');
    if(!state.token&&lastToken){lastToken='';favoriteItems=[];state.favorites=[];}
    if(main&&path==='#/add-listing')main.outerHTML=editor();
    if(main&&path==='#/my-listings')main.outerHTML=myPage();
    if(main&&(path==='#/inbox'||path==='#/my-inquiries'))main.outerHTML=sentPage();
    if(main&&path.startsWith('#/edit-listing/')){
      const p=my.find(x=>x.id===Number(path.split('/')[2]));
      main.outerHTML=p?editor(p):'<main class="container inside-page"><div class="empty-state">E’lon yuklanmoqda yoki topilmadi.</div></main>';
    }
    if(main&&path==='#/favorites'&&online)main.outerHTML=favoritesPage();
    if(main&&path==='#/admin'&&state.user?.role==='ADMIN'){
      main.insertAdjacentHTML('beforeend',adminPanel());
      if(lastAdminToken!==state.token){lastAdminToken=state.token;queueMicrotask(()=>loadPage());}
    }
    const nav=root.querySelector('.header-actions');
    if(nav&&!nav.querySelector('.publish-link'))nav.insertAdjacentHTML('afterbegin','<a class="btn btn-primary btn-sm publish-link" href="#/add-listing">+ E’lon berish</a>');
    const side=root.querySelector('.side-links');
    if(side){
      const a=side.querySelector('a[href="#/add-listing"]');if(a){a.href='#/my-listings';a.textContent='Mening e’lonlarim';}
      if(!side.querySelector('a[href="#/my-inquiries"]'))side.insertAdjacentHTML('beforeend','<a href="#/my-inquiries">✉ Mening murojaatlarim</a>');
    }
    if(online)root.querySelectorAll('.demo-note,.tiny-demo-tag').forEach(x=>x.remove());
    if(state.propertyError&&online&&(path==='#/listings'||path==='#/')){
      root.querySelector('.results,.listings-section')?.insertAdjacentHTML('afterbegin',
        '<div class="error-banner">Backend bilan aloqa xatosi: '+esc(state.propertyError)+'</div>');
    }
    if(path==='#/listings'&&online){
      const results=root.querySelector('.results');
      const summary=results?.querySelector('.results-top p');
      if(summary)summary.textContent=(state.propertyMeta?.total??0)+' ta tasdiqlangan e’lon';
      results?.querySelector('.load-more-wrap')?.remove();
      if(state.propertyLoading){results?.querySelector('.properties-grid')?.replaceChildren();results?.insertAdjacentHTML('beforeend',notice('E’lonlar yuklanmoqda…'));}
      else results?.insertAdjacentHTML('beforeend',pages());
    }
    if(path.startsWith('#/property/')){
      const p=houses.find(x=>x.id===Number(path.split('/')[2])),detail=root.querySelector('.detail-summary');
      if(p&&detail){
        const d=document.createElement('section');d.id='market-contact';d.className='card-surface market-contact';
        d.innerHTML=!p.real?'<h2>Namuna uy</h2><p>Bu e’lon real sotuvchiga tegishli emas.</p>':!state.user?
          '<h2>Sotuvchi</h2><p>'+esc(p.owner?.fullName||'Sotuvchi')+(p.owner?.phone?' · '+esc(p.owner.phone):'')+'</p><p>Murojaat yuborish uchun kiring.</p><a href="#/login" class="btn btn-primary">Kirish</a>':
          p.ownerId===Number(state.user.id)?'<h2>Sizning e’loningiz</h2><a href="#/my-listings" class="text-link">Boshqarish</a>':
          '<h2>Sotuvchiga xabar</h2><p>'+esc(p.owner?.fullName||'Sotuvchi')+(p.owner?.phone?' · '+esc(p.owner.phone):'')+'</p>'+
          '<form id="market-inquiry" class="form-stack"><input type="hidden" name="propertyId" value="'+p.id+'">'+
          field('phone','Telefon','tel','','minlength="9" maxlength="13" pattern="(\\+998[0-9]{9}|[0-9]{9})"')+
          '<label class="form-field"><span>Xabar</span><textarea name="message" minlength="10" maxlength="1000" rows="4" required></textarea></label>'+
          '<button type="submit" class="btn btn-primary">Xabar yuborish</button></form>';
        detail.insertAdjacentElement('afterend',d);
      }
    }
    if(state.token&&online&&state.token!==lastToken)queueMicrotask(()=>favorites());
  }
  async function loadAdmin(){
    if(loadingAdmin||state.user?.role!=='ADMIN')return;
    loadingAdmin=true;
    try{
      const [r,u]=await Promise.all([api.adminProperties(state.token,{status:'PENDING',limit:50}),api.adminUsers(state.token)]);
      if(!Array.isArray(r?.data)||!Array.isArray(u))throw Error('Admin ma’lumotlari formati noto‘g‘ri');
      adminListings=r.data.map(normalize);adminUsers=u;render();
    }catch(e){if(!error(e))toast('Admin ma’lumotlari: '+e.message,'error');}
    finally{loadingAdmin=false;}
  }
  async function loadPage(){
    const path=route();
    if(path==='#/listings'){await refresh(serverParams());return;}
    if(path.startsWith('#/property/')){
      const id=Number(path.split('/')[2]);if(!id)return;
      if(!online&&state.propertyApi!=='online')return;
      state.detailError=null;
      const seq=++detailId;
      try{const p=normalize(await api.property(id));if(seq!==detailId||route()!==path)return;
        const idx=houses.findIndex(x=>x.id===id);if(idx<0)houses.push(p);else houses[idx]=p;render();
      }catch(e){if(seq!==detailId)return;if(e.status===404){state.detailError=id;const idx=houses.findIndex(x=>x.id===id);if(idx>=0&&houses[idx].real)houses.splice(idx,1);render();}else if(!error(e))toast(e.message,'error');}
      return;
    }
    if(path==='#/my-listings'||path.startsWith('#/edit-listing/')){
      if(!state.token||loadingMy)return;loadingMy=true;
      try{my=(await api.myProperties(state.token)).map(normalize);render();}
      catch(e){if(!error(e))toast(e.message,'error');}
      finally{loadingMy=false;}return;
    }
    if(path==='#/inbox'||path==='#/my-inquiries'){
      if(!state.token||loadingSent)return;loadingSent=true;
      try{sent=await api.inquiries(state.token);render();}
      catch(e){if(!error(e))toast(e.message,'error');}
      finally{loadingSent=false;}return;
    }
    if(path==='#/admin'){await loadAdmin();return;}
    if(path==='#/favorites'){await favorites();return;}
  }
  async function submit(e){
    const f=e.target;if(!['property-editor','market-inquiry'].includes(f.id))return;
    e.preventDefault();e.stopImmediatePropagation();
    if(!state.token){navigate('#/login');return;}
    const data=new FormData(f),btn=f.querySelector('[type=submit]');btn.disabled=true;
    try{
      if(f.id==='market-inquiry'){
        await api.sendInquiry(state.token,Number(data.get('propertyId')),{phone:String(data.get('phone')).trim(),message:String(data.get('message')).trim()});
        f.reset();toast('Murojaat yuborildi');return;
      }
      const files=[...f.querySelector('[name=images]').files];
      if(files.length>8)throw Error('8 tagacha rasm qo‘shish mumkin');
      if(files.some(x=>x.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(x.type)))throw Error('JPG, PNG yoki WebP, har biri 5 MB dan kichik bo‘lsin');
      const payload={title:String(data.get('title')).trim(),description:String(data.get('description')).trim(),
        price:Number(data.get('price')),currency:data.get('currency'),listingType:data.get('listingType'),
        categoryId:Number(data.get('categoryId')),address:String(data.get('address')).trim(),city:String(data.get('city')).trim(),
        area:Number(data.get('area')),rooms:Number(data.get('rooms')),bathrooms:Number(data.get('bathrooms'))};
      if(!(payload.price>0&&payload.area>0&&payload.rooms>=1&&payload.categoryId>0))throw Error('Narx, maydon, xona va kategoriya qiymatini tekshiring.');
      const id=Number(f.dataset.propertyId);
      const created=id?await api.updateProperty(state.token,id,payload):await api.createProperty(state.token,payload);
      let photoFailure='';
      if(files.length)try{await api.uploadImages(state.token,id||created.id,files);}catch(e){photoFailure=e.message;}
      toast(photoFailure?'E’lon saqlandi, lekin rasm xatosi: '+photoFailure:'E’lon saqlandi — PENDING');
      my=[];navigate('#/my-listings');queueMicrotask(()=>loadPage());
    }catch(e){if(!error(e))toast(e.message,'error');}
    finally{btn.disabled=false;}
  }
  async function click(e){
    const el=e.target.closest('[data-market],[data-action="demo-contact"],[data-action="favorite"]');if(!el)return;
    if(el.dataset.action==='demo-contact'){e.preventDefault();e.stopImmediatePropagation();root.querySelector('#market-contact')?.scrollIntoView({behavior:'smooth'});return;}
    if(el.dataset.action==='favorite'&&online){
      e.preventDefault();e.stopImmediatePropagation();if(!state.token){navigate('#/login');return;}
      const id=Number(el.dataset.id);
      try{if(state.favorites.includes(id))await api.removeFavorite(state.token,id);else await api.addFavorite(state.token,id);await favorites();toast('Sevimlilar yangilandi');}
      catch(e){if(!error(e))toast(e.message,'error');}
      return;
    }
    if(!el.dataset.market)return;
    e.preventDefault();e.stopImmediatePropagation();
    const id=Number(el.dataset.id);
    try{
      if(el.dataset.market==='delete'){
        if(!confirm('E’lon butunlay o‘chirilsinmi?'))return;
        await api.deleteProperty(state.token,id);my=my.filter(x=>x.id!==id);render();toast('E’lon o‘chirildi');
      }else if(el.dataset.market==='delete-image'){
        if(!confirm('Rasm o‘chirilsinmi?'))return;
        await api.deleteImage(state.token,id,Number(el.dataset.imageId));
        const ix=my.findIndex(x=>x.id===id);
        if(ix>=0)my[ix]=normalize(await api.myProperties(state.token).then(a=>a.find(x=>Number(x.id)===id)));
        render();toast('Rasm o‘chirildi');
      }else if(el.dataset.market==='moderate'){
        await api.adminStatus(state.token,id,el.dataset.status);
        adminListings=adminListings.filter(x=>x.id!==id);render();
        toast(el.dataset.status==='APPROVED'?'E’lon tasdiqlandi':'E’lon rad etildi');
      }else if(el.dataset.market==='reload-admin'){await loadAdmin();}
      else if(el.dataset.market==='unfavorite'){await api.removeFavorite(state.token,id);await favorites();}
    }catch(e){if(!error(e))toast(e.message,'error');}
  }
  root.addEventListener('submit',submit,true);
  root.addEventListener('click',click,true);
  window.addEventListener('hashchange',loadPage);
  return {init(){refresh().then(()=>loadPage());},afterRender};
}
