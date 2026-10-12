export const SEED_PIN = '1234';
export const DEMO_CASHIERS = ['Siti Rahma', 'Budi Santoso', 'Dewi Lestari'];

export const CATEGORY_SEED = [
  { id: 'paket', name: 'Menu Paket', isBundle: true },
  { id: 'minuman', name: 'Minuman' },
  { id: 'makanan', name: 'Makanan' },
  { id: 'pendamping', name: 'Pendamping' },
];

export const MENU_SEED = [
  // Makanan
  { id: 'm1', name: 'Sop Kikil', price: 25000, cat: 'makanan', emoji: '🍲' },
  { id: 'm2', name: 'Nasi Kikil Mercon', price: 28000, cat: 'makanan', emoji: '🌶️' },
  { id: 'm3', name: 'Kikil Rica-Rica', price: 27000, cat: 'makanan', emoji: '🍛' },
  { id: 'm4', name: 'Soto Kikil', price: 24000, cat: 'makanan', emoji: '🥣' },
  { id: 'm5', name: 'Mie Kikil Pedas', price: 22000, cat: 'makanan', emoji: '🍜' },
  { id: 'm6', name: 'Kikil Goreng Crispy', price: 26000, cat: 'makanan', emoji: '🍗' },
  // Minuman
  { id: 'd1', name: 'Es Jeruk', price: 8000, cat: 'minuman', emoji: '🍊' },
  { id: 'd2', name: 'Es Teh Manis', price: 5000, cat: 'minuman', emoji: '🧋' },
  { id: 'd3', name: 'Teh Hangat', price: 4000, cat: 'minuman', emoji: '🍵' },
  { id: 'd4', name: 'Es Kelapa Muda', price: 12000, cat: 'minuman', emoji: '🥥' },
  { id: 'd5', name: 'Kopi Hitam', price: 6000, cat: 'minuman', emoji: '☕' },
  { id: 'd6', name: 'Air Mineral', price: 4000, cat: 'minuman', emoji: '💧' },
  // Pendamping
  { id: 's1', name: 'Nasi Putih', price: 5000, cat: 'pendamping', emoji: '🍚' },
  { id: 's2', name: 'Kerupuk', price: 3000, cat: 'pendamping', emoji: '🥠' },
  { id: 's3', name: 'Tempe Goreng', price: 4000, cat: 'pendamping', emoji: '🍘' },
  { id: 's4', name: 'Telur Rebus', price: 5000, cat: 'pendamping', emoji: '🥚' },
  { id: 's5', name: 'Sambal Extra', price: 2000, cat: 'pendamping', emoji: '🌶️' },
  { id: 's6', name: 'Pudding Cokelat', price: 8000, cat: 'pendamping', emoji: '🍮' },
  // Paket (kombinasi menu + diskon %)
  {
    id: 'p1',
    name: 'Paket Hemat Kikil',
    cat: 'paket',
    emoji: '🍱',
    discountPercent: 10,
    items: [
      { id: 'm1', qty: 1 },
      { id: 's1', qty: 1 },
      { id: 'd2', qty: 1 },
    ],
  },
  {
    id: 'p2',
    name: 'Paket Mercon',
    cat: 'paket',
    emoji: '🔥',
    discountPercent: 5,
    items: [
      { id: 'm2', qty: 1 },
      { id: 'd1', qty: 1 },
    ],
  },
  {
    id: 'p3',
    name: 'Paket Berdua',
    cat: 'paket',
    emoji: '🍽️',
    discountPercent: 15,
    items: [
      { id: 'm1', qty: 2 },
      { id: 's1', qty: 2 },
      { id: 'd1', qty: 2 },
      { id: 's2', qty: 1 },
    ],
  },
];

export const SETTING_SEED = [{ key: 'sundayOff', value: { enabled: true } }];
