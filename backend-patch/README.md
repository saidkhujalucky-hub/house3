# House2 — NestJS uchun qo‘shimcha API moduli

Bu modul avvalgi NestJS + Prisma loyihasidagi mavjud Register/Login/JWT/bcrypt/profil/kategoriyalarni o‘zgartirmaydi.

O‘rnatish:
1. marketplace.module.ts faylini asl backendning src/marketplace/marketplace.module.ts joyiga ko‘chiring (marketplace papkasini yarating).
2. src/app.module.ts ga import qo‘shing:
   import { MarketplaceModule } from './marketplace/marketplace.module.js';
3. AppModule imports ro‘yxatiga MarketplaceModule ni qo‘shing.
4. npm install multer
5. npm install -D @types/multer
6. npx prisma generate
7. npm run build
8. npm run start:dev

Mavjud Prisma schema da Property, PropertyImage, Favorite, Inquiry modellari allaqachon mavjud. Yangi migratsiya kerak emas.

API:
GET /properties?q=&city=&categoryId=&listingType=&minPrice=&maxPrice=&rooms=&page=&limit=
GET /properties/:id
GET /properties/mine (JWT)
POST /properties (JWT)
DELETE /properties/:id (JWT, faqat egasi yoki ADMIN)
POST /properties/:id/images (JWT, multipart files, 8 tagacha, har biri 5 MB)
GET /properties/uploads/:filename
GET /favorites (JWT)
POST /favorites/:id (JWT)
DELETE /favorites/:id (JWT)
POST /properties/:id/inquiries (JWT)
GET /properties/inquiries/received (JWT, faqat sotuvchining xabarlari)

MUHIM: Hozir yangi e’lonlar darhol APPROVED bo‘ladi. Jiddiy production sayt uchun PENDING holati, moderatsiya, xavfsizlik filtrlari, rate-limit, faylning haqiqiy formatini tekshirish va audit log qo‘shing. Fotolar serverdagi uploads papkasida saqlanadi; doimiy disk talab qilinadi. GitHub Pages backendni ishga tushirmaydi. Internetda ishlashi uchun NestJS HTTPS serverni alohida deploy qiling va house2/config.js dagi apiBaseUrl ni shu manzilga o‘zgartiring.
