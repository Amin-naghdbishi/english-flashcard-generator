<div align="center">

# 🗂️ Flashcard Generator

### ساخت خودکار فلش‌کارت‌های حرفه‌ای Anki برای یادگیری زبان انگلیسی

تولید خودکار معنی، IPA، مثال، ترجمه، Memory Hook، تلفظ و تصویر
با پشتیبانی از **Ollama، Piper TTS و AnkiConnect**

<br>

<img src="Screenshot.png" alt="Flashcard Generator Light Mode" width="850">

<br><br>

<img src="Screenshot-dark.png" alt="Flashcard Generator Dark Mode" width="850">

</div>

---

## ✨ قابلیت‌ها

* 🧠 تولید اطلاعات لغت با AI
* 🤖 پشتیبانی از **Ollama** برای استفاده کاملاً آفلاین
* ☁️ پشتیبانی از Gemini و سرویس‌های OpenAI-Compatible
* 🔊 تولید تلفظ با **Piper TTS**
* 🇺🇸 تلفظ آمریکایی و 🇬🇧 بریتانیایی
* 📝 ساخت کارت‌های معمولی و Spelling
* 🖼️ جستجوی خودکار تصویر برای کلمات مناسب
* 📚 اتصال مستقیم به Anki با AnkiConnect
* 📦 پردازش تعداد زیادی لغت به صورت Batch
* 🌙 تم‌های مختلف برای کارت‌های Anki
* 🌐 رابط فارسی و انگلیسی

---

# 🚀 نصب و اجرا

دو روش برای اجرای برنامه وجود دارد:

1. **نسخه آماده AppImage در Linux**
2. **اجرای پروژه با Node.js در Windows و Linux**

---

# 🪟 نصب در Windows

## 1. نصب Node.js

ابتدا Node.js را از سایت رسمی دانلود و نصب کنید:

https://nodejs.org/en/download/

نسخه **LTS** را انتخاب کنید. صفحه رسمی Node.js در حال حاضر نسخه LTS را جداگانه مشخص می‌کند.

بعد از نصب، PowerShell یا Command Prompt را باز کنید و بررسی کنید:

```powershell
node --version
npm --version
```

اگر شماره نسخه نمایش داده شد، Node.js با موفقیت نصب شده است.

---

## 2. دریافت پروژه

مخزن پروژه:

https://github.com/Amin-naghdbishi/english-flashcard-generator

با Git:

```powershell
git clone https://github.com/Amin-naghdbishi/english-flashcard-generator.git
cd english-flashcard-generator
```

اگر Git ندارید، می‌توانید از صفحه GitHub گزینه:

**Code → Download ZIP**

را انتخاب کنید و فایل را Extract کنید.

---

## 3. نصب وابستگی‌ها

داخل پوشه پروژه اجرا کنید:

```powershell
npm install
```

این دستور تمام کتابخانه‌های مورد نیاز پروژه را نصب می‌کند.

---

## 4. اجرای برنامه

برای اجرای نسخه توسعه:

```powershell
npm run dev
```

یا اگر پروژه برای اجرای نسخه ساخته‌شده تنظیم شده است:

```powershell
npm run build
npm start
```

بعد از اجرا، آدرس نمایش داده‌شده در ترمینال را در مرورگر باز کنید.

معمولاً:

```text
http://localhost:3000
```

---

# 🐧 نصب در Linux

## روش سریع: AppImage

اگر فقط می‌خواهید از برنامه استفاده کنید و قصد توسعه ندارید، AppImage ساده‌ترین روش است.

از صفحه Releases آخرین نسخه را دریافت کنید:

https://github.com/Amin-naghdbishi/english-flashcard-generator/releases

بعد:

```bash
chmod +x Flashcard-Generator-*.AppImage
```

و اجرا کنید:

```bash
./Flashcard-Generator-*.AppImage
```

AppImage به Node.js پروژه نیاز ندارد.

> برای استفاده از قابلیت‌های آفلاین همچنان باید Ollama و Piper را جداگانه نصب کنید.

---

# 🐧 اجرای پروژه با Node.js در Linux

اگر می‌خواهید سورس پروژه را اجرا یا ویرایش کنید، ابتدا Node.js را نصب کنید.

سایت رسمی:

https://nodejs.org/en/download/

سپس:

```bash
git clone https://github.com/Amin-naghdbishi/english-flashcard-generator.git
cd english-flashcard-generator
npm install
npm run dev
```

برای اجرای نسخه نهایی:

```bash
npm run build
npm start
```

---

# 📴 حالت کاملاً آفلاین

برای استفاده بدون سرویس‌های ابری، دو برنامه لازم دارید:

* **Ollama** → تولید اطلاعات متنی لغات
* **Piper TTS** → تولید تلفظ صوتی

همچنین برای ذخیره کارت‌ها:

* **Anki + AnkiConnect**

ساختار کلی:

```text
                  Flashcard Generator
                                      │
              ┌──────────┴──────────┐
              │                                               │
           Ollama                                     Piper
          AI آفلاین                                TTS آفلاین
              │                                               │
              └──────────┬──────────┘
                                       │
                           AnkiConnect
                                       │
                                    Anki
```

---

# 🤖 نصب Ollama

## Linux

مستندات رسمی:

https://docs.ollama.com/linux

نصب:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

سپس بررسی کنید:

```bash
ollama --version
```

اگر سرویس به صورت خودکار اجرا نشد:

```bash
ollama serve
```

---

## دانلود مدل پیشنهادی

مدل پیشنهادی این پروژه:

```bash
ollama pull gemma3:4b
```

بررسی مدل‌های نصب‌شده:

```bash
ollama list
```

باید چیزی شبیه این ببینید:

```text
gemma3:4b
```

در Flashcard Generator نیز:

```text
Settings
→ AI Provider
→ Ollama
→ Model: gemma3:4b
```

سپس اتصال را آزمایش کنید.

---

# 🔊 نصب Piper TTS

Piper یک موتور تبدیل متن به گفتار محلی است و می‌تواند به صورت HTTP server روی پورت `5000` اجرا شود.

این بخش برای حالت آفلاین **اختیاری اما پیشنهادی** است.

## 1. ساخت محیط Python

Linux:

```bash
python3 -m venv ~/piper-env
source ~/piper-env/bin/activate
```

سپس:

```bash
pip install --upgrade pip
pip install "piper-tts[http]"
```

---

# 🎙️ دانلود صداهای Piper

این پروژه از دو صدای باکیفیت استفاده می‌کند:

### 🇺🇸 American English

`en_US-lessac-high`

### 🇬🇧 British English

`en_GB-cori-high`

هر دو Voice در مجموعه رسمی Piper Voices روی Hugging Face موجود هستند. Lessac با کیفیت `high` برای انگلیسی آمریکایی و Cori با کیفیت `high` برای انگلیسی بریتانیایی ارائه شده‌اند.

## دانلود مدل‌ها

ابتدا پوشه صداها را بسازید:

```bash
mkdir -p ~/piper-voices
cd ~/piper-voices
```

### 🇺🇸 Lessac

```bash
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx

wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/high/en_US-lessac-high.onnx.json
```

### 🇬🇧 Cori

```bash
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/cori/high/en_GB-cori-high.onnx

wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/cori/high/en_GB-cori-high.onnx.json
```

بررسی:

```bash
ls -lh ~/piper-voices
```

باید چهار فایل داشته باشید:

```text
en_US-lessac-high.onnx
en_US-lessac-high.onnx.json

en_GB-cori-high.onnx
en_GB-cori-high.onnx.json
```

---

# 🌐 اجرای Piper به صورت Server

برای اجرای Piper:

```bash
source ~/piper-env/bin/activate
```

سپس:

```bash
python3 -m piper.http_server \
  --model ~/piper-voices/en_US-lessac-high.onnx \
  --data-dir ~/piper-voices \
  --port 5000
```

سرور باید روی این آدرس اجرا شود:

```text
http://127.0.0.1:5000
```

تست:

```bash
curl http://127.0.0.1:5000/voices
```

Piper API رسمی نیز `/voices` را برای مشاهده Voiceهای موجود و `/synthesize` را برای تولید WAV ارائه می‌کند.

---

# ⚙️ اجرای Piper به صورت سرویس systemd

اگر نمی‌خواهید هر بار Piper را دستی اجرا کنید، می‌توانید آن را به سرویس دائمی Linux تبدیل کنید.

فایل سرویس را بسازید:

```bash
sudo nano /etc/systemd/system/piper.service
```

این محتوا را قرار دهید:

```ini
[Unit]
Description=Piper TTS Server
After=network.target

[Service]
Type=simple
User=%i
ExecStart=%h/piper-env/bin/python -m piper.http_server --model %h/piper-voices/en_US-lessac-high.onnx --data-dir %h/piper-voices --port 5000
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
```

> اگر این روش با نسخه systemd شما مناسب نبود، می‌توانید `User=%i` را حذف کرده و نام کاربری خودتان را مستقیماً قرار دهید.

سپس:

```bash
systemctl --user daemon-reload
systemctl --user enable --now piper.service
```

وضعیت:

```bash
systemctl --user status piper.service
```

مشاهده لاگ:

```bash
journalctl --user -u piper.service -f
```

تست:

```bash
curl http://127.0.0.1:5000/voices
```

اگر JSON دریافت کردید، Piper فعال است.

---

# 🇺🇸🇬🇧 استفاده همزمان از American و British

برای اینکه برنامه بتواند هر دو صدا را استفاده کند، هر دو Voice را در:

```text
~/piper-voices/
```

قرار دهید.

در تنظیمات Flashcard Generator:

```text
TTS Engine: Piper
Server: http://127.0.0.1:5000

American Voice:
en_US-lessac-high

British Voice:
en_GB-cori-high
```

برای سرعت آهسته‌تر نیز برنامه می‌تواند از `length_scale` بالاتر استفاده کند؛ مقدار پیش‌فرض Piper برابر `1` است.

---

# 🃏 نصب Anki

Anki را از سایت رسمی دریافت کنید:

https://apps.ankiweb.net/

Anki را نصب و اجرا کنید.

---

# 🔌 نصب AnkiConnect

Flashcard Generator برای ارسال مستقیم کارت‌ها به Anki به **AnkiConnect** نیاز دارد.

در Anki:

```text
Tools
→ Add-ons
→ Get Add-ons
```

کد زیر را وارد کنید:

```text
2055492159
```

پس از نصب، **Anki را کاملاً ببندید و دوباره اجرا کنید.**

AnkiConnect یک افزونه برای ارائه API به برنامه‌های دیگر است؛ مخزن قدیمی GitHub آن در سال 2025 آرشیو شده و پروژه به SourceHut منتقل شده است.

---

# 🧪 آزمایش AnkiConnect

وقتی Anki باز است، در Linux می‌توانید اجرا کنید:

```bash
curl -s http://127.0.0.1:8765 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"version","version":6}'
```

اگر همه‌چیز درست باشد، نتیجه‌ای مشابه زیر دریافت می‌کنید:

```json
{"result":6,"error":null}
```

اگر چنین پاسخی دریافت کردید، اتصال آماده است.

---

# ⚙️ تنظیم Flashcard Generator

پس از نصب سرویس‌ها، برنامه را اجرا کنید.

در Settings:

## AI

برای حالت آفلاین:

```text
Provider: Ollama
URL: http://127.0.0.1:11434
Model: gemma3:4b
```

## TTS

```text
Engine: Piper
URL: http://127.0.0.1:5000

American:
en_US-lessac-high

British:
en_GB-cori-high
```

## Anki

```text
URL: http://127.0.0.1:8765
```

---

# 📝 ساخت اولین کارت

به بخش:

```text
Create Card
```

بروید.

مثلاً بنویسید:

```text
readability
```

سپس:

```text
Generate Flashcard
```

برنامه اطلاعات کارت را تولید کرده و آن را مستقیماً در Anki قرار می‌دهد.

نمونه اطلاعات تولیدشده:

```text
Word:
readability

Phonetic:
/ˌriːdəˈbɪləti/

Meaning:
خوانایی، سهولت خوانده شدن

Example:
The readability of this book is excellent.

Memory Hook:
read + ability
```

---

# 📦 ساخت چند کارت به صورت همزمان

برای تعداد زیادی لغت می‌توانید از Batch Processing استفاده کنید.

نمونه:

```text
Word=abandon
Deck=English::Vocabulary
--
Word=hesitate
Deck=English::Vocabulary
--
Word=readability
Deck=English::Vocabulary
```

برنامه هر بلوک را به یک کارت جداگانه تبدیل می‌کند.

---

# 🛠️ عیب‌یابی سریع

## برنامه اجرا نمی‌شود

بررسی Node.js:

```bash
node --version
npm --version
```

سپس:

```bash
npm install
npm run dev
```

---

## Ollama کار نمی‌کند

بررسی:

```bash
ollama list
```

یا:

```bash
curl http://127.0.0.1:11434
```

اگر Ollama اجرا نیست:

```bash
ollama serve
```

---

## Piper کار نمی‌کند

بررسی:

```bash
curl http://127.0.0.1:5000/voices
```

اگر پاسخی دریافت نشد:

```bash
systemctl --user status piper.service
```

و لاگ:

```bash
journalctl --user -u piper.service -f
```

---

## AnkiConnect کار نمی‌کند

اول مطمئن شوید Anki باز است.

سپس:

```bash
curl -s http://127.0.0.1:8765 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"version","version":6}'
```

اگر `result: 6` دریافت نشد، AnkiConnect را بررسی و Anki را Restart کنید.

---

# 🔐 حالت‌های استفاده

### ☁️ آنلاین

```text
Flashcard Generator
        ↓
Google Gemini / Custom AI
        ↓
Piper یا Online TTS
        ↓
Anki
```

### 📴 کاملاً آفلاین

```text
Flashcard Generator
        ↓
Ollama
        ↓
Piper TTS
        ↓
AnkiConnect
        ↓
Anki
```

در حالت دوم، تولید متن و صوت روی کامپیوتر خودتان انجام می‌شود و برای این بخش‌ها نیازی به API ابری ندارید.

---

# 📚 لینک‌های مهم

* **Project:** https://github.com/Amin-naghdbishi/english-flashcard-generator
* **Releases:** https://github.com/Amin-naghdbishi/english-flashcard-generator/releases
* **Node.js:** https://nodejs.org/en/download/
* **Ollama:** https://ollama.com/
* **Ollama Linux Documentation:** https://docs.ollama.com/linux
* **Piper Voices:** https://huggingface.co/rhasspy/piper-voices
* **Anki:** https://apps.ankiweb.net/
* **AnkiConnect:** https://github.com/FooSoft/anki-connect

---

<div align="center">

### ❤️ ساخته شده برای ساده‌تر کردن یادگیری زبان با Anki

اگر مشکلی پیدا کردید، در بخش Issues پروژه گزارش دهید.

</div>
