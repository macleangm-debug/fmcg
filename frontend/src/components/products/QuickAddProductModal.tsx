import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WebModal from '../WebModal';
import { useBusinessStore } from '../../store/businessStore';

interface Category {
  id: string;
  name: string;
}

interface QuickAddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (productData: ProductData) => Promise<void>;
  categories?: Category[];
  currencySymbol?: string;
  // Inventory-specific fields
  showCostPrice?: boolean;
  showMinStock?: boolean;
  showSupplier?: boolean;
  showLocation?: boolean;
  showUnit?: boolean;
  // Customization
  title?: string;
  saveButtonText?: string;
  successCallback?: () => void;
  // App context
  appType?: 'retailpro' | 'inventory';
}

export interface ProductData {
  name: string;
  price: number;
  cost_price?: number;
  stock_quantity: number;
  min_stock?: number;
  category_id?: string | null;
  unit?: string;
  supplier?: string;
  location?: string;
  sku?: string;
}

const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'box', 'pack', 'carton', 'dozen'];

const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  visible,
  onClose,
  onSave,
  categories = [],
  currencySymbol,
  showCostPrice = false,
  showMinStock = false,
  showSupplier = false,
  showLocation = false,
  showUnit = false,
  title = 'Quick Add Product',
  saveButtonText = 'Add Product',
  successCallback,
  appType = 'retailpro',
}) => {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 768;
  const { formatCurrency, business } = useBusinessStore();
  
  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [minStock, setMinStock] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unit, setUnit] = useState('pcs');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [sku, setSku] = useState('');
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  
  const currency = currencySymbol || business?.currency_symbol || 'TSh';
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);
  
  const resetForm = () => {
    setName('');
    setPrice('');
    setCostPrice('');
    setStockQty('');
    setMinStock('');
    setCategoryId(null);
    setUnit('pcs');
    setSupplier('');
    setLocation('');
    setSku('');
    setError('');
  };
  
  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setError('Product name is required');
      return;
    }
    
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setError('Valid price is required');
      return;
    }
    
    if (showCostPrice && costPrice) {
      const costNum = parseFloat(costPrice);
      if (isNaN(costNum) || costNum < 0) {
        setError('Invalid cost price');
        return;
      }
    }
    
    setSaving(true);
    setError('');
    
    try {
      const productData: ProductData = {
        name: name.trim(),
        price: priceNum,
        stock_quantity: parseInt(stockQty) || 0,
        category_id: categoryId,
      };
      
      // Add optional fields
      if (showCostPrice && costPrice) {
        productData.cost_price = parseFloat(costPrice);
      }
      if (showMinStock && minStock) {
        productData.min_stock = parseInt(minStock);
      }
      if (showUnit) {
        productData.unit = unit;
      }
      if (showSupplier && supplier.trim()) {
        productData.supplier = supplier.trim();
      }
      if (showLocation && location.trim()) {
        productData.location = location.trim();
      }
      if (sku.trim()) {
        productData.sku = sku.trim();
      }
      
      await onSave(productData);
      
      onClose();
      successCallback?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to add product');
    } finally {
      setSaving(false);
    }
  };
  
  const isInventoryMode = appType === 'inventory' || showCostPrice || showMinStock;
  
  return (
    <WebModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={isInventoryMode 
        ? 'Add item with essential details. Edit more later.'
        : 'Add product with minimal info. Edit details later.'
      }
      icon={isInventoryMode ? 'cube-outline' : 'pricetag-outline'}
      iconColor={isInventoryMode ? '#059669' : '#2563EB'}
      maxWidth={480}
    >
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Banner */}
        <View style={[styles.banner, isInventoryMode && styles.bannerInventory]}>
          <Ionicons 
            name="flash" 
            size={16} 
            color={isInventoryMode ? '#059669' : '#F59E0B'} 
          />
          <Text style={[styles.bannerText, isInventoryMode && styles.bannerTextInventory]}>
            {isInventoryMode 
              ? 'Quick add with essentials. Full details available in edit mode.'
              : 'Add product with minimal info. Edit details later.'
            }
          </Text>
        </View>
        
        {/* Error Message */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        
        {/* Product Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Product Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Coca Cola 500ml"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#9CA3AF"
            autoFocus
          />
        </View>
        
        {/* SKU (Optional) */}
        {isInventoryMode && (
          <View style={styles.field}>
            <Text style={styles.label}>SKU / Barcode</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., BEV-001"
              value={sku}
              onChangeText={setSku}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
          </View>
        )}
        
        {/* Price Row */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>
              {showCostPrice ? 'Selling Price' : 'Price'} ({currency}) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          {showCostPrice && (
            <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Cost Price ({currency})</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={costPrice}
                onChangeText={setCostPrice}
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}
        </View>
        
        {/* Stock Row */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Stock Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={stockQty}
              onChangeText={setStockQty}
              keyboardType="number-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          {showMinStock && (
            <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Min Stock Level</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={minStock}
                onChangeText={setMinStock}
                keyboardType="number-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}
          
          {showUnit && !showMinStock && (
            <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Unit</Text>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowUnitPicker(!showUnitPicker)}
              >
                <Text style={styles.pickerButtonText}>{unit}</Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Unit Picker Dropdown */}
        {showUnitPicker && (
          <View style={styles.unitDropdown}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitOption, unit === u && styles.unitOptionActive]}
                onPress={() => {
                  setUnit(u);
                  setShowUnitPicker(false);
                }}
              >
                <Text style={[styles.unitOptionText, unit === u && styles.unitOptionTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Category Selection */}
        {categories.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.chipScroll}
            >
              <TouchableOpacity
                style={[styles.chip, !categoryId && styles.chipActive]}
                onPress={() => setCategoryId(null)}
              >
                <Text style={[styles.chipText, !categoryId && styles.chipTextActive]}>
                  None
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, categoryId === cat.id && styles.chipActive]}
                  onPress={() => setCategoryId(cat.id)}
                >
                  <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Supplier (Inventory only) */}
        {showSupplier && (
          <View style={styles.field}>
            <Text style={styles.label}>Supplier</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., ABC Distributors"
              value={supplier}
              onChangeText={setSupplier}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}
        
        {/* Location (Inventory only) */}
        {showLocation && (
          <View style={styles.field}>
            <Text style={styles.label}>Storage Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Warehouse A, Shelf 3"
              value={location}
              onChangeText={setLocation}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}
        
        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.saveBtn, 
              isInventoryMode && styles.saveBtnInventory,
              (!name.trim() || !price) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!name.trim() || !price || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{saveButtonText}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </WebModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerInventory: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  bannerText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  bannerTextInventory: {
    color: '#065F46',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  unitDropdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    marginTop: -8,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  unitOptionActive: {
    backgroundColor: '#059669',
  },
  unitOptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  unitOptionTextActive: {
    color: '#FFFFFF',
  },
  chipScroll: {
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#2563EB',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnInventory: {
    backgroundColor: '#059669',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
});

export default QuickAddProductModal;
