import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Plus, BarChart3, Search } from 'lucide-react';
import PlanRestrictionWrapper from '../components/PlanRestrictionWrapper';
import { api } from '../services/api';

interface Product {
  id: number;
  name: string;
  category_name: string;
  sku: string;
  barcode?: string;
  unit_price: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  monthly_sales: number;
}

interface InventoryTransaction {
  id: number;
  product_id: number;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity: number;
  unit_price: number;
  total_amount: number;
  created_at: string;
  created_by_name: string;
}

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [inventoryStats, setInventoryStats] = useState<any>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category_id: 1,
    sku: '',
    barcode: '',
    unit_price: 0,
    cost_price: 0,
    initial_stock: 0,
    min_stock_level: 10,
    max_stock_level: 100,
    unit_of_measure: 'piece'
  });

  const [newTransaction, setNewTransaction] = useState({
    product_id: 0,
    transaction_type: 'sale' as const,
    quantity: 1,
    unit_price: 0,
    notes: ''
  });

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterLowStock) params.append('low_stock', 'true');
      
      const response = await api.get(`/inventory/products?${params}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchLowStockAlerts = async () => {
    try {
      const response = await api.get('/inventory/alerts/low-stock');
      setLowStockProducts(response.data);
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
    }
  };

  const fetchInventoryStats = async () => {
    try {
      const response = await api.get('/inventory/reports?reportType=summary');
      setInventoryStats(response.data);
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    }
  };

  const fetchProductDetails = async (productId: number) => {
    try {
      const response = await api.get(`/inventory/products/${productId}`);
      setSelectedProduct(response.data);
      setTransactions(response.data.recentTransactions);
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  };

  const createProduct = async () => {
    try {
      await api.post('/inventory/products', newProduct);
      setShowAddProduct(false);
      fetchProducts();
      setNewProduct({
        name: '',
        category_id: 1,
        sku: '',
        barcode: '',
        unit_price: 0,
        cost_price: 0,
        initial_stock: 0,
        min_stock_level: 10,
        max_stock_level: 100,
        unit_of_measure: 'piece'
      });
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const recordTransaction = async () => {
    try {
      await api.post('/inventory/transactions', newTransaction);
      setShowTransaction(false);
      fetchProducts();
      if (selectedProduct) {
        fetchProductDetails(selectedProduct.id);
      }
      setNewTransaction({
        product_id: 0,
        transaction_type: 'sale',
        quantity: 1,
        unit_price: 0,
        notes: ''
      });
    } catch (error) {
      console.error('Error recording transaction:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchLowStockAlerts();
    fetchInventoryStats();
  }, [searchTerm, filterLowStock]);

  return (
    <PlanRestrictionWrapper feature="inventory_management" requiredPlan="standard">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">在庫管理</h1>
          <p className="text-gray-600 dark:text-gray-400">
            商品の在庫を管理し、低在庫アラートを受け取ります
          </p>
        </div>

        {/* Inventory Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-gray-500">総商品</span>
            </div>
            <p className="text-2xl font-bold">{inventoryStats?.summary?.total_products || 0}</p>
            <p className="text-sm text-gray-600">商品数</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <span className="text-sm text-gray-500">在庫額</span>
            </div>
            <p className="text-2xl font-bold">¥{Math.floor(inventoryStats?.summary?.total_inventory_value || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-600">総在庫価値</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <span className="text-sm text-gray-500">警告</span>
            </div>
            <p className="text-2xl font-bold">{inventoryStats?.summary?.low_stock_items || 0}</p>
            <p className="text-sm text-gray-600">低在庫</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <span className="text-sm text-gray-500">欠品</span>
            </div>
            <p className="text-2xl font-bold">{inventoryStats?.summary?.out_of_stock_items || 0}</p>
            <p className="text-sm text-gray-600">在庫切れ</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-gray-500">利益率</span>
            </div>
            <p className="text-2xl font-bold">40%</p>
            <p className="text-sm text-gray-600">平均利益率</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="商品名、SKU、バーコードで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filterLowStock}
                  onChange={(e) => setFilterLowStock(e.target.checked)}
                  className="mr-2"
                />
                低在庫のみ表示
              </label>
              
              <button
                onClick={() => setShowAddProduct(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                商品追加
              </button>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockProducts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              低在庫アラート
            </h3>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 3).map((product) => (
                <div key={product.id} className="flex justify-between text-sm">
                  <span>{product.name}</span>
                  <span className="text-red-600 dark:text-red-400">
                    残り {product.current_stock} / 最小 {product.min_stock_level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    商品名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    在庫数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    単価
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    月間売上
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {product.category_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${
                        product.current_stock <= product.min_stock_level 
                          ? 'text-red-600' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {product.current_stock}
                        {product.current_stock <= product.min_stock_level && (
                          <AlertTriangle className="inline w-4 h-4 ml-1" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      ¥{product.unit_price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {product.monthly_sales}個
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => {
                          fetchProductDetails(product.id);
                          setNewTransaction({ 
                            ...newTransaction, 
                            product_id: product.id,
                            unit_price: product.unit_price 
                          });
                        }}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        詳細
                      </button>
                      <button
                        onClick={() => {
                          setNewTransaction({ 
                            ...newTransaction, 
                            product_id: product.id,
                            unit_price: product.unit_price 
                          });
                          setShowTransaction(true);
                        }}
                        className="text-green-600 hover:text-green-800"
                      >
                        取引
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Details Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
                  <p className="text-gray-600">SKU: {selectedProduct.sku}</p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-2">在庫情報</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>現在在庫:</span>
                      <span className="font-medium">{selectedProduct.current_stock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>最小在庫:</span>
                      <span>{selectedProduct.min_stock_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>最大在庫:</span>
                      <span>{selectedProduct.max_stock_level}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">価格情報</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>販売価格:</span>
                      <span className="font-medium">¥{selectedProduct.unit_price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>月間売上:</span>
                      <span>{selectedProduct.monthly_sales}個</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">最近の取引</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left">日時</th>
                        <th className="px-4 py-2 text-left">種類</th>
                        <th className="px-4 py-2 text-left">数量</th>
                        <th className="px-4 py-2 text-left">金額</th>
                        <th className="px-4 py-2 text-left">担当者</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-4 py-2">
                            {new Date(transaction.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              transaction.transaction_type === 'sale' ? 'bg-green-100 text-green-700' :
                              transaction.transaction_type === 'purchase' ? 'bg-blue-100 text-blue-700' :
                              transaction.transaction_type === 'return' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {transaction.transaction_type === 'sale' ? '販売' :
                               transaction.transaction_type === 'purchase' ? '仕入' :
                               transaction.transaction_type === 'return' ? '返品' : '調整'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {transaction.transaction_type === 'sale' || transaction.transaction_type === 'adjustment' ? '-' : '+'}
                            {transaction.quantity}
                          </td>
                          <td className="px-4 py-2">
                            ¥{transaction.total_amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2">
                            {transaction.created_by_name || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {showAddProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">新規商品追加</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">商品名 *</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input
                    type="text"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">販売価格 *</label>
                    <input
                      type="number"
                      value={newProduct.unit_price}
                      onChange={(e) => setNewProduct({ ...newProduct, unit_price: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">仕入価格</label>
                    <input
                      type="number"
                      value={newProduct.cost_price}
                      onChange={(e) => setNewProduct({ ...newProduct, cost_price: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">初期在庫</label>
                    <input
                      type="number"
                      value={newProduct.initial_stock}
                      onChange={(e) => setNewProduct({ ...newProduct, initial_stock: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">最小在庫</label>
                    <input
                      type="number"
                      value={newProduct.min_stock_level}
                      onChange={(e) => setNewProduct({ ...newProduct, min_stock_level: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">最大在庫</label>
                    <input
                      type="number"
                      value={newProduct.max_stock_level}
                      onChange={(e) => setNewProduct({ ...newProduct, max_stock_level: parseInt(e.target.value) })}
                      className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={createProduct}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  追加
                </button>
                <button
                  onClick={() => setShowAddProduct(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Modal */}
        {showTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">在庫取引を記録</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">取引タイプ</label>
                  <select
                    value={newTransaction.transaction_type}
                    onChange={(e) => setNewTransaction({ 
                      ...newTransaction, 
                      transaction_type: e.target.value as any 
                    })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="sale">販売</option>
                    <option value="purchase">仕入</option>
                    <option value="return">返品</option>
                    <option value="adjustment">調整</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">数量</label>
                  <input
                    type="number"
                    value={newTransaction.quantity}
                    onChange={(e) => setNewTransaction({ 
                      ...newTransaction, 
                      quantity: parseInt(e.target.value) 
                    })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">単価</label>
                  <input
                    type="number"
                    value={newTransaction.unit_price}
                    onChange={(e) => setNewTransaction({ 
                      ...newTransaction, 
                      unit_price: parseInt(e.target.value) 
                    })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">メモ</label>
                  <textarea
                    value={newTransaction.notes}
                    onChange={(e) => setNewTransaction({ 
                      ...newTransaction, 
                      notes: e.target.value 
                    })}
                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    rows={3}
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">合計金額</p>
                  <p className="text-xl font-bold">
                    ¥{(newTransaction.quantity * newTransaction.unit_price).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={recordTransaction}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  記録
                </button>
                <button
                  onClick={() => setShowTransaction(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlanRestrictionWrapper>
  );
};

export default Inventory;