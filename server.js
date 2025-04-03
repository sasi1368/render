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

// اطلاعات بات تلگرام
const TELEGRAM_BOT_TOKEN = "8093647306:AAHy1DmFOuSFMfTILffaFKGdFJRgg1nnQ1U";
const TELEGRAM_CHAT_ID = "7345437737";  // یا به صورت داینامیک از chat_id کاربران استفاده کنید.

app.use(cors());
app.use(express.json());

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

// ذخیره و ارسال فایل اکسل
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
        console.log('✅ Excel file generated successfully!');

        return filePath;
    } catch (err) {
        console.error('❌ Error generating Excel file:', err);
        return null;
    }
};

// ارسال فایل اکسل به تلگرام
const sendFileToTelegram = async (filePath, chatId) => {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("document", fs.createReadStream(filePath));

        await axios.post(url, formData, {
            headers: formData.getHeaders(),
        });

        console.log("✅ Excel file sent to Telegram successfully!");
    } catch (error) {
        console.error("❌ Error sending Excel file to Telegram:", error);
    }
};

// راه‌اندازی بات تلگرام
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// پردازش دستور /get
bot.onText(/\/get/, async (msg) => {
    const chatId = msg.chat.id;
    
    // تولید فایل اکسل
    const filePath = await generateExcelFile();
    
    if (filePath) {
        // ارسال فایل به تلگرام
        await sendFileToTelegram(filePath, chatId);
        bot.sendMessage(chatId, '✅ Excel file has been sent to you!');
    } else {
        bot.sendMessage(chatId, '❌ Error generating Excel file.');
    }
});

// ارسال فایل اکسل به تلگرام هر ۱۰ ثانیه، ولی تنها پس از دریافت دستور /get
let filePathToSend = null;

// بروزرسانی فایل اکسل هر ۱۰ ثانیه
setInterval(async () => {
    filePathToSend = await generateExcelFile();
    console.log("✅ Excel file generated automatically.");
}, 10000);  // هر ۱۰ ثانیه یکبار فایل اکسل تولید می‌شود

// دانلود فایل اکسل (اختیاری)
app.get('/download-excel', (req, res) => {
    const filePath = path.join(__dirname, 'codes.xlsx');
    res.download(filePath, 'codes.xlsx', (err) => {
        if (err) {
            console.error('❌ Error sending file:', err);
        }
    });
});

// راه‌اندازی سرور
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}...`);
});
