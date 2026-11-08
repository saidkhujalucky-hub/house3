# MarketPlace — frontend (NestJS backendni o‘zgartirmaydi)

## 2026-11-08 — Uyma-uy API frontend integratsiyasi (joriy holat)

Bu versiya **Uyma-uy API — Frontendchilar uchun qo‘llanma** PDFdagi endpointlarga moslashtirilgan. Oldingi README bo‘limlaridagi demo-only ta'riflar avvalgi versiyaga tegishli.

- Public GET /properties endpointidan { data, meta } formatidagi APPROVED e’lonlar olinadi; page, limit=12, city, category (slug), type, minPrice, maxPrice, rooms va sort query orqali yuboriladi. Katalogda pagination ham bor.
- GET /properties/:id barcha e’lon rasmlari hamda sotuvchi kontaktini ko‘rsatish uchun ishlatiladi.
- Seller sahifasi: GET /properties/my, POST /properties, PATCH /properties/:id, DELETE /properties/:id. Yangi va tahrirlangan e’lonlar PENDING statusini oladi; statusni server boshqaradi.
- Rasm yuklash: har bir fayl alohida POST /properties/:id/images, FormData kaliti image, 5 MB chegarasi; mavjud rasm DELETE /properties/:id/images/:imageId bilan o‘chiriladi.
- GET/POST/DELETE /favorites, POST /properties/:id/inquiries, GET /inquiries/my (yuborilgan murojaatlar).
- Admin sahifasida GET /admin/properties?status=PENDING, PATCH /admin/properties/:id/status (faqat APPROVED yoki REJECTED) va GET /admin/users.
- Register/Login, profil va kategoriyalar CRUD saqlangan. Xatolar backendning message maydonidan olinadi; muddati tugagan token bo‘lsa login oynasiga qaytaradi.
- Mavjud 3D konsept, dizayn va demo rasmlar backend **ulanmagan** holatda ham namoyish bo‘lib qoladi; ular haqiqiy e’lonlar emas. Backend mavjud bo‘lsa, public ro‘yxat serverdan keladi.

**Ulash bo‘yicha muhim izoh:** config.js hozircha http://localhost:3000 ga qaraydi. GitHub Pages'dagi HTTPS saytdan bu manzilga boshqa foydalanuvchilar ulana olmaydi. Backendni HTTPS hostingga joylashtirgandan keyin config.js dagi apiBaseUrl ni haqiqiy server manziliga almashtiring. Lokal sinash uchun localhost:3000 da API, localhost:5500 da frontendni ishga tushiring. JSON va multipart endpointlarni qo‘llanmadagi real backend bilan browserda sinash kerak; koddagi mock tekshiruvlar real serverning ishlashiga kafolat bermaydi.

Bu **alohida, dependenciesiz HTML / CSS / JavaScript frontend**. Dizayn: qora-binafsha, villa hero banneri, kategoriya kartalari, e’lonlar katalogi, uy tafsilotlari, login, register, profil va ADMIN kategoriyalari.

## 1. Ishga tushirish

1. **Eski NestJS backendni** odatdagidek alohida ishga tushiring. PostgreSQL va `.env` ni backend uchun odatdagidek sozlang.
2. `frontend/config.js` ichidagi `apiBaseUrl` sizning NestJS API manzilingizga teng bo‘lsin, masalan `http://localhost:3000`.
3. Windowsda **`start.bat`** ni ikki marta bosing yoki frontend papkasida terminal orqali ishga tushiring:

   ```bash
   npm start
   ```

   Keyin `http://localhost:5500` ni oching. VS Code Live Server yoki `python -m http.server 5500` ham ishlaydi. Faylni `file://` orqali ikki marta bosib emas, HTTP server bilan ochish kerak, chunki ES Modules ishlatilgan.

**npm install kerak emas.** Frontendning ishlashi uchun Node.js mavjud bo‘lsa, `npm start` yetarli; qo‘shimcha paket o‘rnatilmaydi.

## 2. GitHub Pages yoki Cloudflare Pages

`frontend` ichidagi `index.html`, `app.js`, `api.js`, `config.js`, `styles.css` va `assets/` ni saytning public root papkasiga qo‘ying. GitHub Pages uchun `main / (root)` yoki `/docs` ga ko‘chirib qo‘ying; Cloudflare Pages uchun build command bo‘sh, output directory esa sayt fayllari turgan papka bo‘ladi. Sahifalar `#/...` orqali ishlaydi, shuning uchun routing konfiguratsiyasi kerak emas.

**Muhim:** Frontend HTTPS manzilda bo‘lsa, unga ulangan backend ham HTTPS orqali ochiq bo‘lishi kerak. `localhost:3000` internetdagi foydalanuvchilar uchun ishlamaydi. Backendni alohida deploy qiling yoki mavjud ochiq HTTPS API URLini `config.js` ga yozing.

## 3. Mavjud backend bilan real ishlaydigan qismlar

| UI | API |
|---|---|
| Ro‘yxatdan o‘tish | `POST /auth/register` (`fullName`, `email`, `password`, ixtiyoriy `phone`) |
| Tizimga kirish | `POST /auth/login` (`email`, `password`) → `accessToken`, `user` |
| Profilni ko‘rish | `GET /users/me` (Bearer token) |
| Profilni tahrirlash | `PATCH /users/me` (`fullName`, `phone`) |
| Kategoriyalar | `GET /categories` |
| ADMIN kategoriya qo‘shishi | `POST /categories` (`name`, `slug`) |
| ADMIN kategoriya tahrirlashi | `PATCH /categories/:id` |
| ADMIN kategoriya o‘chirishi | `DELETE /categories/:id` |

JWT **sessionStorage** da saqlanadi (tab yopilganda o‘chadi). Foydalanuvchi ro‘yxatdan o‘tgach login qiladi; backend ro‘yxatdan o‘tishda JWT qaytarmaydi.

### Hozir faqat demo bo‘lgan qismlar

- Uy-joy e’lonlari va filtrlar: 8 ta frontendga qo‘shilgan misol. `GET/POST /properties` endpointlari yo‘q, shuning uchun serverdan haqiqiy e’lon olinmaydi yoki yozilmaydi.
- Sevimlilar: faqat **localStorage**, serverda sinxronlanmaydi.
- Sotuvchiga xabar: frontend xabar beradi, lekin backendga jo‘natmaydi (`Inquiry` API yo‘q).
- Admin kategoriya sahifasida foydalanuvchilar statistikasi va e’lonlar soni o‘ylab topilmagan.
- Rasmlar dizayn namunasi sifatida berilgan; real e’lonlar fotosi emas.

### Muhim mavjud backend cheklovi

Asl NestJS kodida `categories.controller.ts` ichida `@Param('id') id: number` yozilgan, lekin `ParseIntPipe` yo‘q. Shuning uchun `PATCH`/`DELETE /categories/:id` Prisma bilan raqam turi bo‘yicha xato berishi mumkin. **Bu paket backendni tuzatmaydi yoki o‘zgartirmaydi**; frontend faqat backend xatosini ko‘rsatadi.

## 4. Papkalar

```text
frontend/
  index.html          # asosiy kirish
  styles.css          # to‘liq responsive dizayn
  app.js              # sahifalar, qidiruv, navigatsiya va demo katalog
  api.js              # real backend bilan fetch yordamida bog‘lanish
  config.js           # faqat API URL sozlamasi
  assets/             # lokal rasm va SVG belgisi
  package.json        # npm start, dependency yo‘q
  server.mjs           # Node.js lokal statik server (faqat frontend)
  start.bat            # Windows uchun bir bosishda ishga tushirish
  README.md
```

**Backendga birorta ham o‘zgartirish kiritilmagan.**


## Premium va yangi workflow

Frontendga e’lon joylash, foto yuklash, sevimlilarni serverda saqlash, xabar yuborish va sotuvchining kelgan xabarlari uchun API integratsiyasi qo‘shilgan. Ular NestJS backendidagi yangi /properties va /favorites endpointlari ishga tushganda haqiqiy ishlaydi. GitHub Pages o‘zi backend vazifasini bajarmaydi. 3D sahifa va barcha mavjud login/kategoriya imkoniyatlari saqlangan.


## 2026-11-08: galleries + performance

- Namuna katalogi 8 tadan 20 tagacha kengaytirildi. Ular demo ma’lumotlar, haqiqiy e’lonlar emas.
- Namuna uyda boshqa uylarning bir nechta fotosi ko‘rsatilmaydi: har bir demo obyektning o‘ziga biriktirilgan bitta bosh rasmi bor. Real e’lonlarda backenddagi propertyId bo‘yicha bog‘langan galereya ishlaydi.
- Katalog 12 tadan ko‘rsatadi, "Yana ko‘rish" qo‘shimcha kartalarni ochadi; bosh sahifada 8 ta ko‘rsatiladi.
- Unsplash fotosuratlarida responsive o‘lcham/siqish, native lazy-loading; thumbnail va kartalar ancha kichikroq fayl oladi. 3D iframe avtomatik tez grafik rejimida ochiladi (standalone yuqori sifatda qoladi).

## E’lon rasmlari va ichki 3D oyna

- 20 ta demo e’lonning alohida fotosi `assets/listings/01.webp`–`20.webp` da saqlanadi. Har bir suratning 720px kartochka va 1600px batafsil versiyasi bor. Manbalar `assets/listings/SOURCES.json` da.
- Kartochka va e’lon galereyasi bitta e’lon IDsi bo‘yicha aynan bir suratdan foydalanadi. Rasmsiz yoki yuklanmagan rasmli e’lon uchun neytral placeholder chiqadi.
- Haqiqiy API galereyasi boshqa `propertyId` ga tegishli rasmlarni tashlab yuboradi va suratlarni `sortOrder` bo‘yicha tartiblaydi.
- Bektemir uyining mavjud 3D konsepti barcha kirish tugmalaridan sahifa ichidagi dialogda ochiladi. Model faqat tugma bosilganda yuklanadi; yopilganda iframe o‘chiriladi. Katalog filtrlari va ko‘rsatilgan e’lonlar soni saqlanadi.
- 3D ichidagi «E’longa qaytish» dialogni yopadi. Yangi tab ochilmaydi va asosiy sahifa manzili o‘zgarmaydi.
- Mahalliy tekshiruvlarda rasm bog‘lanishi, bo‘sh galereya, tartiblash, turli ID rasmlari, dialogni ochish/yopish va iframe tozalash tekshirildi. Tekshiruv brauzerida WebGL mavjud emasligi sababli modelning grafik renderi tekshirilmagan.

## Galereya va 3D uchun alohida e’lon

- Yangi `#/property/21` — «Basseynli ikki qavatli villa, Bektemir». Sakkizta galereya tasviri aynan mavjud 3D model geometriyasi va materiallaridan render qilingan; boshqa uyning stok fotosi ishlatilmaydi.
- 3D faqat shu e’longa biriktirilgan. Eski `#/property/4` va umumiy headerdagi 3D tugmasi olib tashlangan. Alohida ochilgan 3D sahifadagi qaytish havolalari ham 21-e’longa qaytadi.
- Har bir e’londa asosiy surat ostida tanlanadigan galereya bor. Faqat bitta surati mavjud demo e’lonlarda aynan o‘sha suratning umumiy, yaqin va detal ko‘rinishlari ko‘rsatiladi. Ular boshqa xonalar yoki alohida fotosuratlar deb ko‘rsatilmaydi.
- Haqiqiy e’lonlarda faqat egasi yuklagan suratlar chiqadi. Miniatyura va oldinga/orqaga tugmalari katta rasmni almashtiradi.


## 2026-11-08 (2): 3D tuzatishlar va xona rasmlari

- **Noutbuk:** ekran endi orqa sharnirda, foydalanuvchi tomonga qaragan (avval teskari turgan edi).
- **Zinapoya:** yon tirgaklar ingichkalashtirildi va yurish yo‘lagi biroz toraytirildi — kamera qora diagonal chiziqqa yopishib qolmaydi.
- **Parket:** taxtalar butun maydonni qoplaydi (avval chetlarida yalang‘och chiziqlar qolgan), tutashuv chiziqlari shaxmat tartibida.
- **2-qavat:** zinapoya teshigining ochiq chetiga shisha to‘siq qo‘shildi.
- **E’lonlar:** namunaviy e’lonlarda (yer uchastkasidan tashqari) bosh suratdan keyin Bektemir konsept modelining xona rasmlari (mehmonxona, oshxona, yotoqxonalar, hammom, villalarda basseyn) ko‘rsatiladi. Ular konsept 3D modeldan olingan namuna ekani galereya sarlavhasida yozilgan.
- Backend (`api.js`, `backend-patch/`) o‘zgartirilmagan.
