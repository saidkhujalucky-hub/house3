export const MISSING_PHOTO = 'image-placeholder.svg';

export function propertyImages(property, baseUrl) {
  const images = Array.isArray(property.images) ? property.images : [];
  return images
    .filter(image => image && (image.propertyId == null || String(image.propertyId) === String(property.id)))
    .slice()
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
    .flatMap(image => {
      if (typeof image.url !== 'string' || !image.url.trim()) return [];
      try {
        const base = new URL(baseUrl);
        base.pathname = base.pathname.replace(/\/?$/, '/');
        const url = new URL(image.url.trim(), base);
        return ['http:', 'https:'].includes(url.protocol) ? [url.href] : [];
      } catch {
        return [];
      }
    })
    .filter((url, index, all) => all.indexOf(url) === index);
}

// Each demo property has its own sample interior gallery. These are inspiration
// photographs, NOT verified photographs of the advertised property.
const ROOM_LABELS = {
  living: 'Mehmonxona', kitchen: 'Oshxona', dining: 'Ovqatlanish xonasi',
  bed1: 'Yotoqxona 1', bed2: 'Yotoqxona 2', bed3: 'Yotoqxona 3',
  bath: 'Hammom', office: 'Ish xonasi', terrace: 'Terrasa',
  pool: 'Basseyn', hallway: 'Yo‘lak', laundry: 'Kir yuvish xonasi',
};
const ROOM_PHOTOS = {
  living: [
    'photo-1600210492486-724fe5c67fb0','photo-1600607687920-4e2a09cf159d',
    'photo-1600566753190-17f0baa2a6c3','photo-1600607687939-ce8a6c25118c',
    'photo-1600566753086-00f18fb6b3ea','photo-1600607688969-a5bfcd646154',
    'photo-1600566752355-35792bedcfea','photo-1600607687644-c7171b42498f',
  ],
  kitchen: [
    'photo-1600585154340-be6161a56a0c','photo-1600607687920-4e2a09cf159d',
    'photo-1600489000022-c2086d79f9d4','photo-1600566753086-00f18fb6b3ea',
    'photo-1600566752355-35792bedcfea','photo-1600607687939-ce8a6c25118c',
  ],
  dining: [
    'photo-1616486338812-3dadae4b4ace','photo-1600607687920-4e2a09cf159d',
    'photo-1600210492486-724fe5c67fb0','photo-1600607687939-ce8a6c25118c',
  ],
  bed1: [
    'photo-1616594039964-ae9021a400a0','photo-1615874959474-d609969a20ed',
    'photo-1618221195710-dd6b41faaea6','photo-1616486338812-3dadae4b4ace',
    'photo-1600607687920-4e2a09cf159d','photo-1600566753190-17f0baa2a6c3',
  ],
  bed2: [
    'photo-1615874959474-d609969a20ed','photo-1616594039964-ae9021a400a0',
    'photo-1618221195710-dd6b41faaea6','photo-1600566753190-17f0baa2a6c3',
    'photo-1616486338812-3dadae4b4ace',
  ],
  bed3: [
    'photo-1618221195710-dd6b41faaea6','photo-1615874959474-d609969a20ed',
    'photo-1616594039964-ae9021a400a0',
  ],
  bath: [
    'photo-1620626011761-996317b8d101','photo-1600566753051-f0b89df2dd90',
    'photo-1600607687939-ce8a6c25118c','photo-1600566753190-17f0baa2a6c3',
  ],
  office: [
    'photo-1497366811353-6870744d04b2','photo-1497366754035-f200968a6e72',
    'photo-1497366858526-0766cadbe8fa','photo-1497366216548-37526070297c',
  ],
  terrace: [
    'photo-1600566753190-17f0baa2a6c3','photo-1600607687920-4e2a09cf159d',
    'photo-1600210492486-724fe5c67fb0',
  ],
  pool: [
    'photo-1576013551627-0cc20b96c2a7','photo-1575429198097-0414ec08e8cd',
    'photo-1572331165267-854da2b10ccc',
  ],
  hallway: [
    'photo-1600607687939-ce8a6c25118c','photo-1600566753086-00f18fb6b3ea',
  ],
  laundry: [
    'photo-1600607687920-4e2a09cf159d','photo-1600566752355-35792bedcfea',
  ],
};
function roomViewsFor(listing) {
  const category = listing.category;
  const rooms = Math.max(0, Number(listing.rooms) || 0);
  if (category === 'Yer uchastkalari') return [];
  if (category === 'Tijorat obyektlari') return ['office','hallway','office','bath'];
  const views = ['living','kitchen','dining'];
  if (rooms > 0) views.push('bed1');
  if (rooms > 2) views.push('bed2');
  if (rooms > 4) views.push('bed3');
  if (Number(listing.bathrooms) > 0) views.push('bath');
  if (category === 'Villalar') views.push('terrace','pool');
  else if (category === 'Uylar') views.push('terrace');
  return views;
}
function samplePhoto(listingId, room, index) {
  const photos = ROOM_PHOTOS[room] || ROOM_PHOTOS.living;
  const choice = photos[(listingId * 7 + index * 3 + Math.floor(listingId / 3)) % photos.length];
  return `https://images.unsplash.com/${choice}?auto=format&fit=crop&w=1400&q=82`;
}
export function assignDemoPhotos(listings) {
  for (const listing of listings) {
    // Real listings and their user-uploaded photos must never be overwritten.
    if (listing.real) continue;
    const id = Number(listing.id);
    listing.photo = `listings/${String(id).padStart(2, '0')}.webp`;
    const rooms = roomViewsFor(listing);
    const gallery = [listing.photo];
    const labels = ['Asosiy ko‘rinish'];
    rooms.forEach((room, index) => {
      const image = samplePhoto(id, room, index);
      if (!gallery.includes(image)) {
        gallery.push(image);
        labels.push(ROOM_LABELS[room]);
      }
    });
    listing.gallery = gallery;
    listing.galleryLabels = labels;
    listing.galleryNote = rooms.length
      ? 'Interyer rasmlari namunaviy, aynan shu uyga tegishli emas'
      : 'Yer uchastkasining namunaviy ko‘rinishi';
    delete listing.tour;
  }
}

export const RESIDENCE_ID = 21;
const residenceViews = [
  ['outside', 'Hovli va fasad'],
  ['pool', 'Basseyn'],
  ['living', 'Mehmonxona'],
  ['kitchen', 'Oshxona'],
  ['bed1', '1-qavat yotoqxona'],
  ['bed2', '2-qavat yotoqxona'],
  ['bath', 'Hammom'],
  ['aerial', 'Yuqoridan ko‘rinish'],
];

export function createResidenceListing() {
  const gallery = residenceViews.map(([view]) => `residence/gallery/${view}.webp`);
  return {
    id: RESIDENCE_ID,
    title: 'Basseynli ikki qavatli villa, Bektemir',
    city: 'Toshkent', district: 'Bektemir', price: 310000,
    category: 'Villalar', type: 'SALE', rooms: 4, area: 220, bathrooms: 3,
    photo: gallery[0], gallery,
    galleryLabels: residenceViews.map(([, label]) => label),
    tour: 'bektemir-residence',
    description: 'Ikki qavatli zamonaviy villa: keng vitraj oynalar, och rangli fasad, yog‘och bezaklar va shisha to‘siqli balkon. Hovlida basseyn, dam olish zonasi, pergola va avtomobil uchun yopiq joy bor. Ichkarida mehmonxona, oshxona, yotoqxonalar va hammom mavjud. Galereyadagi sakkizta tasvir aynan shu 3D modelning o‘zidan tayyorlangan. Bu sotuv taklifi emas, namunaviy e’lon.',
  };
}

export const hasTour = listing => listing?.id === RESIDENCE_ID && listing.tour === 'bektemir-residence' && !listing.real;

export function galleryViews(listing) {
  const photos = Array.isArray(listing.gallery) ? listing.gallery : [];
  if (photos.length === 1 && !listing.real) {
    return [
      { file: photos[0], label: 'Umumiy ko‘rinish', zoom: 1, origin: '50% 50%' },
      { file: photos[0], label: 'Yaqin ko‘rinish', zoom: 1.4, origin: '25% 50%' },
      { file: photos[0], label: 'Detallar', zoom: 1.8, origin: '75% 50%' },
    ];
  }
  return photos.map((file, index) => ({
    file, label: listing.galleryLabels?.[index] || `${index + 1}-rasm`, zoom: 1, origin: '50% 50%',
  }));
}
