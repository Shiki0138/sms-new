const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkFeatureAccess } = require('../middleware/planRestrictions');

// Middleware to ensure only Standard and Premium plans can access
router.use(authenticateToken);
router.use(checkFeatureAccess('inventory_management'));

// Get all product categories
router.get('/categories', async (req, res) => {
  try {
    const userId = req.user.id;

    const [categories] = await db.execute(`
      SELECT 
        pc.*,
        COUNT(DISTINCT p.id) as product_count
      FROM product_categories pc
      LEFT JOIN products p ON pc.id = p.category_id AND p.is_active = 1
      WHERE pc.is_active = 1
      GROUP BY pc.id
      ORDER BY pc.name
    `);

    res.json(categories);

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create product category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, parent_category_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const [result] = await db.execute(`
      INSERT INTO product_categories 
      (name, description, parent_category_id)
      VALUES (?, ?, ?)
    `, [name, description, parent_category_id || null]);

    res.status(201).json({
      id: result.insertId,
      message: 'Category created successfully'
    });

  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Get all products with stock levels
router.get('/products', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category_id, low_stock, search } = req.query;

    let query = `
      SELECT 
        p.*,
        pc.name as category_name,
        (SELECT COUNT(*) FROM inventory_transactions 
         WHERE product_id = p.id 
         AND transaction_type = 'sale' 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthly_sales
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.is_active = 1
    `;

    const params = [];

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (low_stock === 'true') {
      query += ' AND p.current_stock <= p.min_stock_level';
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.name';

    const [products] = await db.execute(query, params);

    res.json(products);

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product details
router.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const [product] = await db.execute(`
      SELECT 
        p.*,
        pc.name as category_name
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.id = ?
    `, [productId]);

    if (!product.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get suppliers
    const [suppliers] = await db.execute(
      'SELECT * FROM product_suppliers WHERE product_id = ?',
      [productId]
    );

    // Get recent transactions
    const [transactions] = await db.execute(`
      SELECT 
        it.*,
        u.name as created_by_name
      FROM inventory_transactions it
      LEFT JOIN users u ON it.created_by = u.id
      WHERE it.product_id = ?
      ORDER BY it.created_at DESC
      LIMIT 20
    `, [productId]);

    res.json({
      ...product[0],
      suppliers,
      recentTransactions: transactions
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product
router.post('/products', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      category_id,
      name,
      description,
      sku,
      barcode,
      unit_price,
      cost_price,
      initial_stock,
      min_stock_level,
      max_stock_level,
      unit_of_measure,
      suppliers
    } = req.body;

    // Validate required fields
    if (!name || !unit_price) {
      await connection.rollback();
      return res.status(400).json({ error: 'Name and unit price are required' });
    }

    // Check for duplicate SKU
    if (sku) {
      const [existing] = await connection.execute(
        'SELECT id FROM products WHERE sku = ?',
        [sku]
      );
      if (existing.length) {
        await connection.rollback();
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    // Create product
    const [productResult] = await connection.execute(`
      INSERT INTO products 
      (category_id, name, description, sku, barcode, unit_price, cost_price,
       current_stock, min_stock_level, max_stock_level, unit_of_measure)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id || null,
      name,
      description,
      sku,
      barcode,
      unit_price,
      cost_price || null,
      initial_stock || 0,
      min_stock_level || 10,
      max_stock_level || 100,
      unit_of_measure || 'piece'
    ]);

    const productId = productResult.insertId;

    // Add initial stock transaction if provided
    if (initial_stock > 0) {
      await connection.execute(`
        INSERT INTO inventory_transactions 
        (product_id, transaction_type, quantity, unit_price, total_amount, 
         reference_type, notes, created_by)
        VALUES (?, 'purchase', ?, ?, ?, 'manual', 'Initial stock', ?)
      `, [
        productId,
        initial_stock,
        cost_price || unit_price,
        initial_stock * (cost_price || unit_price),
        req.user.id
      ]);
    }

    // Add suppliers if provided
    if (suppliers && suppliers.length > 0) {
      for (let i = 0; i < suppliers.length; i++) {
        const supplier = suppliers[i];
        await connection.execute(`
          INSERT INTO product_suppliers 
          (product_id, supplier_name, supplier_contact, supplier_email, 
           lead_time_days, min_order_quantity, is_primary)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          productId,
          supplier.name,
          supplier.contact,
          supplier.email,
          supplier.lead_time_days || 7,
          supplier.min_order_quantity || 1,
          i === 0 // First supplier is primary
        ]);
      }
    }

    await connection.commit();

    res.status(201).json({
      id: productId,
      message: 'Product created successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    connection.release();
  }
});

// Update product
router.put('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      category_id,
      name,
      description,
      sku,
      barcode,
      unit_price,
      cost_price,
      min_stock_level,
      max_stock_level,
      unit_of_measure,
      is_active
    } = req.body;

    // Check for duplicate SKU
    if (sku) {
      const [existing] = await db.execute(
        'SELECT id FROM products WHERE sku = ? AND id != ?',
        [sku, productId]
      );
      if (existing.length) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    await db.execute(`
      UPDATE products 
      SET category_id = ?, name = ?, description = ?, sku = ?, barcode = ?,
          unit_price = ?, cost_price = ?, min_stock_level = ?, 
          max_stock_level = ?, unit_of_measure = ?, is_active = ?
      WHERE id = ?
    `, [
      category_id || null,
      name,
      description,
      sku,
      barcode,
      unit_price,
      cost_price || null,
      min_stock_level || 10,
      max_stock_level || 100,
      unit_of_measure || 'piece',
      is_active !== undefined ? is_active : true,
      productId
    ]);

    res.json({ message: 'Product updated successfully' });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Record inventory transaction
router.post('/transactions', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const {
      product_id,
      transaction_type,
      quantity,
      unit_price,
      reference_type,
      reference_id,
      notes
    } = req.body;

    // Validate required fields
    if (!product_id || !transaction_type || !quantity) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Product ID, transaction type, and quantity are required' 
      });
    }

    // Get current product stock
    const [product] = await connection.execute(
      'SELECT current_stock, unit_price as default_price FROM products WHERE id = ?',
      [product_id]
    );

    if (!product.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate new stock level
    let newStock = product[0].current_stock;
    const actualUnitPrice = unit_price || product[0].default_price;

    if (transaction_type === 'purchase' || transaction_type === 'return') {
      newStock += quantity;
    } else if (transaction_type === 'sale' || transaction_type === 'adjustment') {
      newStock -= quantity;
      
      // Check if we have enough stock
      if (newStock < 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Insufficient stock',
          currentStock: product[0].current_stock,
          requested: quantity
        });
      }
    }

    // Record transaction
    const [transactionResult] = await connection.execute(`
      INSERT INTO inventory_transactions 
      (product_id, transaction_type, quantity, unit_price, total_amount,
       reference_type, reference_id, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      product_id,
      transaction_type,
      quantity,
      actualUnitPrice,
      quantity * actualUnitPrice,
      reference_type || 'manual',
      reference_id || null,
      notes,
      req.user.id
    ]);

    // Update product stock
    await connection.execute(
      'UPDATE products SET current_stock = ? WHERE id = ?',
      [newStock, product_id]
    );

    await connection.commit();

    res.status(201).json({
      id: transactionResult.insertId,
      newStock,
      message: 'Transaction recorded successfully'
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error recording transaction:', error);
    res.status(500).json({ error: 'Failed to record transaction' });
  } finally {
    connection.release();
  }
});

// Get inventory report
router.get('/reports', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, reportType = 'summary' } = req.query;

    const dateFilter = startDate && endDate 
      ? 'AND it.created_at BETWEEN ? AND ?' 
      : 'AND it.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    const params = startDate && endDate ? [startDate, endDate] : [];

    if (reportType === 'summary') {
      // Get inventory summary
      const [summary] = await db.execute(`
        SELECT 
          COUNT(DISTINCT p.id) as total_products,
          SUM(p.current_stock * p.unit_price) as total_inventory_value,
          SUM(p.current_stock * COALESCE(p.cost_price, p.unit_price * 0.6)) as total_cost_value,
          COUNT(DISTINCT CASE WHEN p.current_stock <= p.min_stock_level THEN p.id END) as low_stock_items,
          COUNT(DISTINCT CASE WHEN p.current_stock = 0 THEN p.id END) as out_of_stock_items
        FROM products p
        WHERE p.is_active = 1
      `);

      // Get transaction summary
      const [transactions] = await db.execute(`
        SELECT 
          transaction_type,
          COUNT(*) as transaction_count,
          SUM(quantity) as total_quantity,
          SUM(total_amount) as total_value
        FROM inventory_transactions it
        WHERE 1=1 ${dateFilter}
        GROUP BY transaction_type
      `, params);

      res.json({
        summary: summary[0],
        transactions
      });

    } else if (reportType === 'movement') {
      // Get product movement report
      const [movement] = await db.execute(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.current_stock,
          COALESCE(SUM(CASE WHEN it.transaction_type = 'sale' THEN it.quantity ELSE 0 END), 0) as total_sold,
          COALESCE(SUM(CASE WHEN it.transaction_type = 'purchase' THEN it.quantity ELSE 0 END), 0) as total_purchased,
          COALESCE(SUM(CASE WHEN it.transaction_type = 'sale' THEN it.total_amount ELSE 0 END), 0) as sales_revenue
        FROM products p
        LEFT JOIN inventory_transactions it ON p.id = it.product_id ${dateFilter}
        WHERE p.is_active = 1
        GROUP BY p.id
        ORDER BY total_sold DESC
      `, params);

      res.json(movement);

    } else if (reportType === 'valuation') {
      // Get inventory valuation report
      const [valuation] = await db.execute(`
        SELECT 
          pc.name as category_name,
          COUNT(p.id) as product_count,
          SUM(p.current_stock) as total_units,
          SUM(p.current_stock * p.unit_price) as retail_value,
          SUM(p.current_stock * COALESCE(p.cost_price, p.unit_price * 0.6)) as cost_value,
          SUM(p.current_stock * p.unit_price) - 
          SUM(p.current_stock * COALESCE(p.cost_price, p.unit_price * 0.6)) as potential_profit
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.is_active = 1
        GROUP BY pc.id, pc.name
        ORDER BY retail_value DESC
      `);

      res.json(valuation);
    }

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const [lowStockProducts] = await db.execute(`
      SELECT 
        p.*,
        pc.name as category_name,
        ps.supplier_name,
        ps.supplier_contact,
        ps.lead_time_days,
        ps.min_order_quantity
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      LEFT JOIN product_suppliers ps ON p.id = ps.product_id AND ps.is_primary = 1
      WHERE p.is_active = 1
      AND p.current_stock <= p.min_stock_level
      ORDER BY (p.current_stock / NULLIF(p.min_stock_level, 0)) ASC
    `);

    res.json(lowStockProducts);

  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Bulk import products (CSV)
router.post('/import', async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Invalid product data' });
    }

    let imported = 0;
    let errors = [];

    for (const product of products) {
      try {
        // Check for existing SKU
        if (product.sku) {
          const [existing] = await db.execute(
            'SELECT id FROM products WHERE sku = ?',
            [product.sku]
          );
          
          if (existing.length) {
            errors.push(`SKU ${product.sku} already exists`);
            continue;
          }
        }

        await db.execute(`
          INSERT INTO products 
          (category_id, name, description, sku, barcode, unit_price, cost_price,
           current_stock, min_stock_level, max_stock_level, unit_of_measure)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          product.category_id || null,
          product.name,
          product.description || null,
          product.sku || null,
          product.barcode || null,
          product.unit_price,
          product.cost_price || null,
          product.current_stock || 0,
          product.min_stock_level || 10,
          product.max_stock_level || 100,
          product.unit_of_measure || 'piece'
        ]);

        imported++;
      } catch (error) {
        errors.push(`Error importing ${product.name}: ${error.message}`);
      }
    }

    res.json({
      message: `Imported ${imported} products successfully`,
      imported,
      errors
    });

  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

module.exports = router;