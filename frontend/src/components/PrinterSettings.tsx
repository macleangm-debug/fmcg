import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { printerService, PrinterConfig, PrinterType } from '../services/printerService';

const PRINTER_CONFIG_KEY = 'printer_config';

export default function PrinterSettings() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  
  const [config, setConfig] = useState<PrinterConfig>({
    type: 'network',
    name: 'Receipt Printer',
    address: '',
    paperWidth: 80,
    enabled: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    loadConfig();
  }, []);
  
  const loadConfig = async () => {
    try {
      const saved = await AsyncStorage.getItem(PRINTER_CONFIG_KEY);
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        setConfig(parsedConfig);
        printerService.setConfig(parsedConfig);
      }
    } catch (error) {
      console.error('Failed to load printer config:', error);
    }
  };
  
  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(config));
      printerService.setConfig(config);
      Alert.alert('Success', 'Printer settings saved');
    } catch (error) {
      console.error('Failed to save printer config:', error);
      Alert.alert('Error', 'Failed to save printer settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  const testPrinter = async () => {
    if (!config.address) {
      Alert.alert('Error', 'Please enter a printer address');
      return;
    }
    
    setIsTesting(true);
    printerService.setConfig({ ...config, enabled: true });
    
    try {
      const success = await printerService.testConnection();
      if (success) {
        Alert.alert('Success', 'Test page sent to printer');
      } else {
        Alert.alert('Failed', 'Could not print test page. Check printer connection.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect to printer');
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Thermal Printer Section */}
      <Text style={styles.sectionTitle}>Thermal Printer</Text>
      
      {/* Enable Printer */}
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.fieldLabel}>Enable Printer</Text>
          <Text style={styles.fieldHint}>Print receipts automatically after each sale</Text>
        </View>
        <Switch
          value={config.enabled}
          onValueChange={(value) => setConfig({ ...config, enabled: value })}
          trackColor={{ false: '#E5E7EB', true: '#10B981' }}
          thumbColor="#FFFFFF"
        />
      </View>
      
      {/* Connection Type */}
      <Text style={styles.fieldLabel}>Connection Type</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="wifi-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
        <View style={styles.segmentedControl}>
          {(['network', 'bluetooth', 'usb'] as PrinterType[]).map((type, index) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.segment,
                config.type === type && styles.segmentActive,
                index === 0 && styles.segmentFirst,
                index === 2 && styles.segmentLast,
              ]}
              onPress={() => setConfig({ ...config, type })}
            >
              <Text style={[
                styles.segmentText,
                config.type === type && styles.segmentTextActive,
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Printer Name */}
      <Text style={styles.fieldLabel}>Printer Name</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="print-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={config.name}
          onChangeText={(value) => setConfig({ ...config, name: value })}
          placeholder="Enter printer name"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      {/* IP Address */}
      <Text style={styles.fieldLabel}>
        {config.type === 'network' ? 'IP Address:Port' : 
         config.type === 'bluetooth' ? 'MAC Address' : 'Device Path'}
      </Text>
      <View style={styles.inputContainer}>
        <Ionicons name="globe-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={config.address}
          onChangeText={(value) => setConfig({ ...config, address: value })}
          placeholder={config.type === 'network' ? '192.168.1.100:9100' : 'XX:XX:XX:XX:XX:XX'}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
        />
      </View>
      {config.type === 'network' && (
        <Text style={styles.helperText}>Default port for most thermal printers is 9100</Text>
      )}
      
      {/* Paper Width */}
      <Text style={styles.fieldLabel}>Paper Width</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="document-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
        <View style={styles.paperWidthContainer}>
          {([58, 80] as const).map((paperWidth) => (
            <TouchableOpacity
              key={paperWidth}
              style={[
                styles.paperOption,
                config.paperWidth === paperWidth && styles.paperOptionActive,
              ]}
              onPress={() => setConfig({ ...config, paperWidth })}
            >
              <Text style={[
                styles.paperOptionText,
                config.paperWidth === paperWidth && styles.paperOptionTextActive,
              ]}>
                {paperWidth}mm
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={testPrinter}
          disabled={isTesting}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <>
              <Ionicons name="print-outline" size={18} color="#3B82F6" />
              <Text style={styles.testButtonText}>Test</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveConfig}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 12,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  segmentLast: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#EFF6FF',
  },
  segmentText: {
    fontSize: 14,
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  paperWidthContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  paperOption: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  paperOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  paperOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  paperOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    maxWidth: 120,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 120,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
