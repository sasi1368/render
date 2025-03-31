const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// فعال کردن CORS
app.use(cors());

// تبدیل درخواست‌های JSON به داده‌های قابل خواندن
app.use(express.json());

// اتصال به MongoDB Atlas
mongoose.connect('mongodb+srv://render_user:68lxbBn5C1ZukD2K@cluster0.fwjxsrd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// مدل MongoDB
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

// ثبت کد در دیتابیس
app.post('/register-code', async (req, res) => {
    try {
        const { code, name, lastName, phone } = req.body;
        const userAgent = req.headers['user-agent'];
        const ip = req.ip;
        const mac = '';

        let deviceType = /mobile/i.test(userAgent) ? 'Mobile' : /tablet/i.test(userAgent) ? 'Tablet' : 'Desktop';

        const newCode = new Code({ code, name, lastName, phone, ip, mac, userAgent, deviceType });
        await newCode.save();
        res.status(200).json({ message: 'کد با موفقیت ثبت شد' });
    } catch (err) {
        console.error('خطا در ثبت کد:', err);
        res.status(500).json({ message: 'خطا در ثبت کد' });
    }
});

// دریافت لیست کدها
app.get('/codes', async (req, res) => {
    try {
        const codes = await Code.find({});
        res.status(200).json({ codes });
    } catch (err) {
        console.error('خطا در دریافت کدها:', err);
        res.status(500).json({ message: 'خطا در دریافت کدها' });
    }
});

// دریافت شانس کاربر
app.post('/get-user-chance', async (req, res) => {
    const { code } = req.body;
    try {
        const userCode = await Code.findOne({ code });
        if (userCode) {
            const chance = Math.random() * 100;
            res.status(200).json({ chance });
        } else {
            res.status(404).json({ message: 'کد پیدا نشد' });
        }
    } catch (err) {
        console.error('خطا در دریافت شانس کاربر:', err);
        res.status(500).json({ message: 'خطا در دریافت شانس کاربر' });
    }
});

// تابع تولید و ذخیره فایل اکسل
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

        // بررسی اینکه فایل اکسل باز نباشد
        try {
            XLSX.writeFile(wb, filePath);
            console.log('✅ Excel file has been updated successfully!');
        } catch (error) {
            if (error.code === 'EBUSY' || error.message.includes('EBUSY')) {
                console.log('❌ Close Excel for update');
            } else {
                throw error;
            }
        }

    } catch (err) {
        console.error('خطا در استخراج کدها یا ذخیره فایل اکسل:', err);
    }
};

// بروزرسانی فایل اکسل هر ۱۰ ثانیه
setInterval(generateExcelFile, 10000);

// دانلود فایل اکسل
app.get('/download-excel', (req, res) => {
    const filePath = path.join(__dirname, 'codes.xlsx');
    res.download(filePath, 'codes.xlsx', (err) => {
        if (err) {
            console.error('خطا در ارسال فایل:', err);
        }
    });
});

// سرو کردن فایل‌های استاتیک (مانند index.html)
app.use(express.static(path.join(__dirname, 'public')));

// راه‌اندازی سرور
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}...`);
    generateExcelFile();
});
