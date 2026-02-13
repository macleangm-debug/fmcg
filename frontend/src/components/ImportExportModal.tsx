import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api from '../api/client';

interface ImportExportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  exportEndpoint: string;
  importEndpoint: string;
  templateEndpoint?: string;
  entityName: string; // "products" or "inventory items"
}

const COLORS = {
  primary: '#2563EB',
  primaryLight: '#EBF4FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
};

export default function ImportExportModal({
  visible,
  onClose,
  onSuccess,
  title,
  exportEndpoint,
  importEndpoint,
  templateEndpoint,
  entityName,
}: ImportExportModalProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' || width > 768;
  
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Handle file export
  const handleExport = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      const response = await api.get(`${exportEndpoint}?format=${format}`, {
        responseType: 'blob',
      });
      
      const blob = response.data;
      const filename = `${entityName.replace(/\s+/g, '_')}_export.${format === 'excel' ? 'xlsx' : 'csv'}`;
      
      if (Platform.OS === 'web') {
        // Web download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        Alert.alert('Success', `${entityName} exported successfully!`);
      } else {
        // Mobile - use FileSystem and Sharing
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result?.toString().split(',')[1];
          if (base64) {
            const fileUri = FileSystem.documentDirectory + filename;
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri);
            } else {
              Alert.alert('Success', `File saved to ${fileUri}`);
            }
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error.response?.data?.detail || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  // Handle file import
  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) return;

      setImporting(true);
      setImportResult(null);

      // Create FormData for upload
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // For web, fetch the file as blob
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('file', blob, file.name);
      } else {
        // For mobile
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        } as any);
      }

      const uploadResponse = await api.post(importEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResult(uploadResponse.data);
      
      if (uploadResponse.data.success_count > 0) {
        onSuccess();
      }
      
      Alert.alert(
        'Import Complete',
        `Successfully processed ${uploadResponse.data.success_count} ${entityName}.\n${
          uploadResponse.data.error_count > 0 
            ? `${uploadResponse.data.error_count} items had errors.` 
            : ''
        }`
      );
    } catch (error: any) {
      console.error('Import error:', error);
      Alert.alert('Import Failed', error.response?.data?.detail || 'Failed to import file');
    } finally {
      setImporting(false);
    }
  };

  // Handle template download
  const handleDownloadTemplate = async (format: 'csv' | 'excel') => {
    if (!templateEndpoint) return;
    
    setExporting(true);
    try {
      const response = await api.get(`${templateEndpoint}?format=${format}`, {
        responseType: 'blob',
      });
      
      const blob = response.data;
      const filename = `${entityName.replace(/\s+/g, '_')}_template.${format === 'excel' ? 'xlsx' : 'csv'}`;
      
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result?.toString().split(',')[1];
          if (base64) {
            const fileUri = FileSystem.documentDirectory + filename;
            await FileSystem.writeAsStringAsync(fileUri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri);
            }
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to download template');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, isWeb && styles.modalWeb]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {/* Export Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="download-outline" size={18} color={COLORS.primary} /> Export {entityName}
            </Text>
            <Text style={styles.hint}>Download your current {entityName} data</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.exportBtn}
                onPress={() => handleExport('csv')}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.exportBtnText}>CSV</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.exportBtn}
                onPress={() => handleExport('excel')}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={COLORS.success} />
                ) : (
                  <>
                    <Ionicons name="grid-outline" size={24} color={COLORS.success} />
                    <Text style={[styles.exportBtnText, { color: COLORS.success }]}>Excel</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Import Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} /> Import {entityName}
            </Text>
            <Text style={styles.hint}>
              Upload a CSV or Excel file. Items with matching SKU will be updated, new items will be created.
            </Text>
            
            {templateEndpoint && (
              <View style={styles.templateRow}>
                <Text style={styles.templateText}>Need a template?</Text>
                <TouchableOpacity onPress={() => handleDownloadTemplate('csv')}>
                  <Text style={styles.templateLink}>Download CSV</Text>
                </TouchableOpacity>
                <Text style={styles.templateText}>or</Text>
                <TouchableOpacity onPress={() => handleDownloadTemplate('excel')}>
                  <Text style={styles.templateLink}>Excel</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.importBtn}
              onPress={handleImport}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={24} color={COLORS.white} />
                  <Text style={styles.importBtnText}>Select File to Import</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Import Result */}
            {importResult && (
              <View style={[
                styles.resultBox,
                importResult.error_count > 0 ? styles.resultWarning : styles.resultSuccess
              ]}>
                <Ionicons 
                  name={importResult.error_count > 0 ? "warning-outline" : "checkmark-circle-outline"} 
                  size={20} 
                  color={importResult.error_count > 0 ? COLORS.warning : COLORS.success} 
                />
                <View style={styles.resultText}>
                  <Text style={styles.resultTitle}>
                    {importResult.success_count} items processed successfully
                  </Text>
                  {importResult.error_count > 0 && (
                    <Text style={styles.resultError}>
                      {importResult.error_count} items had errors
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalWeb: {
    width: 480,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 12,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    gap: 8,
    minHeight: 80,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 16,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  templateText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  templateLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 10,
  },
  importBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 10,
  },
  resultSuccess: {
    backgroundColor: COLORS.successLight,
  },
  resultWarning: {
    backgroundColor: COLORS.warningLight,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  resultError: {
    fontSize: 12,
    color: COLORS.warning,
    marginTop: 2,
  },
  closeButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray,
  },
});
