import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  CornerUpLeft,
  Search,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Volume2,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Sliders,
  FolderOpen,
  Keyboard,
  AlertTriangle,
  HelpCircle,
  Copy,
  Check,
  Globe,
  FileText,
  Settings,
  ShieldCheck,
  RefreshCw,
  Palette,
  Eye,
  Type,
} from 'lucide-react';
import { useAppTheme } from '../context/ThemeContext';
import { AppLanguage } from '../i18n';

interface HelpTutorialViewProps {
  onClose: () => void;
  initialLanguage?: AppLanguage;
}

interface Chapter {
  id: number;
  slug: string;
  titleEn: string;
  titleFa: string;
  icon: string;
  contentEn: React.ReactNode;
  contentFa: React.ReactNode;
}

export const HelpTutorialView: React.FC<HelpTutorialViewProps> = ({
  onClose,
  initialLanguage = 'en',
}) => {
  const { isDark } = useAppTheme();
  const [lang, setLang] = useState<AppLanguage>(initialLanguage);
  const [activeChapterId, setActiveChapterId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isFa = lang === 'fa';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const chapters: Chapter[] = useMemo(() => [
    {
      id: 1,
      slug: 'intro',
      titleEn: '1. Introduction & Overview',
      titleFa: '۱. معرفی و نمای کلی سامانه',
      icon: 'sparkles',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 1: Introduction & Overview</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <strong>English Flashcard Generator (v1.1.8)</strong> is an advanced desktop application designed for serious language learners, educators, and polyglots. It integrates directly with <strong>Anki</strong> via AnkiConnect to construct beautiful, pedagogically sound, audio-rich flashcards in seconds.
          </p>
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Core Highlights
            </h4>
            <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
              <li><strong>Completely Optional AI:</strong> Use local neural Ollama, Google Cloud Gemini, or operate 100% offline with zero AI requirement.</li>
              <li><strong>Offline Neural Speech (Piper TTS):</strong> Generate crystal-clear, pitch-perfect British and American pronunciations without internet or API keys.</li>
              <li><strong>12 Custom Anki Card Note Types:</strong> Comic Pop, Duolingo Duo Quest, Index Notebook, Botanical Sage, and Minimal styles in Light and Dark variants.</li>
              <li><strong>Dedicated Typography:</strong> Phonetics rendered in <em>Charis SIL</em> font; Persian text styled in <em>Vazirmatn</em> for perfect Persian shaping.</li>
              <li><strong>Format B Batch Engine:</strong> Ingest hundreds of words and custom definitions via structured text files with full delimiter flexibility.</li>
            </ul>
          </div>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱: معرفی و نمای کلی سامانه</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 font-sans">
            نرم‌افزار <strong>English Flashcard Generator (نسخه ۱.۱.۸)</strong> یک ابزار پیشرفته دسکتاپ برای یادگیری عمیق واژگان زبان انگلیسی است که مستقیماً با نرم‌افزار <strong>آنکی (Anki)</strong> از طریق AnkiConnect هماهنگ می‌شود و کارت‌های آموزشی غنی از تلفظ صوتی، تصویر و توضیحات فارسی ایجاد می‌کند.
          </p>
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> قابلیت‌های بنیادین سامانه
            </h4>
            <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
              <li><strong>هوش مصنوعی کاملاً اختیاری:</strong> امکان استفاده از اولاما (Ollama) آفلاین، جمینای ابری یا کارکرد ۱۰۰٪ دستی بدون هوش مصنوعی.</li>
              <li><strong>تلفظ عصبی آفلاین (Piper TTS):</strong> تولید فایل‌های صوتی بریتانیایی و آمریکایی با کیفیت استودیویی بدون نیاز به اینترنت.</li>
              <li><strong>۱۲ قالب اختصاصی آنکی:</strong> قالب‌های کمیک، دولینگو، دفترچه، گیاه‌شناسی و مینیمال در حالت‌های روشن و تاریک.</li>
              <li><strong>تایپوگرافی اصیل:</strong> رندر فونتیک IPA با فونت <em>Charis SIL</em> و متن‌های فارسی با فونت استاندارد <em>وزیرمتن (Vazirmatn)</em>.</li>
              <li><strong>فرمت B برای پردازش دسته‌ای:</strong> ساخت صدها کارت از روی فایل متنی با فیلدهای کاملاً ساخت‌یافته.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      slug: 'prerequisites',
      titleEn: '2. Getting Started & Prerequisites',
      titleFa: '۲. شروع کار و پیش‌نیازها',
      icon: 'check',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 2: Getting Started & Prerequisites</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            To make the most of the application, ensure you have the following components installed and properly running:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-none space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <span>1. Anki Desktop (24.x or 23.x)</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">Install standard Anki from <a href="https://apps.ankiweb.net/" target="_blank" rel="noreferrer" className="text-blue-500 underline">ankiweb.net</a>. Keep Anki open in the background.</p>
            </div>
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-none space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <span>2. AnkiConnect Add-on (Code: 2055492159)</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">Open Anki → Tools → Add-ons → Get Add-ons → paste code <code>2055492159</code>.</p>
            </div>
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-none space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <span>3. Piper Local TTS (Optional / Offline)</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">Integrated local service for offline speech synthesis. Can be enabled in Settings → Audio.</p>
            </div>
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-none space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <span>4. Ollama or Gemini (Optional)</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">Install Ollama with <code>qwen2.5:3b</code> or configure a Gemini API key for automated word meanings and examples.</p>
            </div>
          </div>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۲: شروع کار و پیش‌نیازها</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            برای بهره‌مندی کامل از تمام امکانات این نرم‌افزار، اطمینان حاصل کنید پیش‌نیازهای زیر در سیستم شما فعال هستند:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-none space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-zinc-100">۱. برنامه دسکتاپ آنکی (Anki)</div>
              <p className="text-zinc-600 dark:text-zinc-400">نسخه رسمی آنکی را از <a href="https://apps.ankiweb.net/" target="_blank" rel="noreferrer" className="text-blue-500 underline">ankiweb.net</a> دانلود و باز نگه دارید.</p>
            </div>
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-none space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-zinc-100">۲. افزونه AnkiConnect (کد: ۲۰۵۵۴۹۲۱۵۹)</div>
              <p className="text-zinc-600 dark:text-zinc-400">در منوی آنکی: Tools ← Add-ons ← Get Add-ons و وارد کردن کد <code>2055492159</code>.</p>
            </div>
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-none space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-zinc-100">۳. پایپر TTS آفلاین (اختیاری)</div>
              <p className="text-zinc-600 dark:text-zinc-400">سرویس تولید صدای عصبی بدون اینترنت که در بخش تنظیمات صدا فعال می‌شود.</p>
            </div>
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-none space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-zinc-100">۴. اولاما یا کلید جمینای (اختیاری)</div>
              <p className="text-zinc-600 dark:text-zinc-400">برای تولید خودکار معنی و مثال توسط هوش مصنوعی در صورت تمایل.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      slug: 'ankiconnect',
      titleEn: '3. Connecting to Anki & AnkiConnect',
      titleFa: '۳. اتصال به آنکی و افزونه AnkiConnect',
      icon: 'settings',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 3: Connecting to Anki & AnkiConnect</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            The application communicates with Anki via HTTP POST requests on <code>http://127.0.0.1:8765</code>.
          </p>
          <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-none space-y-2">
            <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Recommended AnkiConnect Config (CORS & Permissions):</h4>
            <pre className="p-2.5 bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto rounded-none">
{`{
  "apiKey": null,
  "apiLogPath": null,
  "ignoreOriginList": [],
  "webBindAddress": "127.0.0.1",
  "webBindPort": 8765,
  "webCorsOriginList": [
    "http://localhost",
    "http://127.0.0.1",
    "*"
  ]
}`}
            </pre>
            <p className="text-xs text-zinc-500">In Anki: Tools → Add-ons → AnkiConnect → Config → paste the snippet above and restart Anki.</p>
          </div>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۳: اتصال به آنکی و افزونه AnkiConnect</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            ارتباط برنامه با آنکی از طریق درگاه محلی <code>http://127.0.0.1:8765</code> برقرار می‌شود.
          </p>
          <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-none space-y-2">
            <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">پیکربندی توصیه شده AnkiConnect (مجوز CORS):</h4>
            <pre className="p-2.5 bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto rounded-none text-left" dir="ltr">
{`{
  "apiKey": null,
  "webBindAddress": "127.0.0.1",
  "webBindPort": 8765,
  "webCorsOriginList": [
    "http://localhost",
    "http://127.0.0.1",
    "*"
  ]
}`}
            </pre>
            <p className="text-xs text-zinc-500">در آنکی: Tools ← Add-ons ← AnkiConnect ← Config ← متن بالا را جایگزین کرده و آنکی را ریستارت کنید.</p>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      slug: 'note-types',
      titleEn: '4. Understanding Note Types & Themes',
      titleFa: '۴. آشنایی با انواع نوت و تم‌های طراحی',
      icon: 'palette',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 4: Note Types & Visual Themes</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            The application includes 12 tailored note designs, divided into 6 visual styles with Light and Dark variants:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>1. Comic Pop (Light / Dark):</strong> Dynamic retro comic aesthetic with bold black outlines, vibrant speech bubbles, and pop-art badges.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>2. Duo Quest (Light / Dark):</strong> Duolingo-inspired gamified UI with rounded cards, XP badges, interactive spelling tests, and cheerful colored regions.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>3. Hero Pop (Light / Dark):</strong> Superhero and action-themed typography with high-energy highlights.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>4. Index Notebook (Light / Dark):</strong> Grid-lined and spiral notebook style reminiscent of student study journals.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>5. Botanical Sage (Light / Dark):</strong> Nature-inspired organic palette with soft sage surfaces, rounded boxes, and calming earthy tones.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>6. Minimal (Light / Dark):</strong> Clean, distraction-free typographic layout focused strictly on memorization efficiency.
            </div>
          </div>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۴: انواع نوت و تم‌های طراحی</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            این برنامه دارای ۱۲ قالب طراحی شده در ۶ سبک گرافیکی مجزا (هر کدام با حالت‌های روشن و تاریک) است:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>۱. کمیک پاپ (Comic Pop):</strong> طراحی شاداب با خطوط ضخیم مشکی و کادرهای گفت‌وگوی کمیک.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>۲. دوئو کوئست (Duo Quest):</strong> طراحی الهام گرفته از دولینگو با نشان‌های XP، تمرین اسپلینگ تعاملی و کارت‌های گرد.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>۳. دفترچه یادداشت (Index Notebook):</strong> شبیه‌ساز دفترچه مشق و صفحات شطرنجی یادگیری.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>۴. مریم‌گلی گیاه‌شناسی (Botanical Sage):</strong> پالت رنگی ملایم و ارگانیک با پس‌زمینه‌های طبیعی و آرامش‌بخش.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>۵. مینیمال (Minimal):</strong> طراحی تمیز و بدون شلوغی برای بالاترین تمرکز ذهنی.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      slug: 'single-card',
      titleEn: '5. Single Card Creation',
      titleFa: '۵. ساخت تک‌کارت حرفه‌ای',
      icon: 'fileText',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 5: Single Card Creation</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            The <strong>Create</strong> tab allows you to rapidly generate a card for any target word with full manual control or automated AI assistance.
          </p>
          <ol className="list-decimal list-inside text-xs space-y-1.5 text-zinc-700 dark:text-zinc-300">
            <li>Type the target English word in the left-hand input.</li>
            <li>Select your target Anki Deck (e.g. <code>English::B1</code>).</li>
            <li>Choose your card type: <strong>Standard</strong> or <strong>Spelling</strong>.</li>
            <li>Select which audio variants you want enabled for this card.</li>
            <li>Click <strong>Generate Flashcard</strong> or type custom meanings manually in the in-place editor.</li>
            <li>Inspect the live preview on the right, toggle between Front and Back sides, and click <strong>Save to Anki</strong>.</li>
          </ol>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۵: ساخت تک‌کارت حرفه‌ای</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            بخش <strong>ایجاد کارت</strong> به شما اجازه می‌دهد در سریع‌ترین زمان ممکن برای هر واژه دلخواه فلش‌کارت بسازید:
          </p>
          <ol className="list-decimal list-inside text-xs space-y-1.5 text-zinc-700 dark:text-zinc-300">
            <li>واژه انگلیسی مورد نظر را در کادر سمت چپ وارد کنید.</li>
            <li>دسته (Deck) مقصد را در آنکی انتخاب کنید.</li>
            <li>نوع کارت را بین <strong>استاندارد</strong> یا <strong>اسپلینگ</strong> انتخاب نمایید.</li>
            <li>انواع تلفظ صوتی مورد نیاز (بریتانیایی، آمریکایی، عادی یا اسلو) را فعال کنید.</li>
            <li>روی دکمه تولید کلیک کرده یا مستقیماً فیلدها را در پیش‌نمایش ویرایش کنید.</li>
            <li>پیش‌نمایش زنده پشت و روی کارت را بررسی کرده و روی <strong>ذخیره در آنکی</strong> بزنید.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 6,
      slug: 'batch-card',
      titleEn: '6. Batch Card Creation (TXT & Raw Text)',
      titleFa: '۶. ساخت دسته‌ای کارت‌ها (TXT و متن خام)',
      icon: 'layers',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 6: Batch Card Creation</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            The <strong>Batch</strong> view allows processing dozens or hundreds of flashcards in a single automated session. You can upload <code>.txt</code> files or paste raw lists of words.
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li><strong>Auto-Deduplication:</strong> Prevents creating duplicate notes if the word already exists in your deck.</li>
            <li><strong>Auto-Retry Engine:</strong> Automatically recovers from network hiccups or transient timeouts up to 3 times.</li>
            <li><strong>Interactive Modal Editor:</strong> Click any card in the batch list to open the full card editor and refine fields before or after saving.</li>
          </ul>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۶: ساخت دسته‌ای کارت‌ها</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            در بخش <strong>پردازش دسته‌ای</strong> می‌توانید ده‌ها یا صدها کلمه را به صورت یکجا از طریق آپلود فایل متنی یا چسباندن متن وارد کنید:
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li><strong>جلوگیری خودکار از کارت‌های تکراری:</strong> کلماتی که قبلاً در دسته شما وجود داشته باشند شناسایی می‌شوند.</li>
            <li><strong>موتور تلاش مجدد خودکار:</strong> در صورت بروز قطعی موقت اینترنت یا هوش مصنوعی، تا ۳ بار تلاش مجدد صورت می‌گیرد.</li>
            <li><strong>امکان ویرایش تک‌تک کارت‌ها:</strong> با کلیک روی هر آیتم، ادیتور کامل کارت باز شده و امکان ویرایش فراهم است.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 7,
      slug: 'format-b',
      titleEn: '7. Format B Specification (Exact Syntax & Mapping)',
      titleFa: '۷. مشخصات استاندارد فرمت B (دستور زبان و نگاشت فیلدها)',
      icon: 'fileText',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 7: Format B Specification</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <strong>Format B</strong> is the official structured plain-text format supported by the Batch processor. It allows you to specify custom field values for each card or leave missing fields for automated generation.
          </p>
          <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs space-y-2">
            <div className="font-bold text-zinc-900 dark:text-zinc-100">Syntax Rules:</div>
            <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
              <li>Cards are separated by <code>--</code> on its own line (or double blank lines).</li>
              <li>Each field is written as <code>Key=Value</code> or <code>Key: Value</code>.</li>
              <li>Multiple tags are comma-separated: <code>Tag=verbs, academic, b2</code>.</li>
              <li>To disable AI for a card: <code>AI=false</code>.</li>
            </ul>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 pt-2">Canonical Example:</div>
            <pre className="p-2.5 bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto rounded-none">
{`--
Word=abandon
Deck=English::B1
Tag=verbs, b1
AI=false
Phonetic=/əˈbændən/
Part of Speech=verb
Persian Meaning=رها کردن، ترک کردن
English Definition=To leave a place, thing, or person forever.
Example Sentence=He abandoned his car on the highway.
ExampleTranslation=او ماشین خود را در بزرگراه رها کرد.
Memory Aid=A-BAND-ON: Imagine a musical band left behind.
Photo=false
Spelling=false
--`}
            </pre>
          </div>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۷: مشخصات استاندارد فرمت B</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <strong>فرمت B</strong> استاندارد رسمی متن ساخت‌یافته در این نرم‌افزار است که امکان تعیین دقیق فیلدها را به شما می‌دهد:
          </p>
          <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs space-y-2">
            <div className="font-bold text-zinc-900 dark:text-zinc-100">قوانین نوشتاری:</div>
            <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
              <li>هر کارت با علامت <code>--</code> در یک خط جداگانه جدا می‌شود.</li>
              <li>فیلدها به صورت <code>کلید=مقدار</code> یا <code>کلید: مقدار</code> نوشته می‌شوند.</li>
              <li>تگ‌ها با کاما از هم جدا می‌شوند: <code>Tag=verbs, b1</code>.</li>
              <li>برای عدم استفاده از هوش مصنوعی برای یک کارت: <code>AI=false</code>.</li>
            </ul>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 pt-2 text-left" dir="ltr">نمونه استاندارد:</div>
            <pre className="p-2.5 bg-zinc-900 text-zinc-100 font-mono text-xs overflow-x-auto rounded-none text-left" dir="ltr">
{`--
Word=abandon
Deck=English::B1
Tag=verbs, b1
AI=false
Phonetic=/əˈbændən/
Part of Speech=verb
Persian Meaning=رها کردن، ترک کردن
English Definition=To leave a place, thing, or person forever.
Example Sentence=He abandoned his car on the highway.
ExampleTranslation=او ماشین خود را در بزرگراه رها کرد.
Memory Aid=A-BAND-ON: Imagine a musical band left behind.
Photo=false
Spelling=false
--`}
            </pre>
          </div>
        </div>
      ),
    },
    {
      id: 8,
      slug: 'browser',
      titleEn: '8. Card Browser & Management',
      titleFa: '۸. مرورگر و مدیریت کارت‌ها',
      icon: 'search',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 8: Card Browser & Management</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            The <strong>Card Browser</strong> lets you search and inspect your entire collection of Anki cards directly from within the app without needing to open Anki's native browser.
          </p>
          <ul className="list-disc list-inside text-xs space-y-1.5 text-zinc-700 dark:text-zinc-300">
            <li>Search by word, tag, or deck with instant results.</li>
            <li>Click any card to preview its full styling and listen to audio clips.</li>
            <li>Edit fields in-place, change its deck or note type, and update Anki instantly.</li>
            <li>Jump directly to Anki's GUI browser with the <em>Show Card in Anki</em> button.</li>
          </ul>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۸: مرورگر و مدیریت کارت‌ها</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            بخش <strong>مرورگر کارت‌ها</strong> امکان جستجو و بررسی کارت‌های موجود در مجموعه آنکی شما را فراهم می‌کند:
          </p>
          <ul className="list-disc list-inside text-xs space-y-1.5 text-zinc-700 dark:text-zinc-300">
            <li>جستجوی سریع بر اساس واژه، تگ یا نام دسته.</li>
            <li>مشاهده کارت با قالب واقعی و پخش تلفظ‌ها.</li>
            <li>امکان ویرایش فیلدها، انتقال به دسته دیگر و ذخیره در آنکی.</li>
            <li>دکمه نمایش مستقیم در مرورگر آنکی (GUI Browser).</li>
          </ul>
        </div>
      ),
    },
    {
      id: 9,
      slug: 'complete-tag',
      titleEn: '9. Complete Cards by Tag Workflow',
      titleFa: '۹. تکمیل کارت‌های ناقص بر اساس تگ',
      icon: 'sparkles',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 9: Complete Cards by Tag Workflow</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            If you have existing vocabulary cards that are missing phonetics, Persian meanings, or examples, the <strong>Complete by Tag</strong> feature automates filling those missing fields without touching already completed ones.
          </p>
          <ol className="list-decimal list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>Tag your incomplete notes in Anki (e.g. <code>need-meaning</code> or <code>b1</code>).</li>
            <li>In Complete by Tag view, enter or select the tag.</li>
            <li>Use the <strong>Generate Images</strong> toggle to decide whether to fetch illustrations.</li>
            <li>Click <strong>Start Processing</strong> to let the engine populate all missing fields.</li>
          </ol>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۹: تکمیل کارت‌های ناقص بر اساس تگ</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            اگر کارت‌هایی در آنکی دارید که فاقد فونتیک، معنی فارسی یا مثال هستند، ویژگی <strong>تکمیل با تگ</strong> فیلدهای خالی را به صورت خودکار پر می‌کند بدون اینکه به فیلدهای پرشده دست بزند:
          </p>
          <ol className="list-decimal list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>کارت‌های ناقص را در آنکی با یک تگ مشخص علامت‌گذاری کنید (مثلاً <code>b1</code>).</li>
            <li>تگ را در صفحه تکمیل با تگ انتخاب کنید.</li>
            <li>از کلید <strong>تولید تصویر</strong> برای تعیین نیاز به افزودن عکس استفاده کنید.</li>
            <li>روی شروع پردازش کلیک کنید تا تمام فیلدهای ناقص تکمیل شوند.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 10,
      slug: 'audio-tts',
      titleEn: '10. Audio & TTS System (Local Piper & Online)',
      titleFa: '۱۰. سیستم هوشمند تلفظ صوتی (پایپر محلی و آنلاین)',
      icon: 'volume',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 10: Audio & TTS System</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            The application includes two distinct TTS pathways:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>1. Local Neural Piper TTS:</strong> Completely offline speech synthesis using deep neural voice models. Delivers natural, studio-quality sound without external network calls.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>2. Online TTS:</strong> Lightweight cloud TTS for fast generation when offline Piper service is not active.
            </div>
          </div>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۰: سیستم هوشمند تلفظ صوتی</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            این برنامه از دو مسیر مجزا برای تولید صوت استفاده می‌کند:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>۱. پایپر محلی (Piper Local TTS):</strong> سنتز صدای عصبی کاملاً آفلاین و بدون نیاز به اینترنت با کیفیت استودیویی.
            </div>
            <div className="p-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>۲. سرویس صوتی آنلاین:</strong> تولید سریع فایل‌های صوتی برای مواقعی که سرویس آفلاین در دسترس نیست.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 11,
      slug: 'audio-variants',
      titleEn: '11. Audio Variants: Word & Example (Normal/Slow, Br/Am)',
      titleFa: '۱۱. تنوع‌های صوتی: واژه و مثال (عادی و آهسته، بریتانیایی و آمریکایی)',
      icon: 'volume',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 11: Audio Variants Selection</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            For both the <strong>Word</strong> and <strong>Example Sentence</strong>, up to 4 audio variants can be generated:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <strong>Br (British Normal):</strong> Standard British pronunciation at normal native speed.
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <strong>Br Slow (British Slow):</strong> British pronunciation at a deliberate, learner-friendly pace.
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <strong>Am (American Normal):</strong> Standard American accent at normal native speed.
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <strong>Am Slow (American Slow):</strong> American pronunciation at a clear, slower pace.
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            In card editors, you can enable any combination (from 0 to all 4). Any disabled variant is strictly excluded from your Anki flashcard.
          </p>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۱: تنوع‌های صوتی</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            برای هر دو بخش <strong>کلمه</strong> و <strong>جمله مثال</strong>، ۴ تنوع صوتی مختلف قابل انتخاب است:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <strong>Br:</strong> تلفظ بریتانیایی با سرعت طبیعی.
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <strong>Br Slow:</strong> تلفظ بریتانیایی با سرعت آهسته و شمرده.
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <strong>Am:</strong> تلفظ آمریکایی با سرعت طبیعی.
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
              <strong>Am Slow:</strong> تلفظ آمریکایی با سرعت آهسته و دقیق.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 12,
      slug: 'images',
      titleEn: '12. Image Generation & Caching',
      titleFa: '۱۲. تولید تصویر هوشمند و کش تصاویر',
      icon: 'image',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 12: Smart Images & Caching</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Visual flashcards significantly improve memory retention. The Smart Images module searches Wikimedia Commons and trusted educational sources for copyright-free, relevant illustrations for concrete nouns and visual verbs.
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Images are stored directly into Anki's <code>collection.media</code> folder as optimized PNG/JPEG files, ensuring they sync seamlessly to AnkiMobile (iOS) and AnkiDroid (Android).
          </p>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۲: تولید تصویر هوشمند و کش تصاویر</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            تصاویر آموزشی نقش مؤثری در به خاطر سپردن لغات دارند. ماژول تصاویر هوشمند به صورت خودکار تصاویر آزاد و مرتبط با واژه را از منابع معتبر دریافت و در پوشه رسانه آنکی ذخیره می‌کند تا در تلفن همراه نیز نمایش داده شوند.
          </p>
        </div>
      ),
    },
    {
      id: 13,
      slug: 'persian-typography',
      titleEn: '13. Persian Translations & RTL Typography (Vazirmatn)',
      titleFa: '۱۳. ترجمه‌های فارسی و تایپوگرافی راست‌چین (فونت وزیرمتن)',
      icon: 'type',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 13: Persian Typography (Vazirmatn)</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Every Persian string—from card definitions to UI labels—uses the acclaimed <strong>Vazirmatn</strong> typeface.
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>Strict Right-to-Left (RTL) alignment for Persian explanations and sentence translations.</li>
            <li>Proper Persian glyph shaping, ensuring zero disconnected letter bugs across Windows, macOS, and Linux.</li>
            <li>Embedded web font fallback ensures cards display identically on mobile Anki apps even without Vazirmatn installed on the phone.</li>
          </ul>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۳: تایپوگرافی فارسی (وزیرمتن)</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            تمامی متون فارسی موجود در کارت‌ها و رابط کاربری برنامه از فونت استاندارد <strong>وزیرمتن (Vazirmatn)</strong> بهره می‌برند:
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>جهت کاملاً استاندارد راست به چپ (RTL) برای معانی و ترجمه جملات.</li>
            <li>اتصال بی‌نقص حروف در تمامی سیستم‌عامل‌های ویندوز، لینوکس و مک.</li>
            <li>جای‌گذاری فونت درون کارت‌ها برای نمایش یکدست در آنکی‌دروید و آیفون.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 14,
      slug: 'ipa-charis',
      titleEn: '14. IPA Transcriptions & Phonetics (Charis SIL)',
      titleFa: '۱۴. نمادهای فونتیک IPA (فونت Charis SIL)',
      icon: 'type',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 14: IPA Typography (Charis SIL)</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            International Phonetic Alphabet (IPA) transcriptions require specialized glyphs (such as <code>ə</code>, <code>ɪ</code>, <code>ɔː</code>, <code>θ</code>, <code>ð</code>, <code>ˈ</code>, <code>ˌ</code>).
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            We use the linguistic standard <strong>Charis SIL</strong> font across all note types. Charis SIL accurately renders diacritics, pitch marks, and stress indicators without overlapping characters or falling back to broken glyphs.
          </p>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۴: نمادهای فونتیک IPA (فونت Charis SIL)</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            نمادهای الفبای آوانگاری بین‌المللی (IPA) نظیر <code>ə</code>، <code>ɪ</code>، <code>ɔː</code>، <code>θ</code> و علائم استرس نیاز به فونت تخصصی دارند.
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            در تمامی قالب‌های کارت از فونت زبان‌شناسی <strong>Charis SIL</strong> استفاده شده است تا نمادها و علائم تکیه صوتی بدون به‌هم‌ریختگی نمایش یابند.
          </p>
        </div>
      ),
    },
    {
      id: 15,
      slug: 'front-back',
      titleEn: '15. Front & Back Card Layouts & Editing',
      titleFa: '۱۵. طراحی و ویرایش پشت و روی کارت',
      icon: 'layers',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 15: Front & Back Card Layouts</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Every card editor includes a dedicated <strong>Front / Back</strong> toggle toolbar:
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li><strong>Front Side:</strong> Displays the target word, phonetic, audio buttons, context hint, and illustration (or spelling sentence in spelling mode).</li>
            <li><strong>Back Side:</strong> Reveals the Persian meaning, English definition, example sentences, translation, and memory hooks.</li>
            <li>Clicking into any field in the live card allows direct in-place editing with bold, italics, underline, and color highlighting.</li>
          </ul>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۵: طراحی و ویرایش پشت و روی کارت</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            در تمامی محیط‌های ویرایش کارت، دکمه‌های سوئیچ بین <strong>روی کارت (Front)</strong> و <strong>پشت کارت (Back)</strong> تعبیه شده است:
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li><strong>روی کارت:</strong> شامل کلمه اصلی، فونتیک، دکمه‌های تلفظ و جمله راهنما (یا تمرین املایی).</li>
            <li><strong>پشت کارت:</strong> شامل معنی فارسی، تعریف انگلیسی، مثال، ترجمه و کد یادسپاری.</li>
            <li>امکان ویرایش مستقیم روی کارت همراه با ابزارهای قالب‌بندی رنگ، هایلایت و فونت.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 16,
      slug: 'prompts-ai',
      titleEn: '16. Customizing Prompts & AI Models (Ollama & Cloud)',
      titleFa: '۱۶. سفارشی‌سازی پرامپت‌ها و مدل‌های هوش مصنوعی',
      icon: 'sparkles',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 16: AI Prompts & Models</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Navigate to <strong>Settings → AI Default Prompts</strong> to inspect and customize the system prompts used to generate meanings, definitions, and memory aids.
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Any prompt changes made in Settings are immediately utilized by all card creation pathways, ensuring full control over the AI's tone and style.
          </p>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۶: پرامپت‌ها و مدل‌های هوش مصنوعی</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            در بخش <strong>تنظیمات ← پرامپت‌های پیش‌فرض هوش مصنوعی</strong> می‌توانید دستورالعمل‌های تولید معنی، تعریف انگلیسی و کدهای یادسپاری را مطابق میل خود شخصی‌سازی کنید.
          </p>
        </div>
      ),
    },
    {
      id: 17,
      slug: 'offline-mode',
      titleEn: '17. Offline Mode & AI-Free Workflow',
      titleFa: '۱۷. کارکرد کاملاً آفلاین و بدون هوش مصنوعی',
      icon: 'shieldCheck',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 17: 100% Offline & AI-Free</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            If you toggle <strong>AI to OFF</strong> in Settings:
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>The app never attempts to contact Ollama or any cloud provider.</li>
            <li>No network errors or missing model warnings will be displayed.</li>
            <li>Offline Piper TTS continues to provide natural audio.</li>
            <li>Cards are created with whatever fields you provide manually.</li>
          </ul>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۷: کارکرد آفلاین و بدون نیاز به اینترنت</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            با خاموش کردن هوش مصنوعی در تنظیمات:
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>هیچ درخواستی به اینترنت یا سرورهای خارجی ارسال نخواهد شد.</li>
            <li>تلفظ محلی پایپر همچنان با بالاترین کیفیت آفلاین در دسترس است.</li>
            <li>کارت‌ها با اطلاعات دستی وارد شده توسط شما ایجاد و در آنکی ذخیره می‌شوند.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 18,
      slug: 'accent-colors',
      titleEn: '18. Theme Customization & Accent Colors',
      titleFa: '۱۸. سفارشی‌سازی تم و رنگ تأکیدی (Accent Color)',
      icon: 'palette',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 18: UI Theme & Accent Colors</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Personalize the look and feel of the desktop app with the <strong>Accent Color</strong> selector:
          </p>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-blue-600 text-white font-bold">Blue</span>
            <span className="px-2 py-1 bg-emerald-600 text-white font-bold">Green</span>
            <span className="px-2 py-1 bg-purple-600 text-white font-bold">Purple</span>
            <span className="px-2 py-1 bg-amber-600 text-white font-bold">Orange</span>
            <span className="px-2 py-1 bg-pink-600 text-white font-bold">Pink</span>
            <span className="px-2 py-1 bg-rose-600 text-white font-bold">Red</span>
            <span className="px-2 py-1 bg-teal-600 text-white font-bold">Teal</span>
          </div>
          <p className="text-xs text-zinc-500">
            Supports both Anki Light and Anki Dark UI modes with high-contrast inputs and buttons.
          </p>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۸: سفارشی‌سازی تم و رنگ تأکیدی</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            امکان انتخاب رنگ تأکیدی (مشابه ChatGPT) از بین ۷ پالت جذاب: آبی، سبز، بنفش، نارنجی، صورتی، قرمز و آبی دریایی در بخش تنظیمات تعبیه شده است.
          </p>
        </div>
      ),
    },
    {
      id: 19,
      slug: 'deck-management',
      titleEn: '19. Deck Selection, Moving Cards & Tag Management',
      titleFa: '۱۹. انتخاب دسته‌بندی، انتقال کارت‌ها و مدیریت تگ‌ها',
      icon: 'folderOpen',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 19: Deck Movement & Tag Management</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Card editors include a <strong>Deck selector</strong> next to Note Type. When editing an existing card, changing the deck executes AnkiConnect's <code>changeDeck</code> API, instantly moving all cards for that note to the new deck without creating duplicates.
          </p>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۱۹: انتخاب دسته و انتقال کارت‌ها</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            در بالای ویرایشگر کارت منوی انتخاب دسته قرار دارد. هنگام ویرایش کارت موجود، تغییر دسته بلافاصله دستور <code>changeDeck</code> آنکی را اجرا کرده و کارت را بدون ایجاد نسخه تکراری جابجا می‌کند.
          </p>
        </div>
      ),
    },
    {
      id: 20,
      slug: 'backups',
      titleEn: '20. Data Safety, Backups & Anki Media Directory',
      titleFa: '۲۰. امنیت داده‌ها، پشتیبان‌گیری و دایرکتوری رسانه',
      icon: 'shieldCheck',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 20: Data Safety & Backups</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            All cards and audio files are pushed into your local Anki database. Anki automatically generates local backups in your user profile:
          </p>
          <pre className="p-2.5 bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto rounded-none">
{`Linux:   ~/.local/share/Anki2/<User>/backups/
Windows: %APPDATA%\\Anki2\\<User>\\backups\\
macOS:   ~/Library/Application Support/Anki2/<User>/backups/`}
          </pre>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۲۰: امنیت داده‌ها و پشتیبان‌گیری</h2>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            تمام داده‌ها مستقیماً در پایگاه‌داده محلی آنکی شما ذخیره شده و تحت حفاظت بک‌آپ‌های خودکار آنکی قرار دارند.
          </p>
        </div>
      ),
    },
    {
      id: 21,
      slug: 'shortcuts',
      titleEn: '21. Keyboard Shortcuts & Productivity Tips',
      titleFa: '۲۱. کلیدهای میانبر و نکات افزایش بهره‌وری',
      icon: 'keyboard',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 21: Keyboard Shortcuts</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 border">Ctrl + Enter</kbd> : Quick Save / Generate
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 border">Ctrl + B</kbd> : Bold Highlight
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 border">Ctrl + I</kbd> : Italicize
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 border">Esc</kbd> : Close Modals / Search
            </div>
          </div>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۲۱: کلیدهای میانبر و نکات بهره‌وری</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 border" dir="ltr">Ctrl + Enter</kbd> : ذخیره سریع / تولید
            </div>
            <div className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 border" dir="ltr">Ctrl + B</kbd> : ضخیم‌سازی متن (Bold)
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 22,
      slug: 'troubleshooting',
      titleEn: '22. Troubleshooting & Common Issues (AnkiConnect, TTS, CORS)',
      titleFa: '۲۲. رفع اشکال و خطاهای رایج (آنکی‌کانکت، تلفظ، CORS)',
      icon: 'alertTriangle',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 22: Troubleshooting Guide</h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
              <strong>Issue: "Cannot reach AnkiConnect"</strong>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">Ensure Anki is open and running in the background. Check that code <code>2055492159</code> is installed in Anki add-ons.</p>
            </div>
            <div className="p-3 border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
              <strong>Issue: "No audio generated"</strong>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">Verify at least one audio variant (Br, Am) is toggled on in the card editor's Audio bar.</p>
            </div>
          </div>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۲۲: راهنمای رفع اشکال و خطاهای رایج</h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
              <strong>خطا: «عدم اتصال به AnkiConnect»</strong>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">مطمئن شوید نرم‌افزار آنکی در حال اجرا است و کد افزونه آنکی‌کانکت نصب شده است.</p>
            </div>
            <div className="p-3 border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
              <strong>خطا: «عدم تولید تلفظ صوتی»</strong>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">بررسی کنید حداقل یکی از گزینه‌های تلفظ صوتی (Br یا Am) در نوار بالای ادیتور روشن باشد.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 23,
      slug: 'faq',
      titleEn: '23. Frequently Asked Questions (FAQ)',
      titleFa: '۲۳. پرسش‌های متداول (FAQ)',
      icon: 'helpCircle',
      contentEn: (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chapter 23: Frequently Asked Questions</h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>Q: Can I review my cards on Android or iPhone?</strong>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">Yes! Synchronize your desktop Anki to AnkiWeb. All audio files, fonts, and card designs will sync and display seamlessly on AnkiDroid and AnkiMobile.</p>
            </div>
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>Q: How do I change the default Anki deck?</strong>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">In Settings → General, select your preferred default deck from the dropdown menu.</p>
            </div>
          </div>
        </div>
      ),
      contentFa: (
        <div className="space-y-4 text-right" dir="rtl">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">فصل ۲۳: پرسش‌های متداول (FAQ)</h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>سؤال: آیا کارت‌ها در گوشی موبایل (اندروید و آیفون) کار می‌کنند؟</strong>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">بله! پس از همگام‌سازی آنکی با AnkiWeb، تمام صداها و ظاهر کارت‌ها بدون هیچ مشکلی در AnkiDroid و AnkiMobile قابل استفاده خواهند بود.</p>
            </div>
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <strong>سؤال: چگونه دسته پیش‌فرض کارت‌ها را تغییر دهم؟</strong>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">در بخش تنظیمات ← عمومی، دسته پیش‌فرض مورد نظر خود را انتخاب نمایید.</p>
            </div>
          </div>
        </div>
      ),
    },
  ], []);

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase().trim();
    return chapters.filter(
      (c) =>
        c.titleEn.toLowerCase().includes(q) ||
        c.titleFa.toLowerCase().includes(q)
    );
  }, [chapters, searchQuery]);

  const currentChapter = chapters.find((c) => c.id === activeChapterId) || chapters[0];

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden flex flex-col ${
      isDark ? 'bg-[#18181B] text-zinc-100' : 'bg-white text-zinc-900'
    }`}>
      {/* Top Header */}
      <header className="h-14 shrink-0 px-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 select-none">
        {/* Left: Outward Back Button to Settings */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-none border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Return to Settings (Preserves all state)"
          >
            <CornerUpLeft className="w-4 h-4 text-blue-500" />
            <span>{isFa ? 'بازگشت به تنظیمات' : 'Back to Settings'}</span>
          </button>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-xs uppercase tracking-wider hidden sm:inline">
              {isFa ? 'راهنما و آموزش جامع' : 'Help & Tutorial'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-semibold">
              v1.1.8
            </span>
          </div>
        </div>

        {/* Right: Search & Language Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative w-36 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isFa ? 'جستجو در فصول...' : 'Search chapters...'}
              className="w-full pl-8 pr-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-none focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center border border-zinc-300 dark:border-zinc-700 rounded-none overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                lang === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('fa')}
              className={`px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                lang === 'fa'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              فارسی
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar: Table of Contents */}
        <aside className="w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 overflow-y-auto p-3 space-y-1 select-none">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-2 py-1">
            {isFa ? 'فهرست فصول (۲۳ فصل)' : 'Table of Contents (23 Chapters)'}
          </div>
          {filteredChapters.map((ch) => {
            const isActive = ch.id === activeChapterId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChapterId(ch.id)}
                className={`w-full text-left px-2.5 py-2 text-xs rounded-none transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="truncate">{isFa ? ch.titleFa : ch.titleEn}</span>
                <span className="text-[10px] opacity-60 shrink-0 font-mono">#{ch.id}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-4xl mx-auto">
          {isFa ? currentChapter.contentFa : currentChapter.contentEn}

          {/* Chapter Bottom Navigation */}
          <div className="mt-12 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 text-xs">
            <button
              type="button"
              disabled={currentChapter.id <= 1}
              onClick={() => setActiveChapterId((id) => Math.max(1, id - 1))}
              className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-none disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{isFa ? 'فصل قبلی' : 'Previous Chapter'}</span>
            </button>
            <span className="font-mono text-zinc-500">
              {currentChapter.id} / {chapters.length}
            </span>
            <button
              type="button"
              disabled={currentChapter.id >= chapters.length}
              onClick={() => setActiveChapterId((id) => Math.min(chapters.length, id + 1))}
              className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-none disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 cursor-pointer"
            >
              <span>{isFa ? 'فصل بعدی' : 'Next Chapter'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
