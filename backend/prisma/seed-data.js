export const SEED_PIN = '1234';
export const DEMO_CASHIERS = ['Siti Rahma', 'Budi Santoso', 'Dewi Lestari'];

export const CATEGORY_SEED = [
  { id: 'makanan', name: 'Makanan' },
  { id: 'minuman', name: 'Minuman' },
  { id: 'pendamping', name: 'Pendamping' },
];

export const MENU_SEED = [
  // Makanan: nasi kikil + satu lauk, harga sama
  { id: 'm1', name: 'Nasi Kikil + Empal', price: 20000, cat: 'makanan', emoji: '🥩' },
  { id: 'm2', name: 'Nasi Kikil + Lidah', price: 20000, cat: 'makanan', emoji: '👅' },
  { id: 'm3', name: 'Nasi Kikil + Kebo/Paru', price: 20000, cat: 'makanan', emoji: '🫁' },
  { id: 'm4', name: 'Nasi Kikil + Babat', price: 20000, cat: 'makanan', emoji: '🍲' },
  { id: 'm5', name: 'Nasi Kikil + Kikil Goreng', price: 20000, cat: 'makanan', emoji: '🍗' },
  { id: 'm6', name: 'Nasi Kikil + Ati', price: 20000, cat: 'makanan', emoji: '🫀' },
  { id: 'm7', name: 'Nasi Kikil + Otak', price: 20000, cat: 'makanan', emoji: '🧠' },
  // Minuman
  { id: 'd1', name: 'Es Teh', price: 3000, cat: 'minuman', emoji: '🧋' },
  { id: 'd2', name: 'Kopi Hitam', price: 5000, cat: 'minuman', emoji: '☕' },
  { id: 'd3', name: 'Kopi Susu', price: 5000, cat: 'minuman', emoji: '🥛' },
  // Pendamping
  { id: 's1', name: 'Kerupuk', price: 1000, cat: 'pendamping', emoji: '🥠' },
];

export const SETTING_SEED = [{ key: 'sundayOff', value: { enabled: true } }];
