import { PageKey } from '../page.schema';

export const PAGE_KEYS = Object.values(PageKey) as PageKey[];

export const SINGLE_SEGMENT_PAGE_KEYS = PAGE_KEYS.filter(
  (key) => key !== PageKey.MEMBERSHIP_GUIDE,
);

export interface DefaultPageSeed {
  key: PageKey;
  title: {
    en: string;
    fa?: string;
  };
  body: {
    en: string;
    fa?: string;
  };
}

export const DEFAULT_PAGES: DefaultPageSeed[] = [
  {
    key: PageKey.ABOUT_FORUM,
    title: { en: 'About Us', fa: 'درباره ما' },
    body: {
      en: `<h2>Who we are</h2>\n<p>The Industrial Consultants Association is an independent professional body bringing together consulting engineers and advisory firms active in Iran's industrial sector. For more than two decades our members have supported the planning, design and modernisation of manufacturing and infrastructure projects across the country.</p>\n<h2>Our mission</h2>\n<p>We work to raise the standard of industrial consulting, protect the professional interests of our members, and act as a trusted bridge between consultants, industry and public institutions.</p>\n<ul>\n<li>Uphold professional ethics and quality standards in consulting practice.</li>\n<li>Represent the collective voice of industrial consultants before policymakers.</li>\n<li>Support members with training, networking and professional recognition.</li>\n</ul>`,
      fa: `<h2>ما که هستیم</h2>\n<p>انجمن مشاوران صنعتی یک نهاد حرفه‌ای مستقل است که مهندسان مشاور و شرکت‌های مشاوره‌ای فعال در بخش صنعت ایران را گرد هم می‌آورد. بیش از دو دهه است که اعضای ما از برنامه‌ریزی، طراحی و نوسازی پروژه‌های تولیدی و زیرساختی در سراسر کشور پشتیبانی می‌کنند.</p>\n<h2>مأموریت ما</h2>\n<p>ما برای ارتقای سطح مشاوره صنعتی، حفاظت از منافع حرفه‌ای اعضا و ایفای نقش پلی مورد اعتماد میان مشاوران، صنعت و نهادهای عمومی تلاش می‌کنیم.</p>\n<ul>\n<li>پایبندی به اخلاق حرفه‌ای و استانداردهای کیفیت در مشاوره.</li>\n<li>نمایندگی صدای جمعی مشاوران صنعتی نزد سیاست‌گذاران.</li>\n<li>پشتیبانی از اعضا از طریق آموزش، شبکه‌سازی و اعتباربخشی حرفه‌ای.</li>\n</ul>`,
    },
  },
  {
    key: PageKey.FORUM_STRUCTURE,
    title: { en: 'Our Structure', fa: 'ساختار ما' },
    body: {
      en: `<h2>Governance</h2>\n<p>The association is governed by a General Assembly of members, which elects a Board of Directors and a panel of Inspectors. Day-to-day affairs are led by the President and the Secretary, supported by specialised vice-presidencies and a treasury office.</p>\n<h2>Provincial network</h2>\n<p>Alongside the national bodies, provincial offices coordinate members' activities at the regional level, organise local events and represent the association in each province.</p>`,
      fa: `<h2>ارکان</h2>\n<p>انجمن توسط مجمع عمومی اعضا اداره می‌شود که هیئت مدیره و هیئت بازرسان را انتخاب می‌کند. امور جاری زیر نظر رئیس و دبیر و با پشتیبانی معاونت‌های تخصصی و خزانه‌داری پیش می‌رود.</p>\n<h2>شبکه استانی</h2>\n<p>در کنار ارکان ملی، دفاتر استانی فعالیت اعضا را در سطح منطقه‌ای هماهنگ می‌کنند، رویدادهای محلی برگزار می‌کنند و انجمن را در هر استان نمایندگی می‌کنند.</p>`,
    },
  },
  {
    key: PageKey.GOALS,
    title: { en: 'Goals of the Association', fa: 'اهداف انجمن' },
    body: {
      en: `<h2>What we set out to achieve</h2>\n<ul>\n<li>Promote the role of industrial consulting in national economic development.</li>\n<li>Improve the technical and professional capabilities of members through continuous education.</li>\n<li>Establish and maintain fair, transparent standards for consulting services.</li>\n<li>Facilitate cooperation between consultants, contractors and employers.</li>\n<li>Support young engineers entering the consulting profession.</li>\n</ul>`,
      fa: `<h2>آنچه دنبال می‌کنیم</h2>\n<ul>\n<li>ترویج نقش مشاوره صنعتی در توسعه اقتصادی کشور.</li>\n<li>ارتقای توان فنی و حرفه‌ای اعضا از طریق آموزش مستمر.</li>\n<li>تدوین و حفظ استانداردهای منصفانه و شفاف برای خدمات مشاوره.</li>\n<li>تسهیل همکاری میان مشاوران، پیمانکاران و کارفرمایان.</li>\n<li>حمایت از مهندسان جوان در ورود به حرفه مشاوره.</li>\n</ul>`,
    },
  },
  {
    key: PageKey.MEMBERSHIP,
    title: { en: 'Membership & Card Issuance', fa: 'عضویت و صدور کارت' },
    body: {
      en: `<h2>Join the association</h2>\n<p>Membership is open to qualified consulting engineers and advisory firms active in the industrial sector. Members gain access to training events, professional recognition, official membership documents and a nationwide network of peers.</p>\n<h2>How to apply</h2>\n<p>Applications are submitted through the member portal. After your details are verified, an approved membership is issued and you can request an official membership card and supporting letters online.</p>`,
      fa: `<h2>به انجمن بپیوندید</h2>\n<p>عضویت برای مهندسان مشاور و شرکت‌های مشاوره‌ای واجد شرایط فعال در بخش صنعت آزاد است. اعضا به رویدادهای آموزشی، اعتبار حرفه‌ای، مدارک رسمی عضویت و شبکه‌ای سراسری از همکاران دسترسی پیدا می‌کنند.</p>\n<h2>نحوه درخواست</h2>\n<p>درخواست‌ها از طریق درگاه اعضا ثبت می‌شوند. پس از بررسی اطلاعات، عضویت تأییدشده صادر می‌شود و می‌توانید کارت عضویت رسمی و نامه‌های پشتیبان را به صورت برخط درخواست کنید.</p>`,
    },
  },
  {
    key: PageKey.MEMBERSHIP_GUIDE,
    title: { en: 'Membership Guide', fa: 'راهنمای عضویت' },
    body: {
      en: `<h2>Step-by-step</h2>\n<ul>\n<li>Register in the member portal with your mobile number and national ID.</li>\n<li>Complete your professional profile and upload the required documents.</li>\n<li>Wait for administrative review and approval of your application.</li>\n<li>Once approved, request your membership card and official letters.</li>\n</ul>\n<p>For questions about the process, please contact the association's secretariat.</p>`,
      fa: `<h2>گام‌به‌گام</h2>\n<ul>\n<li>در درگاه اعضا با شماره موبایل و کد ملی ثبت‌نام کنید.</li>\n<li>پروفایل حرفه‌ای خود را تکمیل و مدارک لازم را بارگذاری کنید.</li>\n<li>منتظر بررسی و تأیید درخواست خود توسط مدیریت بمانید.</li>\n<li>پس از تأیید، کارت عضویت و نامه‌های رسمی خود را درخواست کنید.</li>\n</ul>\n<p>برای پرسش درباره فرایند، لطفاً با دبیرخانه انجمن تماس بگیرید.</p>`,
    },
  },
  {
    key: PageKey.MEMORANDUM,
    title: { en: 'Memorandum', fa: 'مرام نامه' },
    body: {
      en: `<h2>Memorandum of the Association</h2>\n<p>The code of ethics, values, and commitments that every member and consulting practitioner of the association agrees to uphold in their professional conduct.</p>`,
      fa: `<h2>مرام‌نامه انجمن</h2>\n<p>مجموعه اصول اخلاقی، ارزش‌ها و تعهداتی که تمامی اعضا و فعالان مشاوره در انجمن در راستای فعالیت حرفه‌ای خود به رعایت آن‌ها پایبند می‌باشند.</p>`,
    },
  },
];
