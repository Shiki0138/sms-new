const express = require('express');
const router = express.Router();
const { Customer, Appointment, Sale } = require('../models');
const { authMiddleware } = require('../middleware/auth-new');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const puppeteer = require('puppeteer');
const moment = require('moment');
const path = require('path');
const fs = require('fs').promises;
const { Op } = require('sequelize');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Export customers to CSV
router.get('/customers/csv', async (req, res) => {
  try {
    const customers = await Customer.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    const filename = `customers_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filepath = path.join(__dirname, '../../temp', filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'lastName', title: '姓' },
        { id: 'firstName', title: '名' },
        { id: 'lastNameKana', title: '姓（カナ）' },
        { id: 'firstNameKana', title: '名（カナ）' },
        { id: 'email', title: 'メールアドレス' },
        { id: 'phoneNumber', title: '電話番号' },
        { id: 'birthDate', title: '生年月日' },
        { id: 'gender', title: '性別' },
        { id: 'postalCode', title: '郵便番号' },
        { id: 'prefecture', title: '都道府県' },
        { id: 'city', title: '市区町村' },
        { id: 'address', title: '住所' },
        { id: 'visitCount', title: '来店回数' },
        { id: 'totalSales', title: '累計売上' },
        { id: 'createdAt', title: '登録日' }
      ]
    });

    const records = customers.map(customer => ({
      ...customer.toJSON(),
      gender: customer.gender === 'male' ? '男性' : customer.gender === 'female' ? '女性' : 'その他',
      createdAt: moment(customer.createdAt).format('YYYY-MM-DD')
    }));

    await csvWriter.writeRecords(records);
    
    res.download(filepath, filename, async (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up temp file
      await fs.unlink(filepath).catch(() => {});
    });
  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({ message: 'Failed to export customers' });
  }
});

// Export sales to CSV
router.get('/sales/csv', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { userId: req.user.id };

    if (startDate && endDate) {
      where.saleDate = {
        [Op.between]: [moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate()]
      };
    }

    const sales = await Sale.findAll({
      where,
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['firstName', 'lastName']
      }],
      order: [['saleDate', 'DESC']]
    });

    const filename = `sales_${moment().format('YYYYMMDD_HHmmss')}.csv`;
    const filepath = path.join(__dirname, '../../temp', filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'saleDate', title: '売上日' },
        { id: 'customerName', title: '顧客名' },
        { id: 'services', title: 'サービス' },
        { id: 'subtotal', title: '小計' },
        { id: 'taxAmount', title: '税額' },
        { id: 'discountAmount', title: '割引' },
        { id: 'totalAmount', title: '合計' },
        { id: 'paymentMethod', title: '支払方法' },
        { id: 'paymentStatus', title: '支払状況' }
      ]
    });

    const records = sales.map(sale => ({
      saleDate: moment(sale.saleDate).format('YYYY-MM-DD'),
      customerName: sale.customer ? `${sale.customer.lastName} ${sale.customer.firstName}` : '顧客なし',
      services: sale.items.map(item => item.name).join(', '),
      subtotal: sale.subtotal,
      taxAmount: sale.taxAmount,
      discountAmount: sale.discountAmount,
      totalAmount: sale.totalAmount,
      paymentMethod: {
        cash: '現金',
        credit_card: 'クレジットカード',
        debit_card: 'デビットカード',
        electronic_money: '電子マネー',
        bank_transfer: '銀行振込',
        other: 'その他'
      }[sale.paymentMethod],
      paymentStatus: {
        paid: '支払済',
        pending: '未払い',
        partial: '一部支払',
        refunded: '返金済'
      }[sale.paymentStatus]
    }));

    await csvWriter.writeRecords(records);
    
    res.download(filepath, filename, async (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      await fs.unlink(filepath).catch(() => {});
    });
  } catch (error) {
    console.error('Export sales error:', error);
    res.status(500).json({ message: 'Failed to export sales' });
  }
});

// Generate sales report PDF
router.post('/sales/pdf', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const where = { userId: req.user.id };

    if (startDate && endDate) {
      where.saleDate = {
        [Op.between]: [moment(startDate).startOf('day').toDate(), moment(endDate).endOf('day').toDate()]
      };
    }

    const sales = await Sale.findAll({
      where,
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['firstName', 'lastName']
      }],
      order: [['saleDate', 'DESC']]
    });

    const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);

    // Generate HTML content
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>売上レポート - ${req.user.salonName}</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .summary { margin: 20px 0; padding: 15px; background-color: #f9f9f9; }
    .total { font-size: 1.2em; font-weight: bold; }
  </style>
</head>
<body>
  <h1>売上レポート</h1>
  <p>サロン名: ${req.user.salonName}</p>
  <p>期間: ${moment(startDate).format('YYYY年MM月DD日')} ～ ${moment(endDate).format('YYYY年MM月DD日')}</p>
  
  <div class="summary">
    <p>売上件数: ${sales.length}件</p>
    <p class="total">売上合計: ¥${totalAmount.toLocaleString()}</p>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>売上日</th>
        <th>顧客名</th>
        <th>サービス</th>
        <th>金額</th>
        <th>支払方法</th>
      </tr>
    </thead>
    <tbody>
      ${sales.map(sale => `
        <tr>
          <td>${moment(sale.saleDate).format('YYYY/MM/DD')}</td>
          <td>${sale.customer ? `${sale.customer.lastName} ${sale.customer.firstName}` : '-'}</td>
          <td>${sale.items.map(item => item.name).join(', ')}</td>
          <td>¥${parseFloat(sale.totalAmount).toLocaleString()}</td>
          <td>${sale.paymentMethod}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
    `;

    // Generate PDF
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html);
    
    const filename = `sales_report_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
    const filepath = path.join(__dirname, '../../temp', filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    await page.pdf({
      path: filepath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
    });
    
    await browser.close();

    res.download(filepath, filename, async (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      await fs.unlink(filepath).catch(() => {});
    });
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ message: 'Failed to generate PDF report' });
  }
});

module.exports = router;