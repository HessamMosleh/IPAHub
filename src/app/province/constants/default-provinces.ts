/**
 * Iran's canonical 32 provinces reference list.
 * Tehran is represented as TWO entries (tehran-city and tehran-province)
 * which share one geographical region but are administered separately.
 */
export const DEFAULT_PROVINCES: readonly {
  slug: string;
  en: string;
  fa: string;
  order: number;
}[] = [
  { slug: 'tehran-city', en: 'Tehran (City)', fa: 'تهران (شهر)', order: 0 },
  {
    slug: 'tehran-province',
    en: 'Tehran Province (Counties)',
    fa: 'استان تهران (شهرستان‌ها)',
    order: 1,
  },
  { slug: 'alborz', en: 'Alborz', fa: 'البرز', order: 2 },
  { slug: 'ardabil', en: 'Ardabil', fa: 'اردبیل', order: 3 },
  {
    slug: 'azarbaijan-east',
    en: 'East Azerbaijan',
    fa: 'آذربایجان شرقی',
    order: 4,
  },
  {
    slug: 'azarbaijan-west',
    en: 'West Azerbaijan',
    fa: 'آذربایجان غربی',
    order: 5,
  },
  { slug: 'bushehr', en: 'Bushehr', fa: 'بوشهر', order: 6 },
  {
    slug: 'chaharmahal',
    en: 'Chaharmahal and Bakhtiari',
    fa: 'چهارمحال و بختیاری',
    order: 7,
  },
  { slug: 'fars', en: 'Fars', fa: 'فارس', order: 8 },
  { slug: 'gilan', en: 'Gilan', fa: 'گیلان', order: 9 },
  { slug: 'golestan', en: 'Golestan', fa: 'گلستان', order: 10 },
  { slug: 'hamadan', en: 'Hamadan', fa: 'همدان', order: 11 },
  { slug: 'hormozgan', en: 'Hormozgan', fa: 'هرمزگان', order: 12 },
  { slug: 'ilam', en: 'Ilam', fa: 'ایلام', order: 13 },
  { slug: 'isfahan', en: 'Isfahan', fa: 'اصفهان', order: 14 },
  { slug: 'kerman', en: 'Kerman', fa: 'کرمان', order: 15 },
  { slug: 'kermanshah', en: 'Kermanshah', fa: 'کرمانشاه', order: 16 },
  {
    slug: 'khorasan-north',
    en: 'North Khorasan',
    fa: 'خراسان شمالی',
    order: 17,
  },
  {
    slug: 'khorasan-razavi',
    en: 'Razavi Khorasan',
    fa: 'خراسان رضوی',
    order: 18,
  },
  {
    slug: 'khorasan-south',
    en: 'South Khorasan',
    fa: 'خراسان جنوبی',
    order: 19,
  },
  { slug: 'khuzestan', en: 'Khuzestan', fa: 'خوزستان', order: 20 },
  {
    slug: 'kohgiluyeh',
    en: 'Kohgiluyeh and Boyer-Ahmad',
    fa: 'کهگیلویه و بویراحمد',
    order: 21,
  },
  { slug: 'kurdistan', en: 'Kurdistan', fa: 'کردستان', order: 22 },
  { slug: 'lorestan', en: 'Lorestan', fa: 'لرستان', order: 23 },
  { slug: 'markazi', en: 'Markazi', fa: 'مرکزی', order: 24 },
  { slug: 'mazandaran', en: 'Mazandaran', fa: 'مازندران', order: 25 },
  { slug: 'qazvin', en: 'Qazvin', fa: 'قزوین', order: 26 },
  { slug: 'qom', en: 'Qom', fa: 'قم', order: 27 },
  { slug: 'semnan', en: 'Semnan', fa: 'سمنان', order: 28 },
  {
    slug: 'sistan',
    en: 'Sistan and Baluchestan',
    fa: 'سیستان و بلوچستان',
    order: 29,
  },
  { slug: 'yazd', en: 'Yazd', fa: 'یزد', order: 30 },
  { slug: 'zanjan', en: 'Zanjan', fa: 'زنجان', order: 31 },
];
