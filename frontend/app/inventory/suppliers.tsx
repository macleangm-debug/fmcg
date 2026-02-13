import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const COLORS = {
  primary: '#059669',
  primaryLight: '#D1FAE5',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
};

export default function SuppliersScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;

  const renderContent = () => (
    <View style={styles.comingSoonCard}>
      <View style={styles.iconContainer}>
        <Ionicons name="business" size={64} color={COLORS.primary} />
      </View>
      <View style={styles.badge}>
        <Ionicons name="time-outline" size={16} color={COLORS.warning} />
        <Text style={styles.badgeText}>Coming Soon</Text>
      </View>
      <Text style={styles.title}>Supplier Management</Text>
      <Text style={styles.description}>
        Manage your suppliers, track vendor information, and streamline your procurement process.
      </Text>
      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
          <Text style={styles.featureText}>Supplier profiles and contacts</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
          <Text style={styles.featureText}>Purchase history tracking</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
          <Text style={styles.featureText}>Payment terms management</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
          <Text style={styles.featureText}>Performance ratings</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={isWeb ? [] : ['top']}>
      {isWeb && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Suppliers</Text>
            <Text style={styles.webPageSubtitle}>Manage your suppliers</Text>
          </View>
          <TouchableOpacity style={styles.webCreateBtn} disabled>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.webCreateBtnText}>Add Supplier</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Suppliers</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            <ScrollView contentContainerStyle={styles.comingSoonContent}>
              {renderContent()}
            </ScrollView>
          </View>
        </View>
      ) : (
        <View style={styles.mobileContent}>
          <View style={styles.mobileCardContainer}>
            <ScrollView contentContainerStyle={styles.comingSoonContent}>
              {renderContent()}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  webPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webPageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  webPageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  webCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    opacity: 0.5,
  },
  webCreateBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  webContentWrapper: { flex: 1, padding: 24 },
  webWhiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.dark },
  mobileContent: { flex: 1, padding: 16 },
  mobileCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  comingSoonContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 400 },
  comingSoonCard: { alignItems: 'center', maxWidth: 400, width: '100%' },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: { fontSize: 13, fontWeight: '600', color: COLORS.warning },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.dark, marginBottom: 12, textAlign: 'center' },
  description: { fontSize: 15, color: COLORS.gray, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  featureList: { width: '100%', gap: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15, color: COLORS.dark },
});
