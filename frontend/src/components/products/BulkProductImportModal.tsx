import React, { useState, useRef, useEffect } from 'react';
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
import * as XLSX from 'xlsx';
import { businessSettingsApi } from '../../api/client';

interface Category {
  id: string;
  name: string;
}

interface BulkProductRow {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  category_id: string;
  category_name: string;
  status: 'pending' | 'valid' | 'invalid';
  error?: string;
}

interface BulkProductImportModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  onImport: (products: any[]) => Promise<{ success: number; failed: number }>;
  formatCurrency: (amount: number) => string;
}

const generateRowId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createEmptyRow = (): BulkProductRow => ({
  id: generateRowId(),
  name: '',
  sku: '',
  price: '',
  stock: '',
  category_id: '',
  category_name: '',
  status: 'pending',
});

const BulkProductImportModal: React.FC<BulkProductImportModalProps> = ({
  visible,
  onClose,
  categories,
  onImport,
  formatCurrency,
}) => {
  const [rows, setRows] = useState<BulkProductRow[]>([createEmptyRow()]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'file'>('manual');
  const [csvContent, setCsvContent] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showSkuFormatModal, setShowSkuFormatModal] = useState(false);
  const [skuFormat, setSkuFormat] = useState<'auto' | 'prefix' | 'custom'>('auto');
  const [skuPrefix, setSkuPrefix] = useState('SKU');
  const [skuCounter, setSkuCounter] = useState(1);
  const [skuSeparator, setSkuSeparator] = useState('-');
  const [skuDigits, setSkuDigits] = useState(4);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isWeb = Platform.OS === 'web';

  // Load SKU settings from business settings
  useEffect(() => {
    const loadSkuSettings = async () => {
      if (visible && !settingsLoaded) {
        try {
          const response = await businessSettingsApi.get();
          const settings = response.data;
          
          if (settings) {
            // Map settings format to our format
            const format = settings.sku_format || 'prefix_number';
            if (format === 'prefix_number') setSkuFormat('prefix');
            else if (format === 'custom') setSkuFormat('custom');
            else setSkuFormat('auto');
            
            setSkuPrefix(settings.sku_prefix || 'SKU');
            setSkuCounter(parseInt(settings.sku_start_number) || 1);
            setSkuSeparator(settings.sku_separator || '-');
            setSkuDigits(parseInt(settings.sku_digits) || 4);
          }
          setSettingsLoaded(true);
        } catch (error) {
          console.log('Could not load SKU settings, using defaults');
          setSettingsLoaded(true);
        }
      }
    };
    
    loadSkuSettings();
  }, [visible, settingsLoaded]);

  // Generate SKU based on format
  const generateSku = (index: number): string => {
    const paddedNum = String(skuCounter + index).padStart(skuDigits, '0');
    switch (skuFormat) {
      case 'auto':
        return `SKU${paddedNum}`;
      case 'prefix':
        return `${skuPrefix}${skuSeparator}${paddedNum}`;
      case 'custom':
        return ''; // User enters manually
      default:
        return '';
    }
  };

  // Apply SKU format to all empty SKU rows
  const applySkuFormat = () => {
    setRows(prevRows => {
      let counter = 0;
      return prevRows.map(row => {
        if (!row.sku && skuFormat !== 'custom') {
          const newSku = generateSku(counter);
          counter++;
          return { ...row, sku: newSku };
        }
        return row;
      });
    });
    setShowSkuFormatModal(false);
  };

  // Handle Excel/CSV file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Handle Excel file
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
        
        if (jsonData.length < 2) {
          Alert.alert('Error', 'Excel file must have a header row and at least one data row');
          return;
        }
        
        parseSpreadsheetData(jsonData);
      } else if (fileExtension === 'csv') {
        // Handle CSV file
        const text = await file.text();
        setCsvContent(text);
        handleParseCsvContent(text);
      } else {
        Alert.alert('Error', 'Please upload an Excel (.xlsx, .xls) or CSV file');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to read file: ' + error.message);
    } finally {
      setUploadingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Parse spreadsheet data (works for both Excel and CSV)
  const parseSpreadsheetData = (data: string[][]) => {
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    
    // Map header names to indices
    const nameIdx = headers.findIndex(h => h.includes('name') || h === 'product');
    const skuIdx = headers.findIndex(h => h.includes('sku') || h === 'code' || h === 'barcode');
    const priceIdx = headers.findIndex(h => h.includes('price') || h === 'cost');
    const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('quantity') || h === 'qty');
    const categoryIdx = headers.findIndex(h => h.includes('category') || h === 'cat');

    if (nameIdx === -1) {
      Alert.alert('Error', 'File must have a "name" or "product" column');
      return;
    }
    if (priceIdx === -1) {
      Alert.alert('Error', 'File must have a "price" column');
      return;
    }

    const parsedRows: BulkProductRow[] = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      
      const name = nameIdx >= 0 ? String(row[nameIdx] || '').trim() : '';
      if (!name) continue;
      
      // Try to match category by name
      let categoryId = '';
      let categoryName = '';
      if (categoryIdx >= 0 && row[categoryIdx]) {
        const catName = String(row[categoryIdx]).toLowerCase().trim();
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
        sku: skuIdx >= 0 ? String(row[skuIdx] || '').trim() : '',
        price: priceIdx >= 0 ? String(row[priceIdx] || '').replace(/[^0-9.]/g, '') : '',
        stock: stockIdx >= 0 ? String(row[stockIdx] || '').replace(/[^0-9]/g, '') : '',
        category_id: categoryId,
        category_name: categoryName,
        status: 'pending',
      });
    }

    if (parsedRows.length === 0) {
      Alert.alert('Error', 'No valid product rows found in file');
      return;
    }

    setRows(parsedRows);
    setActiveTab('manual'); // Switch to manual tab to review
    Alert.alert('File Imported', `${parsedRows.length} products imported. Please review and set categories if needed.`);
  };

  // Parse CSV content from text
  const handleParseCsvContent = (content: string) => {
    const lines = content.trim().split('\n');
    const data = lines.map(line => line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, '')));
    parseSpreadsheetData(data);
  };

  // Download Excel template
  const handleDownloadTemplate = () => {
    if (isWeb) {
      // Create Excel template
      const templateData = [
        ['name', 'sku', 'price', 'stock', 'category'],
        ['Sample Product', 'SKU001', '5000', '100', 'General'],
        ['Another Product', 'SKU002', '7500', '50', 'Electronics']
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, 'product_import_template.xlsx');
    } else {
      Alert.alert('Template', 'Excel Format:\nColumns: name, sku, price, stock, category\n\nExample:\nSample Product, SKU001, 5000, 100, General');
    }
  };

  // Add a new empty row
  const handleAddRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  // Remove a row
  const handleRemoveRow = (rowId: string) => {
    if (rows.length === 1) {
      // Don't remove the last row, just clear it
      setRows([createEmptyRow()]);
    } else {
      setRows(rows.filter(r => r.id !== rowId));
    }
  };

  // Update a field in a row
  const handleUpdateRow = (rowId: string, field: keyof BulkProductRow, value: string) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value, status: 'pending' as const };
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
  const validateRow = (row: BulkProductRow): { valid: boolean; error?: string } => {
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
        return { ...row, status: 'pending' as const };
      }
      const validation = validateRow(row);
      return {
        ...row,
        status: validation.valid ? 'valid' as const : 'invalid' as const,
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
    } catch (error: any) {
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

  // Don't render anything if not visible
  if (!visible) {
    return null;
  }

  // Modal content that will be shown in both native Modal and web portal
  const modalContent = (
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
              style={[styles.tab, activeTab === 'file' && styles.tabActive]}
              onPress={() => setActiveTab('file')}
            >
              <Ionicons 
                name="cloud-upload-outline" 
                size={18} 
                color={activeTab === 'file' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'file' && styles.tabTextActive]}>
                Import File
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
                          <View style={styles.skuLabelRow}>
                            <Text style={styles.fieldLabel}>SKU / Barcode</Text>
                            <TouchableOpacity 
                              style={styles.skuFormatBtn}
                              onPress={() => setShowSkuFormatModal(true)}
                            >
                              <Ionicons name="settings-outline" size={14} color="#2563EB" />
                              <Text style={styles.skuFormatBtnText}>Format</Text>
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            style={styles.fieldInput}
                            placeholder={skuFormat === 'custom' ? 'Enter SKU' : generateSku(rows.indexOf(row))}
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
                      
                      <View style={[styles.fieldRow, { zIndex: 10 }]}>
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
                        <View style={[styles.fieldHalf, { zIndex: showCategoryPicker === row.id ? 100 : 1 }]}>
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
                {/* File Import Tab */}
                <View style={styles.fileImportSection}>
                  <View style={styles.fileImportInfo}>
                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                    <Text style={styles.fileImportInfoText}>
                      Upload an Excel (.xlsx) or CSV file with columns: name, sku, price, stock, category
                    </Text>
                  </View>
                  
                  <TouchableOpacity style={styles.downloadTemplateBtn} onPress={handleDownloadTemplate}>
                    <Ionicons name="download-outline" size={18} color="#2563EB" />
                    <Text style={styles.downloadTemplateBtnText}>Download Excel Template</Text>
                  </TouchableOpacity>

                  {/* Hidden file input for web */}
                  {isWeb && (
                    <input
                      ref={fileInputRef as any}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload as any}
                      style={{ display: 'none' }}
                    />
                  )}
                  
                  <TouchableOpacity 
                    style={styles.uploadFileBtn}
                    onPress={() => {
                      if (isWeb && fileInputRef.current) {
                        fileInputRef.current.click();
                      } else {
                        Alert.alert('File Upload', 'File upload is only available on web platform');
                      }
                    }}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
                        <Text style={styles.uploadFileBtnText}>Choose Excel or CSV File</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <Text style={styles.fileImportHint}>
                    Supported formats: .xlsx, .xls, .csv
                  </Text>

                  <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  
                  <Text style={styles.csvLabel}>Paste CSV Content:</Text>
                  <TextInput
                    style={styles.csvTextArea}
                    placeholder="name,sku,price,stock,category&#10;Product 1,SKU001,5000,100,General&#10;Product 2,SKU002,7500,50,Electronics"
                    value={csvContent}
                    onChangeText={setCsvContent}
                    multiline
                    numberOfLines={6}
                    placeholderTextColor="#9CA3AF"
                    textAlignVertical="top"
                  />
                  
                  <TouchableOpacity 
                    style={[styles.parseCsvBtn, !csvContent.trim() && styles.parseCsvBtnDisabled]} 
                    onPress={() => handleParseCsvContent(csvContent)}
                    disabled={!csvContent.trim()}
                  >
                    <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.parseCsvBtnText}>Parse & Review</Text>
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

        {/* SKU Format Modal */}
        {showSkuFormatModal && (
          <View style={styles.skuFormatOverlay}>
            <View style={styles.skuFormatModal}>
              <View style={styles.skuFormatHeader}>
                <Text style={styles.skuFormatTitle}>SKU Format</Text>
                <TouchableOpacity onPress={() => setShowSkuFormatModal(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.skuFormatSubtitle}>
                Choose how SKU codes should be generated
              </Text>

              <View style={styles.skuFormatOptions}>
                <TouchableOpacity
                  style={[styles.skuFormatOption, skuFormat === 'auto' && styles.skuFormatOptionActive]}
                  onPress={() => setSkuFormat('auto')}
                >
                  <View style={styles.skuFormatOptionRadio}>
                    {skuFormat === 'auto' && <View style={styles.skuFormatOptionRadioInner} />}
                  </View>
                  <View style={styles.skuFormatOptionContent}>
                    <Text style={styles.skuFormatOptionTitle}>Auto-generate</Text>
                    <Text style={styles.skuFormatOptionDesc}>SKU00001, SKU00002, ...</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.skuFormatOption, skuFormat === 'prefix' && styles.skuFormatOptionActive]}
                  onPress={() => setSkuFormat('prefix')}
                >
                  <View style={styles.skuFormatOptionRadio}>
                    {skuFormat === 'prefix' && <View style={styles.skuFormatOptionRadioInner} />}
                  </View>
                  <View style={styles.skuFormatOptionContent}>
                    <Text style={styles.skuFormatOptionTitle}>Custom Prefix</Text>
                    <Text style={styles.skuFormatOptionDesc}>{skuPrefix}-0001, {skuPrefix}-0002, ...</Text>
                  </View>
                </TouchableOpacity>

                {skuFormat === 'prefix' && (
                  <View style={styles.skuPrefixInputContainer}>
                    <Text style={styles.skuPrefixLabel}>Prefix:</Text>
                    <TextInput
                      style={styles.skuPrefixInput}
                      value={skuPrefix}
                      onChangeText={setSkuPrefix}
                      placeholder="e.g. PROD, BEV, FD"
                      placeholderTextColor="#9CA3AF"
                      maxLength={10}
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.skuFormatOption, skuFormat === 'custom' && styles.skuFormatOptionActive]}
                  onPress={() => setSkuFormat('custom')}
                >
                  <View style={styles.skuFormatOptionRadio}>
                    {skuFormat === 'custom' && <View style={styles.skuFormatOptionRadioInner} />}
                  </View>
                  <View style={styles.skuFormatOptionContent}>
                    <Text style={styles.skuFormatOptionTitle}>Enter Manually</Text>
                    <Text style={styles.skuFormatOptionDesc}>I'll enter each SKU myself</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.skuStartingContainer}>
                <Text style={styles.skuStartingLabel}>Starting number:</Text>
                <TextInput
                  style={styles.skuStartingInput}
                  value={String(skuCounter)}
                  onChangeText={(v) => setSkuCounter(parseInt(v) || 1)}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.skuFormatActions}>
                <TouchableOpacity 
                  style={styles.skuFormatCancelBtn}
                  onPress={() => setShowSkuFormatModal(false)}
                >
                  <Text style={styles.skuFormatCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.skuFormatApplyBtn}
                  onPress={applySkuFormat}
                >
                  <Text style={styles.skuFormatApplyBtnText}>Apply to All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
  );

  // Use React Native Modal for both web and native
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      {modalContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '95%',
    maxWidth: 600,
    maxHeight: '90%',
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
    zIndex: 1,
  },
  fieldHalf: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
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
  fileImportSection: {
    gap: 16,
  },
  fileImportInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  fileImportInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  uploadFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    backgroundColor: '#10B981',
    gap: 10,
  },
  uploadFileBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fileImportHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
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
  // SKU Label Row
  skuLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  skuFormatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  skuFormatBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  // SKU Format Modal
  skuFormatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  skuFormatModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  skuFormatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skuFormatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  skuFormatSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  skuFormatOptions: {
    gap: 12,
    marginBottom: 20,
  },
  skuFormatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  skuFormatOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  skuFormatOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skuFormatOptionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  skuFormatOptionContent: {
    flex: 1,
  },
  skuFormatOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  skuFormatOptionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  skuPrefixInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 44,
    gap: 12,
  },
  skuPrefixLabel: {
    fontSize: 14,
    color: '#374151',
  },
  skuPrefixInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
  },
  skuStartingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  skuStartingLabel: {
    fontSize: 14,
    color: '#374151',
  },
  skuStartingInput: {
    width: 80,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
  },
  skuFormatActions: {
    flexDirection: 'row',
    gap: 12,
  },
  skuFormatCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  skuFormatCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  skuFormatApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  skuFormatApplyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BulkProductImportModal;
