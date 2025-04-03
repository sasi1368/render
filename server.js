const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = "8093647306:AAHy1DmFOuSFMfTILffaFKGdFJRgg1nnQ1U";
const TELEGRAM_CHAT_ID = "7345437737";

// فعال کردن CORS
app.use(cors());
app.use(express.json());

// برای دسترسی به فایل‌های استاتیک مانند index.html
app.use(express.static(path.join(__dirname, 'public')));

// اتصال به MongoDB
mongoose.connect('mongodb+srv://render_user:cuNKUrBxUR6ZIgzL@cluster0.fwjxsrd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// مدل داده‌ها
const codeSchema = new mongoose.Schema({
    code: String,
    name: String,
    lastName: String,
    phone: String,
    ip: String,
    mac: String,
    userAgent: String,
    deviceType: String,
    timestamp: { type: Date, default: Date.now }
});

const Code = mongoose.model('Code', codeSchema);

// تولید فایل اکسل
const generateExcelFile = async () => {
    try {
        const codes = await Code.find({});
        const data = codes.map((code) => ({
            'کد': code.code,
            'نام': code.name,
            'نام خانوادگی': code.lastName,
            'شماره تلفن': code.phone,
            'آی‌پی': code.ip,
            'مک آدرس': code.mac,
            'یوزر ایجنت': code.userAgent,
            'نوع دستگاه': code.deviceType,
            'زمان ثبت': code.timestamp
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'کدها');

        const filePath = path.join(__dirname, 'codes.xlsx');
        XLSX.writeFile(wb, filePath);

        return filePath;
    } catch (err) {
        console.error('❌ Error generating Excel file:', err);
        return null;
    }
};

// ارسال فایل به تلگرام
const sendFileToTelegram = async (filePath, chatId) => {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("document", fs.createReadStream(filePath));

        await axios.post(url, formData, {
            headers: formData.getHeaders(),
        });
    } catch (error) {
        console.error("❌ Error sending Excel file to Telegram:", error);
    }
};

// راه‌اندازی بات تلگرام
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// تنظیم Webhook
const url = 'https://render-yqu3.onrender.com/telegram-webhook'; // URL وب‌هوک خود را وارد کنید
bot.setWebHook(url);

// پردازش درخواست‌های وب‌هوک
app.post('/telegram-webhook', async (req, res) => {
    const message = req.body;

    // چاپ داده‌های دریافتی برای بررسی مشکل
    console.log("Received message:", message);

    // بررسی اینکه پیام و chatId موجود است
    if (message && message.message && message.message.chat && message.message.chat.id) {
        const chatId = message.message.chat.id;

        // پردازش دستور خاص
        if (message.message.text === '/get') {
            // به‌روزرسانی فایل اکسل
            const filePath = await generateExcelFile();
            if (filePath) {
                // ارسال فایل به تلگرام
                await sendFileToTelegram(filePath, chatId);
                bot.sendMessage(chatId, '✅ فایل اکسل به‌روز شده و ارسال شد!');
            } else {
                bot.sendMessage(chatId, '❌ خطا در تولید فایل اکسل.');
            }
        }
    } else {
        console.log('❌ Error: Missing chat.id in the message');
    }

    res.send('ok');
});

// راه‌اندازی سرور
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}...`);
});
