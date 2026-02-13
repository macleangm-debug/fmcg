import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/client';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  secondary: '#3B82F6',
  secondaryLight: '#DBEAFE',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface Theme {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  button_style: string;
  font_family: string;
  logo_url?: string;
  is_active: boolean;
  created_at?: string;
}

interface Preset {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  button_style: string;
  font_family: string;
}

export default function CheckoutThemesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<Partial<Theme> | null>(null);

  // Form state
  const [themeName, setThemeName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#10B981');
  const [secondaryColor, setSecondaryColor] = useState('#3B82F6');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [textColor, setTextColor] = useState('#111827');
  const [buttonStyle, setButtonStyle] = useState('rounded');
  const [fontFamily, setFontFamily] = useState('Inter');

  const fetchThemes = useCallback(async () => {
    try {
      const [themesRes, presetsRes] = await Promise.all([
        api.get('/kwikpay/checkout-themes'),
        api.get('/kwikpay/checkout-themes/presets'),
      ]);
      setThemes(themesRes.data?.themes || []);
      setPresets(presetsRes.data?.presets || []);
    } catch (error) {
      console.error('Error fetching themes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const handleCreateTheme = async () => {
    if (!themeName) {
      Alert.alert('Error', 'Please enter a theme name');
      return;
    }

    setCreating(true);
    try {
      await api.post('/kwikpay/checkout-themes', {
        name: themeName,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor,
        text_color: textColor,
        button_style: buttonStyle,
        font_family: fontFamily,
      });
      Alert.alert('Success', 'Theme created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchThemes();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create theme');
    } finally {
      setCreating(false);
    }
  };

  const handleActivateTheme = async (themeId: string) => {
    try {
      await api.post(`/kwikpay/checkout-themes/${themeId}/activate`);
      Alert.alert('Success', 'Theme activated');
      fetchThemes();
    } catch (error) {
      Alert.alert('Error', 'Failed to activate theme');
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    Alert.alert('Delete Theme', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/kwikpay/checkout-themes/${themeId}`);
            fetchThemes();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete theme');
          }
        },
      },
    ]);
  };

  const applyPreset = (preset: Preset) => {
    setThemeName(preset.name);
    setPrimaryColor(preset.primary_color);
    setSecondaryColor(preset.secondary_color);
    setBackgroundColor(preset.background_color);
    setTextColor(preset.text_color);
    setButtonStyle(preset.button_style);
    setFontFamily(preset.font_family);
  };

  const resetForm = () => {
    setThemeName('');
    setPrimaryColor('#10B981');
    setSecondaryColor('#3B82F6');
    setBackgroundColor('#FFFFFF');
    setTextColor('#111827');
    setButtonStyle('rounded');
    setFontFamily('Inter');
  };

  const openPreview = (theme: Partial<Theme>) => {
    setPreviewTheme(theme);
    setShowPreviewModal(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading themes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchThemes(); }} />
        }
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Checkout Themes</Text>
            <Text style={styles.pageSubtitle}>Customize your payment page appearance</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => { resetForm(); setShowCreateModal(true); }}
            data-testid="create-theme-btn"
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.createButtonText}>New Theme</Text>
          </TouchableOpacity>
        </View>

        {/* Active Theme */}
        <Text style={styles.sectionTitle}>Active Theme</Text>
        {themes.find(t => t.is_active) ? (
          <View style={styles.activeThemeCard}>
            <View style={styles.themePreviewBox} data-testid="active-theme">
              <View style={[styles.previewHeader, { backgroundColor: themes.find(t => t.is_active)?.primary_color }]}>
                <Text style={styles.previewHeaderText}>
                  {themes.find(t => t.is_active)?.name}
                </Text>
              </View>
              <View style={[styles.previewBody, { backgroundColor: themes.find(t => t.is_active)?.background_color }]}>
                <View style={[styles.previewButton, { backgroundColor: themes.find(t => t.is_active)?.primary_color, borderRadius: themes.find(t => t.is_active)?.button_style === 'pill' ? 20 : themes.find(t => t.is_active)?.button_style === 'square' ? 0 : 8 }]}>
                  <Text style={styles.previewButtonText}>Pay Now</Text>
                </View>
              </View>
            </View>
            <View style={styles.activeThemeInfo}>
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
              <Text style={styles.fontLabel}>Font: {themes.find(t => t.is_active)?.font_family}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.defaultThemeCard}>
            <Ionicons name="color-palette-outline" size={32} color={COLORS.gray} />
            <Text style={styles.defaultText}>Using default theme</Text>
          </View>
        )}

        {/* Theme Presets */}
        <Text style={styles.sectionTitle}>Quick Start Presets</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={styles.presetCard}
              onPress={() => { applyPreset(preset); setShowCreateModal(true); }}
              data-testid={`preset-${preset.id}`}
            >
              <View style={[styles.presetPreview, { backgroundColor: preset.background_color }]}>
                <View style={[styles.presetHeader, { backgroundColor: preset.primary_color }]} />
                <View style={[styles.presetButton, { backgroundColor: preset.primary_color, borderRadius: preset.button_style === 'pill' ? 12 : preset.button_style === 'square' ? 0 : 4 }]} />
              </View>
              <Text style={styles.presetName}>{preset.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Custom Themes */}
        <Text style={styles.sectionTitle}>Your Themes ({themes.length})</Text>
        {themes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="color-palette-outline" size={48} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Custom Themes</Text>
            <Text style={styles.emptyText}>Create a theme from presets or from scratch</Text>
          </View>
        ) : (
          themes.map((theme) => (
            <View key={theme.id} style={styles.themeCard} data-testid={`theme-card-${theme.id}`}>
              <View style={styles.themeCardHeader}>
                <View style={styles.colorDots}>
                  <View style={[styles.colorDot, { backgroundColor: theme.primary_color }]} />
                  <View style={[styles.colorDot, { backgroundColor: theme.secondary_color }]} />
                  <View style={[styles.colorDot, { backgroundColor: theme.background_color, borderWidth: 1, borderColor: COLORS.border }]} />
                </View>
                <View style={styles.themeInfo}>
                  <Text style={styles.themeName}>{theme.name}</Text>
                  <Text style={styles.themeFont}>{theme.font_family} · {theme.button_style}</Text>
                </View>
                {theme.is_active && (
                  <View style={styles.activeTag}>
                    <Text style={styles.activeTagText}>Active</Text>
                  </View>
                )}
              </View>
              <View style={styles.themeActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openPreview(theme)}>
                  <Ionicons name="eye-outline" size={16} color={COLORS.secondary} />
                  <Text style={[styles.actionBtnText, { color: COLORS.secondary }]}>Preview</Text>
                </TouchableOpacity>
                {!theme.is_active && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleActivateTheme(theme.id)}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Activate</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteTheme(theme.id)}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Theme</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Theme Name *</Text>
              <TextInput
                style={styles.input}
                value={themeName}
                onChangeText={setThemeName}
                placeholder="My Custom Theme"
                placeholderTextColor={COLORS.gray}
              />

              <Text style={styles.inputLabel}>Primary Color</Text>
              <View style={styles.colorInputRow}>
                <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={primaryColor}
                  onChangeText={setPrimaryColor}
                  placeholder="#10B981"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <Text style={styles.inputLabel}>Secondary Color</Text>
              <View style={styles.colorInputRow}>
                <View style={[styles.colorPreview, { backgroundColor: secondaryColor }]} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={secondaryColor}
                  onChangeText={setSecondaryColor}
                  placeholder="#3B82F6"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <Text style={styles.inputLabel}>Background Color</Text>
              <View style={styles.colorInputRow}>
                <View style={[styles.colorPreview, { backgroundColor: backgroundColor, borderWidth: 1, borderColor: COLORS.border }]} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={backgroundColor}
                  onChangeText={setBackgroundColor}
                  placeholder="#FFFFFF"
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <Text style={styles.inputLabel}>Button Style</Text>
              <View style={styles.buttonStyleRow}>
                {['rounded', 'square', 'pill'].map((style) => (
                  <TouchableOpacity
                    key={style}
                    style={[styles.buttonStyleOption, buttonStyle === style && styles.buttonStyleSelected]}
                    onPress={() => setButtonStyle(style)}
                  >
                    <View style={[styles.buttonStylePreview, { borderRadius: style === 'pill' ? 20 : style === 'square' ? 0 : 8 }]} />
                    <Text style={[styles.buttonStyleText, buttonStyle === style && styles.buttonStyleTextSelected]}>
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Font Family</Text>
              <View style={styles.fontRow}>
                {['Inter', 'Poppins', 'System'].map((font) => (
                  <TouchableOpacity
                    key={font}
                    style={[styles.fontOption, fontFamily === font && styles.fontSelected]}
                    onPress={() => setFontFamily(font)}
                  >
                    <Text style={[styles.fontOptionText, fontFamily === font && styles.fontSelectedText]}>{font}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Live Preview */}
              <Text style={styles.inputLabel}>Preview</Text>
              <View style={[styles.livePreview, { backgroundColor }]}>
                <View style={[styles.livePreviewHeader, { backgroundColor: primaryColor }]}>
                  <Text style={styles.livePreviewTitle}>Checkout</Text>
                </View>
                <View style={styles.livePreviewBody}>
                  <Text style={[styles.livePreviewText, { color: textColor }]}>Amount: TZS 50,000</Text>
                  <View style={[styles.livePreviewButton, { backgroundColor: primaryColor, borderRadius: buttonStyle === 'pill' ? 20 : buttonStyle === 'square' ? 0 : 8 }]}>
                    <Text style={styles.livePreviewButtonText}>Pay Now</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, creating && styles.submitButtonDisabled]}
                onPress={handleCreateTheme}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Create Theme</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={showPreviewModal} transparent animationType="fade">
        <View style={styles.previewModalOverlay}>
          <View style={[styles.previewModalContent, { backgroundColor: previewTheme?.background_color || '#FFFFFF' }]}>
            <View style={[styles.previewModalHeader, { backgroundColor: previewTheme?.primary_color || COLORS.primary }]}>
              <Text style={styles.previewModalHeaderText}>Payment</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <View style={styles.previewModalBody}>
              <Text style={[styles.previewModalLabel, { color: previewTheme?.text_color || COLORS.dark }]}>Amount</Text>
              <Text style={[styles.previewModalAmount, { color: previewTheme?.text_color || COLORS.dark }]}>TZS 50,000</Text>
              <View style={styles.previewModalInput}>
                <Text style={styles.previewModalInputText}>Phone Number</Text>
              </View>
              <TouchableOpacity style={[styles.previewModalButton, { backgroundColor: previewTheme?.primary_color || COLORS.primary, borderRadius: previewTheme?.button_style === 'pill' ? 25 : previewTheme?.button_style === 'square' ? 0 : 12 }]}>
                <Text style={styles.previewModalButtonText}>Pay with M-Pesa</Text>
              </TouchableOpacity>
              <Text style={styles.previewModalPowered}>Powered by KwikPay</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: COLORS.dark },
  pageSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 6 },
  createButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginBottom: 16, marginTop: 8 },
  activeThemeCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 24 },
  themePreviewBox: { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  previewHeader: { height: 40, justifyContent: 'center', alignItems: 'center' },
  previewHeaderText: { color: COLORS.white, fontWeight: '600' },
  previewBody: { padding: 20, alignItems: 'center' },
  previewButton: { paddingHorizontal: 24, paddingVertical: 12 },
  previewButtonText: { color: COLORS.white, fontWeight: '600' },
  activeThemeInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeBadgeText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  fontLabel: { fontSize: 13, color: COLORS.gray },
  defaultThemeCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 30, alignItems: 'center', marginBottom: 24 },
  defaultText: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  presetsRow: { marginBottom: 24 },
  presetCard: { width: 100, marginRight: 12 },
  presetPreview: { height: 80, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  presetHeader: { height: 24 },
  presetButton: { width: 50, height: 20, marginTop: 16, alignSelf: 'center' },
  presetName: { fontSize: 12, fontWeight: '500', color: COLORS.dark, textAlign: 'center' },
  themeCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  themeCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  colorDots: { flexDirection: 'row', gap: 6 },
  colorDot: { width: 20, height: 20, borderRadius: 10 },
  themeInfo: { flex: 1, marginLeft: 12 },
  themeName: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  themeFont: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  activeTag: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeTagText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  themeActions: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: COLORS.white, borderRadius: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.dark, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.dark, marginBottom: 8 },
  input: { backgroundColor: COLORS.lightGray, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12, fontSize: 15, color: COLORS.dark, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  colorInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  colorPreview: { width: 44, height: 44, borderRadius: 8 },
  buttonStyleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  buttonStyleOption: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  buttonStyleSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  buttonStylePreview: { width: 40, height: 16, backgroundColor: COLORS.primary, marginBottom: 8 },
  buttonStyleText: { fontSize: 12, color: COLORS.gray },
  buttonStyleTextSelected: { color: COLORS.primary, fontWeight: '600' },
  fontRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  fontOption: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  fontSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  fontOptionText: { fontSize: 14, color: COLORS.gray },
  fontSelectedText: { color: COLORS.primary, fontWeight: '600' },
  livePreview: { borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  livePreviewHeader: { padding: 16 },
  livePreviewTitle: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  livePreviewBody: { padding: 20 },
  livePreviewText: { fontSize: 14, marginBottom: 16 },
  livePreviewButton: { padding: 14, alignItems: 'center' },
  livePreviewButtonText: { color: COLORS.white, fontWeight: '600' },
  submitButton: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  previewModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  previewModalContent: { width: '100%', maxWidth: 360, borderRadius: 16, overflow: 'hidden' },
  previewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  previewModalHeaderText: { color: COLORS.white, fontWeight: '600', fontSize: 18 },
  previewModalBody: { padding: 24 },
  previewModalLabel: { fontSize: 14, marginBottom: 4 },
  previewModalAmount: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  previewModalInput: { backgroundColor: COLORS.lightGray, padding: 16, borderRadius: 12, marginBottom: 20 },
  previewModalInputText: { color: COLORS.gray },
  previewModalButton: { padding: 16, alignItems: 'center', marginBottom: 16 },
  previewModalButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  previewModalPowered: { fontSize: 12, color: COLORS.gray, textAlign: 'center' },
});
