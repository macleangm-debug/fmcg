import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const generateRowId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createEmptyRow = () => ({
  id: generateRowId(),
  name: '',
  sku: '',
  price: '',
  stock: '',
  category_id: '',
  category_name: '',
  status: 'pending',
});

export default function BulkProductImportModal({
  visible,
  onClose,
  categories,
  onImport,
  formatCurrency,
}) {
  const [rows, setRows] = useState([createEmptyRow()]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [activeTab, setActiveTab] = useState('manual');
  const [csvContent, setCsvContent] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(null);

  const isWeb = Platform.OS === 'web';

  // Add a new empty row
  const handleAddRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  // Remove a row
  const handleRemoveRow = (rowId) => {
    if (rows.length === 1) {
      // Don't remove the last row, just clear it
      setRows([createEmptyRow()]);
    } else {
      setRows(rows.filter(r => r.id !== rowId));
    }
  };

  // Update a field in a row
  const handleUpdateRow = (rowId, field, value) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value, status: 'pending' };
        // If updating category_id, also update category_name
        if (field === 'category_id') {
          const cat = categories.find(c => c.id === value);
          updated.category_name = cat?.name || '';
        }
        return updated;
      }
      return row;
    }));
  };

  // Validate a single row
  const validateRow = (row) => {
    if (!row.name.trim()) {
      return { valid: false, error: 'Product name is required' };
    }
    if (!row.price.trim() || isNaN(parseFloat(row.price)) || parseFloat(row.price) <= 0) {
      return { valid: false, error: 'Valid price is required' };
    }
    if (!row.category_id) {
      return { valid: false, error: 'Category is required' };
    }
    if (row.stock.trim() && isNaN(parseInt(row.stock))) {
      return { valid: false, error: 'Stock must be a number' };
    }
    return { valid: true };
  };

  // Validate all rows
  const handleValidate = () => {
    const validatedRows = rows.map(row => {
      if (!row.name.trim() && !row.price.trim() && !row.sku.trim()) {
        // Empty row, skip validation but mark as pending
        return { ...row, status: 'pending' };
      }
      const validation = validateRow(row);
      return {
        ...row,
        status: validation.valid ? 'valid' : 'invalid',
        error: validation.error,
      };
    });
    setRows(validatedRows);
    
    const validCount = validatedRows.filter(r => r.status === 'valid').length;
    const invalidCount = validatedRows.filter(r => r.status === 'invalid').length;
    
    if (invalidCount > 0) {
      Alert.alert(
        'Validation Results',
        `${validCount} valid, ${invalidCount} invalid.\nPlease fix the errors and try again.`
      );
    } else if (validCount === 0) {
      Alert.alert('No Products', 'Please add at least one product to import.');
    } else {
      Alert.alert('Validation Passed', `${validCount} products ready to import.`);
    }
  };

  // Parse CSV content to rows
  const handleParseCsv = () => {
    if (!csvContent.trim()) {
      Alert.alert('Error', 'Please paste CSV content first');
      return;
    }

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      Alert.alert('Error', 'CSV must have a header row and at least one data row');
      return;
    }

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim());
    
    // Map header names to indices
    const nameIdx = headers.findIndex(h => h.includes('name') || h === 'product');
    const skuIdx = headers.findIndex(h => h.includes('sku') || h === 'code');
    const priceIdx = headers.findIndex(h => h.includes('price') || h === 'cost');
    const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('quantity') || h === 'qty');
    const categoryIdx = headers.findIndex(h => h.includes('category') || h === 'cat');

    if (nameIdx === -1) {
      Alert.alert('Error', 'CSV must have a "name" or "product" column');
      return;
    }
    if (priceIdx === -1) {
      Alert.alert('Error', 'CSV must have a "price" column');
      return;
    }

    // Parse data rows
    const parsedRows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, '')); // Remove quotes
      
      if (values.length < 2) continue; // Skip empty lines
      
      const name = nameIdx >= 0 ? values[nameIdx] || '' : '';
      if (!name) continue; // Skip rows without a name
      
      // Try to match category by name
      let categoryId = '';
      let categoryName = '';
      if (categoryIdx >= 0 && values[categoryIdx]) {
        const catName = values[categoryIdx].toLowerCase();
        const matchedCat = categories.find(c => 
          c.name.toLowerCase() === catName || 
          c.name.toLowerCase().includes(catName) ||
          catName.includes(c.name.toLowerCase())
        );
        if (matchedCat) {
          categoryId = matchedCat.id;
          categoryName = matchedCat.name;
        }
      }
      
      parsedRows.push({
        id: generateRowId(),
        name,
        sku: skuIdx >= 0 ? values[skuIdx] || '' : '',
        price: priceIdx >= 0 ? values[priceIdx]?.replace(/[^0-9.]/g, '') || '' : '',
        stock: stockIdx >= 0 ? values[stockIdx]?.replace(/[^0-9]/g, '') || '' : '',
        category_id: categoryId,
        category_name: categoryName,
        status: 'pending',
      });
    }

    if (parsedRows.length === 0) {
      Alert.alert('Error', 'No valid product rows found in CSV');
      return;
    }

    setRows(parsedRows);
    setActiveTab('manual'); // Switch to manual tab to review
    Alert.alert('CSV Parsed', `${parsedRows.length} products imported from CSV. Please review and set categories.`);
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const templateContent = 'name,sku,price,stock,category\nSample Product,SKU001,5000,100,General\nAnother Product,SKU002,7500,50,Electronics';
    
    if (isWeb) {
      const blob = new Blob([templateContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_import_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      Alert.alert('Template', 'CSV Format:\nname,sku,price,stock,category\n\nExample:\nSample Product,SKU001,5000,100,General');
    }
  };

  // Import products
  const handleImport = async () => {
    const validRows = rows.filter(r => r.status === 'valid');
    
    if (validRows.length === 0) {
      // Try to validate first
      handleValidate();
      const revalidated = rows.filter(r => {
        const v = validateRow(r);
        return v.valid;
      });
      if (revalidated.length === 0) {
        Alert.alert('No Valid Products', 'Please add valid products before importing.');
        return;
      }
    }

    const productsToImport = rows
      .filter(r => r.name.trim() && r.price.trim() && r.category_id)
      .map(r => ({
        name: r.name.trim(),
        sku: r.sku.trim() || undefined,
        price: parseFloat(r.price),
        stock_quantity: parseInt(r.stock) || 0,
        category_id: r.category_id,
        low_stock_threshold: 10,
        is_active: true,
        track_stock: true,
      }));

    if (productsToImport.length === 0) {
      Alert.alert('No Products', 'Please add at least one valid product to import.');
      return;
    }

    setImporting(true);
    try {
      const result = await onImport(productsToImport);
      setImportResult(result);
      
      if (result.success > 0) {
        Alert.alert(
          'Import Complete',
          `Successfully imported ${result.success} products.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
          [{ text: 'OK', onPress: () => onClose() }]
        );
      } else {
        Alert.alert('Import Failed', `All ${result.failed} products failed to import. Please check the data.`);
      }
    } catch (error) {
      Alert.alert('Import Error', error.message || 'Failed to import products');
    } finally {
      setImporting(false);
    }
  };

  // Reset modal state
  const handleClose = () => {
    setRows([createEmptyRow()]);
    setCsvContent('');
    setImportResult(null);
    setShowCategoryPicker(null);
    onClose();
  };

  const validRowsCount = rows.filter(r => r.name.trim() && r.price.trim() && r.category_id).length;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}>
                <Ionicons name="cloud-upload-outline" size={24} color="#2563EB" />
              </View>
              <Text style={styles.title}>Bulk Product Import</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
              onPress={() => setActiveTab('manual')}
            >
              <Ionicons 
                name="create-outline" 
                size={18} 
                color={activeTab === 'manual' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
                Add Manually
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'csv' && styles.tabActive]}
              onPress={() => setActiveTab('csv')}
            >
              <Ionicons 
                name="document-text-outline" 
                size={18} 
                color={activeTab === 'csv' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'csv' && styles.tabTextActive]}>
                Import CSV
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'manual' ? (
              <>
                {/* Product Rows */}
                {rows.map((row, index) => (
                  <View key={row.id} style={[styles.productRow, row.status === 'invalid' && styles.productRowInvalid]}>
                    <View style={styles.rowHeader}>
                      <Text style={styles.rowNumber}>#{index + 1}</Text>
                      {row.status === 'valid' && (
                        <View style={styles.statusBadgeValid}>
                          <Ionicons name="checkmark" size={12} color="#10B981" />
                        </View>
                      )}
                      {row.status === 'invalid' && (
                        <View style={styles.statusBadgeInvalid}>
                          <Ionicons name="alert" size={12} color="#EF4444" />
                        </View>
                      )}
                      <TouchableOpacity 
                        onPress={() => handleRemoveRow(row.id)}
                        style={styles.removeRowBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                    
                    {row.error && (
                      <Text style={styles.rowError}>{row.error}</Text>
                    )}
                    
                    <View style={styles.rowFields}>
                      <View style={styles.fieldFullWidth}>
                        <Text style={styles.fieldLabel}>Product Name *</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="e.g. Coca Cola 500ml"
                          value={row.name}
                          onChangeText={(v) => handleUpdateRow(row.id, 'name', v)}
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      
                      <View style={styles.fieldRow}>
                        <View style={styles.fieldHalf}>
                          <Text style={styles.fieldLabel}>SKU / Barcode</Text>
                          <TextInput
                            style={styles.fieldInput}
                            placeholder="SKU001"
                            value={row.sku}
                            onChangeText={(v) => handleUpdateRow(row.id, 'sku', v)}
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                        <View style={styles.fieldHalf}>
                          <Text style={styles.fieldLabel}>Price *</Text>
                          <TextInput
                            style={styles.fieldInput}
                            placeholder="5000"
                            value={row.price}
                            onChangeText={(v) => handleUpdateRow(row.id, 'price', v)}
                            keyboardType="numeric"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.fieldRow}>
                        <View style={styles.fieldHalf}>
                          <Text style={styles.fieldLabel}>Stock Qty</Text>
                          <TextInput
                            style={styles.fieldInput}
                            placeholder="100"
                            value={row.stock}
                            onChangeText={(v) => handleUpdateRow(row.id, 'stock', v)}
                            keyboardType="numeric"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                        <View style={styles.fieldHalf}>
                          <Text style={styles.fieldLabel}>Category *</Text>
                          <TouchableOpacity
                            style={styles.categorySelect}
                            onPress={() => setShowCategoryPicker(showCategoryPicker === row.id ? null : row.id)}
                          >
                            <Text style={row.category_name ? styles.categorySelectText : styles.categorySelectPlaceholder}>
                              {row.category_name || 'Select Category'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#6B7280" />
                          </TouchableOpacity>
                          
                          {showCategoryPicker === row.id && (
                            <View style={styles.categoryDropdown}>
                              <ScrollView style={styles.categoryDropdownScroll} nestedScrollEnabled>
                                {categories.map(cat => (
                                  <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                      styles.categoryOption,
                                      row.category_id === cat.id && styles.categoryOptionActive
                                    ]}
                                    onPress={() => {
                                      handleUpdateRow(row.id, 'category_id', cat.id);
                                      setShowCategoryPicker(null);
                                    }}
                                  >
                                    <Text style={[
                                      styles.categoryOptionText,
                                      row.category_id === cat.id && styles.categoryOptionTextActive
                                    ]}>
                                      {cat.name}
                                    </Text>
                                    {row.category_id === cat.id && (
                                      <Ionicons name="checkmark" size={16} color="#2563EB" />
                                    )}
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
                
                {/* Add Row Button */}
                <TouchableOpacity style={styles.addRowButton} onPress={handleAddRow}>
                  <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
                  <Text style={styles.addRowButtonText}>Add Another Product</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* CSV Import Tab */}
                <View style={styles.csvSection}>
                  <View style={styles.csvInfo}>
                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                    <Text style={styles.csvInfoText}>
                      Paste CSV content with columns: name, sku, price, stock, category
                    </Text>
                  </View>
                  
                  <TouchableOpacity style={styles.downloadTemplateBtn} onPress={handleDownloadTemplate}>
                    <Ionicons name="download-outline" size={18} color="#2563EB" />
                    <Text style={styles.downloadTemplateBtnText}>Download CSV Template</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.csvLabel}>Paste CSV Content:</Text>
                  <TextInput
                    style={styles.csvTextArea}
                    placeholder="name,sku,price,stock,category&#10;Product 1,SKU001,5000,100,General&#10;Product 2,SKU002,7500,50,Electronics"
                    value={csvContent}
                    onChangeText={setCsvContent}
                    multiline
                    numberOfLines={10}
                    placeholderTextColor="#9CA3AF"
                    textAlignVertical="top"
                  />
                  
                  <TouchableOpacity 
                    style={[styles.parseCsvBtn, !csvContent.trim() && styles.parseCsvBtnDisabled]} 
                    onPress={handleParseCsv}
                    disabled={!csvContent.trim()}
                  >
                    <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.parseCsvBtnText}>Parse CSV & Review</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerInfo}>
              <Text style={styles.footerInfoText}>
                {validRowsCount} product{validRowsCount !== 1 ? 's' : ''} ready to import
              </Text>
            </View>
            
            <View style={styles.footerButtons}>
              <TouchableOpacity style={styles.validateBtn} onPress={handleValidate}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#6B7280" />
                <Text style={styles.validateBtnText}>Validate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.importBtn, (importing || validRowsCount === 0) && styles.importBtnDisabled]} 
                onPress={handleImport}
                disabled={importing || validRowsCount === 0}
              >
                {importing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                    <Text style={styles.importBtnText}>Import Products</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    backgroundColor: '#F9FAFB',
  },
  tabActive: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#2563EB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productRowInvalid: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 8,
  },
  statusBadgeValid: {
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    padding: 4,
    marginRight: 8,
  },
  statusBadgeInvalid: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 4,
    marginRight: 8,
  },
  removeRowBtn: {
    marginLeft: 'auto',
    padding: 6,
  },
  rowError: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 8,
    fontWeight: '500',
  },
  rowFields: {
    gap: 12,
  },
  fieldFullWidth: {
    width: '100%',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  categorySelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  categorySelectText: {
    fontSize: 14,
    color: '#111827',
  },
  categorySelectPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  categoryDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 200,
  },
  categoryDropdownScroll: {
    maxHeight: 200,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryOptionTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#2563EB',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  addRowButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  csvSection: {
    gap: 16,
  },
  csvInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  csvInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  downloadTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563EB',
    gap: 8,
  },
  downloadTemplateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  csvLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  csvTextArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#111827',
    minHeight: 200,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  parseCsvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    gap: 8,
  },
  parseCsvBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  parseCsvBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  footerInfo: {
    marginBottom: 12,
  },
  footerInfoText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  validateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 6,
  },
  validateBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  importBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#10B981',
    gap: 8,
  },
  importBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  importBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
