import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { categoriesApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import ViewToggle from '../../src/components/ViewToggle';
import WebModal from '../../src/components/WebModal';

interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export default function Categories() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user: currentUser } = useAuthStore();
  const { categoriesView, setCategoriesView } = useViewSettingsStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<{name?: string}>({});
  const [formTouched, setFormTouched] = useState<{name?: boolean}>({});

  const validateName = (value: string) => {
    if (!value.trim()) return 'Category name is required';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    return undefined;
  };

  const handleFieldBlur = (field: 'name') => {
    setFormTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'name') {
      setFormErrors(prev => ({ ...prev, name: validateName(formName) }));
    }
  };

  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      Alert.alert('Access Denied', 'Only admins and managers can manage categories');
      router.back();
    }
  }, [currentUser]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data);
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

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setEditingCategory(null);
    setFormErrors({});
    setFormTouched({});
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormDescription(category.description || '');
    setFormErrors({});
    setFormTouched({});
    setShowModal(true);
  };

  const handleSaveCategory = async () => {
    // Validate all fields
    setFormTouched({ name: true });
    const nameError = validateName(formName);
    setFormErrors({ name: nameError });
    
    if (nameError) {
      return;
    }

    setSaving(true);
    try {
      const categoryData = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        is_active: true,
      };

      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, categoryData);
        Alert.alert('Success', 'Category updated successfully');
      } else {
        await categoriesApi.create(categoryData);
        Alert.alert('Success', 'Category created successfully');
      }

      resetForm();
      setShowModal(false);
      fetchCategories();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const executeDeleteFromModal = async () => {
    if (!categoryToDelete) return;
    
    setDeleting(true);
    try {
      await categoriesApi.delete(categoryToDelete.id);
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error: any) {
      console.error('Delete failed:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setCategoryToDelete(null);
  };

  const renderCategoryGrid = ({ item }: { item: Category }) => {
    const handleEdit = () => {
      handleEditCategory(item);
    };
    
    const handleDelete = () => {
      setCategoryToDelete(item);
      setShowDeleteModal(true);
    };

    return (
      <View style={styles.categoryCard}>
        <View style={styles.categoryContent}>
          <View style={styles.categoryIcon}>
            <Ionicons name="folder-outline" size={24} color="#2563EB" />
          </View>
          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.categoryDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleEdit}
            activeOpacity={0.6}
          >
            <Ionicons name="create-outline" size={18} color="#2563EB" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.6}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCategoryTable = ({ item }: { item: Category }) => {
    const handleEdit = () => {
      handleEditCategory(item);
    };
    
    const handleDelete = () => {
      setCategoryToDelete(item);
      setShowDeleteModal(true);
    };

    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { width: 40 }]}>
          <View style={styles.tableIcon}>
            <Ionicons name="folder-outline" size={16} color="#2563EB" />
          </View>
        </View>
        <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.tableCell, styles.tableCellDesc]} numberOfLines={1}>{item.description || '-'}</Text>
        <View style={[styles.tableCell, styles.tableCellStatus]}>
          <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, item.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.tableCellActions]}>
          <TouchableOpacity style={styles.tableActionButton} onPress={handleEdit}>
            <Ionicons name="pencil-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tableActionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: 40 }]}></Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellName]}>Name</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellDesc]}>Description</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellStatus]}>Status</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellActions]}>Actions</Text>
    </View>
  );

  const renderCategory = isWeb && categoriesView === 'table' ? renderCategoryTable : renderCategoryGrid;

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Categories</Text>
        <View style={styles.headerActions}>
          {isWeb && (
            <ViewToggle
              currentView={categoriesView}
              onToggle={setCategoriesView}
            />
          )}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {isWeb && categoriesView === 'table' && <TableHeader />}
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        key={`${isWeb}-${categoriesView}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={isWeb && categoriesView === 'table' ? styles.tableList : styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="folder-outline"
            title="No Categories"
            message="Create categories to organize your products"
            actionLabel="Add Category"
            onAction={() => {
              resetForm();
              setShowModal(true);
            }}
          />
        }
      />

      <WebModal
        visible={showModal}
        onClose={() => {
          resetForm();
          setShowModal(false);
        }}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        subtitle={editingCategory ? 'Update category details' : 'Create a new product category'}
        icon={editingCategory ? 'create-outline' : 'add-circle-outline'}
        iconColor="#2563EB"
        maxWidth={450}
      >
        <View style={styles.inputWrapper}>
          <Input
            label="Category Name *"
            placeholder="e.g., Electronics, Clothing"
            value={formName}
            onChangeText={(text) => {
              setFormName(text);
              if (formTouched.name) {
                setFormErrors(prev => ({ ...prev, name: validateName(text) }));
              }
            }}
            onBlur={() => handleFieldBlur('name')}
            leftIcon={<Ionicons name="folder-outline" size={20} color={formTouched.name && formErrors.name ? '#DC2626' : '#6B7280'} />}
          />
          {formTouched.name && formErrors.name && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{formErrors.name}</Text>
            </View>
          )}
        </View>

        <Input
          label="Description"
          placeholder="Optional description"
          value={formDescription}
          onChangeText={setFormDescription}
          multiline
          numberOfLines={3}
          leftIcon={<Ionicons name="document-text-outline" size={20} color="#6B7280" />}
        />

        <Button
          title={editingCategory ? 'Update Category' : 'Create Category'}
          onPress={handleSaveCategory}
          loading={saving}
          style={styles.saveButton}
        />

        {editingCategory && (
          <TouchableOpacity
            style={styles.modalDeleteBtn}
            onPress={() => {
              setShowModal(false);
              setTimeout(() => confirmDeleteCategory(editingCategory), 300);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
            <Text style={styles.modalDeleteText}>Delete Category</Text>
          </TouchableOpacity>
        )}
      </WebModal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning" size={48} color="#DC2626" />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Category</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete "{categoryToDelete?.name}"?{'\n\n'}
              Products in this category will become uncategorized.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={cancelDelete}
                disabled={deleting}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmBtn}
                onPress={executeDeleteFromModal}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  tableList: {
    paddingBottom: 100,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Table styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    paddingHorizontal: 4,
  },
  tableIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellName: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tableCellDesc: {
    flex: 3,
    fontSize: 13,
    color: '#6B7280',
  },
  tableCellStatus: {
    width: 80,
    alignItems: 'center',
  },
  tableCellActions: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tableActionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#DC2626',
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  categoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#FEE2E2',
    minHeight: 48,
    cursor: 'pointer',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    minHeight: 48,
    cursor: 'pointer',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  saveButton: {
    marginTop: 16,
  },
  inputWrapper: {
    marginBottom: 4,
  },
  fieldError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
    padding: 14,
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Delete Confirmation Modal Styles
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteModalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
