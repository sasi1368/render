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

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://render_user:cuNKUrBxUR6ZIgzL@cluster0.fwjxsrd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

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

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/get/, async (msg) => {
    const chatId = msg.chat.id;
    const filePath = await generateExcelFile();
    if (filePath) {
        await sendFileToTelegram(filePath, chatId);
        bot.sendMessage(chatId, '✅ Excel file has been sent to you!');
    } else {
        bot.sendMessage(chatId, '❌ Error generating Excel file.');
    }
});

setInterval(() => {
    generateExcelFile();
}, 10000);

console.log("✅ Excel file updated and running in the background.");

// مسیر برای روت اصلی
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // مسیر فایل HTML شما
});

app.get('/download-excel', (req, res) => {
    const filePath = path.join(__dirname, 'codes.xlsx');
    res.download(filePath, 'codes.xlsx', (err) => {
        if (err) {
            console.error('❌ Error sending file:', err);
        }
    });
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}...`);
});
