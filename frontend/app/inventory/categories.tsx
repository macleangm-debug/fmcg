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
import { useRouter } from 'expo-router';
import WebModal from '../../src/components/WebModal';
import api from '../../src/api/client';

const INVENTORY_THEME = {
  primary: '#10B981',
  dark: '#111827',
  gray: '#6B7280',
  danger: '#EF4444',
};

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  item_count: number;
}

export default function InventoryCategories() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/inventory/categories');
      setCategories(res.data);
    } catch (error) {
      console.log('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.post('/inventory/categories', {
        name: newName,
        description: newDescription,
      });
      setShowAddModal(false);
      setNewName('');
      setNewDescription('');
      fetchCategories();
      Alert.alert('Success', 'Category created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      await api.delete(`/inventory/categories/${categoryToDelete.id}`);
      setShowConfirmDelete(false);
      setCategoryToDelete(null);
      fetchCategories();
      Alert.alert('Success', 'Category deleted successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete category');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={INVENTORY_THEME.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={INVENTORY_THEME.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INVENTORY_THEME.primary} />}
      >
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={64} color={INVENTORY_THEME.gray} />
            <Text style={styles.emptyText}>No categories yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
              <Text style={styles.emptyBtnText}>Create First Category</Text>
            </TouchableOpacity>
          </View>
        ) : (
          categories.map((cat) => (
            <View key={cat.id} style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}20` }]}>
                <Ionicons name="folder" size={24} color={cat.color} />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryDesc}>{cat.item_count} items</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteIconBtn}
                onPress={() => { setCategoryToDelete(cat); setShowConfirmDelete(true); }}
              >
                <Ionicons name="trash-outline" size={20} color={INVENTORY_THEME.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Add Category Modal */}
      <WebModal visible={showAddModal} onClose={() => setShowAddModal(false)} title="New Category">
        <Text style={styles.inputLabel}>Category Name *</Text>
        <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="Enter category name" />
        
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={newDescription} onChangeText={setNewDescription} placeholder="Optional description" multiline numberOfLines={3} />
        
        <TouchableOpacity style={styles.submitBtn} onPress={handleAddCategory} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Create Category</Text>}
        </TouchableOpacity>
      </WebModal>
      
      {/* Delete Confirmation */}
      <Modal visible={showConfirmDelete} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons name="warning" size={48} color={INVENTORY_THEME.danger} />
            <Text style={styles.confirmTitle}>Delete Category?</Text>
            <Text style={styles.confirmMessage}>
              {categoryToDelete?.item_count ? `This category has ${categoryToDelete.item_count} items. ` : ''}
              Are you sure you want to delete "{categoryToDelete?.name}"?
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirmDelete(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteCategory}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: INVENTORY_THEME.dark },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: INVENTORY_THEME.primary, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, padding: 16 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  categoryIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryInfo: { flex: 1, marginLeft: 16 },
  categoryName: { fontSize: 16, fontWeight: '700', color: INVENTORY_THEME.dark },
  categoryDesc: { fontSize: 14, color: INVENTORY_THEME.gray, marginTop: 2 },
  deleteIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: INVENTORY_THEME.gray, marginTop: 12 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: INVENTORY_THEME.primary, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: INVENTORY_THEME.dark, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: INVENTORY_THEME.dark },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: INVENTORY_THEME.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  confirmModal: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '85%', alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: INVENTORY_THEME.dark, marginTop: 16 },
  confirmMessage: { fontSize: 15, color: INVENTORY_THEME.gray, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  confirmButtons: { flexDirection: 'row', marginTop: 24, gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: INVENTORY_THEME.dark },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: INVENTORY_THEME.danger, alignItems: 'center' },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});
