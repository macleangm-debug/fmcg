import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { categoriesApi, productsApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import ViewToggle from '../../src/components/ViewToggle';
import WebModal from '../../src/components/WebModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';

const THEME = {
  primary: '#2563EB',
  dark: '#111827',
  gray: '#6B7280',
  danger: '#EF4444',
};

interface Category {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  product_count?: number;
}

export default function Categories() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user: currentUser } = useAuthStore();
  const { categoriesView, setCategoriesView } = useViewSettingsStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  // Reassign products modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  
  // Confirmation modal for Move & Delete
  const [showMoveDeleteConfirm, setShowMoveDeleteConfirm] = useState(false);
  
  // Inline category creation state
  const [showInlineCreateForm, setShowInlineCreateForm] = useState(false);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [inlineCategoryDesc, setInlineCategoryDesc] = useState('');
  const [creatingInlineCategory, setCreatingInlineCategory] = useState(false);
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });
  
  // Edit state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter categories based on search query
  const filteredCategories = categories.filter(cat => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(query) ||
      (cat.description && cat.description.toLowerCase().includes(query))
    );
  });

  // Handle delete attempt - check if category has products
  const handleDeleteAttempt = (cat: Category) => {
    setCategoryToDelete(cat);
    const productCount = cat.product_count || 0;
    if (productCount > 0) {
      setTargetCategoryId('');
      setCategorySearchQuery('');
      setShowReassignModal(true);
    } else {
      setShowConfirmDelete(true);
    }
  };

  // Get available categories for reassignment
  const getAvailableCategories = () => {
    return categories.filter(cat => cat.id !== categoryToDelete?.id);
  };

  // Get filtered categories based on search
  const getFilteredCategories = () => {
    const available = getAvailableCategories();
    if (!categorySearchQuery.trim()) return available;
    return available.filter(cat => 
      cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  };

  // Get selected target category
  const getTargetCategory = () => {
    return categories.find(cat => cat.id === targetCategoryId);
  };

  // Show confirmation before Move & Delete
  const confirmMoveAndDelete = () => {
    if (!targetCategoryId) {
      Alert.alert('Error', 'Please select a category to move products to');
      return;
    }
    setShowMoveDeleteConfirm(true);
  };

  // Handle reassign and delete (called after confirmation)
  const handleReassignAndDelete = async () => {
    if (!categoryToDelete || !targetCategoryId) {
      return;
    }

    setShowMoveDeleteConfirm(false);
    setReassigning(true);
    try {
      const productsRes = await productsApi.getAll({ category_id: categoryToDelete.id });
      const products = productsRes.data;

      for (const product of products) {
        await productsApi.update(product.id, {
          ...product,
          category_id: targetCategoryId,
        });
      }

      await categoriesApi.delete(categoryToDelete.id);

      const targetCat = getTargetCategory();
      setShowReassignModal(false);
      setCategoryToDelete(null);
      setTargetCategoryId('');
      fetchCategories();
      
      setSuccessMessage({
        title: 'Category Deleted',
        subtitle: `${products.length} product${products.length !== 1 ? 's' : ''} moved to "${targetCat?.name}" and "${categoryToDelete.name}" has been deleted.`
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to reassign products');
    } finally {
      setReassigning(false);
    }
  };

  // Handle inline category creation
  const handleCreateInlineCategory = async () => {
    if (!inlineCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setCreatingInlineCategory(true);
    try {
      const response = await categoriesApi.create({
        name: inlineCategoryName.trim(),
        description: inlineCategoryDesc.trim() || undefined,
        is_active: true,
      });
      
      const newCategory = response.data;
      setCategories(prev => [...prev, newCategory]);
      setTargetCategoryId(newCategory.id);
      
      setInlineCategoryName('');
      setInlineCategoryDesc('');
      setShowInlineCreateForm(false);
      setShowCategoryPicker(false);
      
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create category');
    } finally {
      setCreatingInlineCategory(false);
    }
  };

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

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    setSubmitting(true);
    try {
      await categoriesApi.create({ 
        name: newName.trim(), 
        description: newDescription.trim() || undefined,
        is_active: true 
      });
      setNewName('');
      setNewDescription('');
      setShowAddModal(false);
      fetchCategories();
      setSuccessMessage({ 
        title: 'Category Created', 
        subtitle: `"${newName}" has been added.` 
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
    setShowEditModal(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editName.trim()) return;
    setSubmitting(true);
    try {
      await categoriesApi.update(editingCategory.id, { 
        name: editName.trim(), 
        description: editDescription.trim() || undefined 
      });
      setShowEditModal(false);
      setEditingCategory(null);
      fetchCategories();
      setSuccessMessage({ 
        title: 'Category Updated', 
        subtitle: `"${editName}" has been updated.` 
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      const deletedName = categoryToDelete.name;
      await categoriesApi.delete(categoryToDelete.id);
      setShowConfirmDelete(false);
      setCategoryToDelete(null);
      fetchCategories();
      setSuccessMessage({ 
        title: 'Category Deleted', 
        subtitle: `"${deletedName}" has been removed.` 
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete category');
    }
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Web Page Header */}
      {isWeb && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Categories</Text>
            <Text style={styles.webPageSubtitle}>{categories.length} categories</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle
              currentView={categoriesView}
              onToggle={setCategoriesView}
            />
            <Pressable 
              onPress={() => setShowAddModal(true)} 
              style={styles.webCreateBtn}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>Add Category</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Categories</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Search Row */}
            <View style={styles.webCardHeader}>
              <Text style={styles.webCardTitle}>{filteredCategories.length} Categories</Text>
              <View style={styles.webSearchBox}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={styles.webSearchInput}
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#6B7280"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Table Header - No numbering column */}
            {categoriesView === 'table' && filteredCategories.length > 0 && (
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>NAME</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>DESCRIPTION</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>PRODUCTS</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>ACTIONS</Text>
              </View>
            )}

            {/* Content */}
            <ScrollView
              style={styles.webListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
            >
              {filteredCategories.length === 0 ? (
                <View style={styles.webEmptyState}>
                  <Ionicons name="folder-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.webEmptyTitle}>
                    {searchQuery ? 'No matches found' : 'Organization is key to success!'}
                  </Text>
                  <Text style={styles.webEmptyText}>
                    {searchQuery ? 'Try a different search term' : 'Create categories to organize your products like a pro.'}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
                      <Text style={styles.emptyBtnText}>Add Category</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : categoriesView === 'table' ? (
                filteredCategories.map((cat) => (
                  <View key={cat.id} style={styles.tableRow}>
                    <View style={[styles.tableCellName, { flex: 1.5 }]}>
                      <View style={[styles.categoryIconSmall, { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons name="folder" size={14} color={THEME.primary} />
                      </View>
                      <Text style={styles.categoryName}>{cat.name}</Text>
                    </View>
                    <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                      {cat.description || '-'}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{cat.product_count || 0} items</Text>
                    <View style={[styles.tableCellActions, { flex: 1 }]}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditCategory(cat)}
                      >
                        <Ionicons name="pencil-outline" size={16} color={THEME.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteAttempt(cat)}
                      >
                        <Ionicons name="trash-outline" size={16} color={THEME.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.webGridList}>
                  {filteredCategories.map((cat) => (
                    <View key={cat.id} style={styles.categoryCard}>
                      <View style={[styles.categoryIcon, { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons name="folder" size={24} color={THEME.primary} />
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{cat.name}</Text>
                        <Text style={styles.categoryDesc}>{cat.product_count || 0} products</Text>
                      </View>
                      <TouchableOpacity style={styles.editIconBtn} onPress={() => handleEditCategory(cat)}>
                        <Ionicons name="pencil-outline" size={20} color={THEME.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDeleteAttempt(cat)}>
                        <Ionicons name="trash-outline" size={20} color={THEME.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <View style={styles.mobileCardContainer}>
          <ScrollView
            showsVerticalScrollIndicator={true}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
            contentContainerStyle={styles.listInsideCard}
          >
            {categories.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-outline" size={48} color={THEME.gray} />
                <Text style={styles.emptyTitle}>Organization is key to success!</Text>
                <Text style={styles.emptyText}>Create categories to organize your products like a pro.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
                  <Text style={styles.emptyBtnText}>Add Category</Text>
                </TouchableOpacity>
              </View>
            ) : (
              categories.map((cat) => (
                <View key={cat.id} style={styles.categoryCard}>
                  <View style={[styles.categoryIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="folder" size={24} color={THEME.primary} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <Text style={styles.categoryDesc}>{cat.product_count || 0} products</Text>
                  </View>
                  <TouchableOpacity style={styles.editIconBtn} onPress={() => handleEditCategory(cat)}>
                    <Ionicons name="pencil-outline" size={20} color={THEME.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDeleteAttempt(cat)}>
                    <Ionicons name="trash-outline" size={20} color={THEME.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Add Category Modal */}
      <WebModal
        visible={showAddModal}
        onClose={() => { setShowAddModal(false); setNewName(''); setNewDescription(''); }}
        title="Add Category"
        subtitle="Create a new product category"
        icon="folder-open-outline"
        iconColor={THEME.primary}
      >
        <Text style={styles.inputLabel}>Name *</Text>
        <TextInput 
          style={styles.input} 
          value={newName} 
          onChangeText={setNewName} 
          placeholder="Enter category name" 
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={newDescription} 
          onChangeText={setNewDescription} 
          placeholder="Optional description" 
          placeholderTextColor="#9CA3AF"
          multiline 
        />
        <TouchableOpacity 
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
          onPress={handleAddCategory} 
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Create Category</Text>
          )}
        </TouchableOpacity>
      </WebModal>

      {/* Edit Category Modal */}
      <WebModal
        visible={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingCategory(null); }}
        title="Edit Category"
        subtitle="Update category details"
        icon="create-outline"
        iconColor={THEME.primary}
      >
        <Text style={styles.inputLabel}>Name *</Text>
        <TextInput 
          style={styles.input} 
          value={editName} 
          onChangeText={setEditName} 
          placeholder="Enter category name" 
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          value={editDescription} 
          onChangeText={setEditDescription} 
          placeholder="Optional description"
          placeholderTextColor="#9CA3AF" 
          multiline 
        />
        <TouchableOpacity 
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]} 
          onPress={handleUpdateCategory} 
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Update Category</Text>
          )}
        </TouchableOpacity>
      </WebModal>

      {/* Delete Confirmation - Only for empty categories */}
      <ConfirmationModal
        visible={showConfirmDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteCategory}
        onCancel={() => setShowConfirmDelete(false)}
      />
      
      {/* Reassign Products Modal */}
      <Modal
        visible={showReassignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReassignModal(false)}
      >
        <View style={styles.reassignOverlay}>
          <View style={styles.reassignModal}>
            <View style={styles.reassignHeader}>
              <View style={styles.reassignHeaderIcon}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
              </View>
              <View style={styles.reassignHeaderText}>
                <Text style={styles.reassignTitle}>Cannot Delete Category</Text>
                <Text style={styles.reassignSubtitle}>
                  "{categoryToDelete?.name}" has {categoryToDelete?.product_count} product{(categoryToDelete?.product_count || 0) !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.reassignCloseBtn}
                onPress={() => setShowReassignModal(false)}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.reassignInstructions}>
              <Ionicons name="information-circle" size={18} color="#3B82F6" />
              <Text style={styles.reassignInstructionsText}>
                Move all products to another category before deleting
              </Text>
            </View>

            <Text style={styles.reassignLabel}>Move products to:</Text>
            
            <TouchableOpacity 
              style={styles.categorySelector}
              onPress={() => setShowCategoryPicker(true)}
            >
              {targetCategoryId ? (
                <View style={styles.selectedCategoryDisplay}>
                  <Ionicons name="folder" size={18} color={THEME.primary} />
                  <Text style={styles.selectedCategoryName}>{getTargetCategory()?.name}</Text>
                </View>
              ) : (
                <Text style={styles.categorySelectorPlaceholder}>Select a category...</Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.browseAllBtn}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Ionicons name="grid-outline" size={16} color={THEME.primary} />
              <Text style={styles.browseAllBtnText}>Browse All Categories ({getAvailableCategories().length})</Text>
            </TouchableOpacity>

            <View style={styles.reassignActions}>
              <TouchableOpacity 
                style={styles.reassignCancelBtn}
                onPress={() => setShowReassignModal(false)}
              >
                <Text style={styles.reassignCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.reassignConfirmBtn,
                  !targetCategoryId && styles.reassignConfirmBtnDisabled
                ]}
                onPress={confirmMoveAndDelete}
                disabled={!targetCategoryId || reassigning}
              >
                {reassigning ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
                    <Text style={styles.reassignConfirmBtnText}>Move & Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move & Delete Confirmation Modal */}
      <Modal
        visible={showMoveDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoveDeleteConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.moveDeleteConfirmModal}>
            <View style={styles.moveDeleteIconContainer}>
              <Ionicons name="alert-circle" size={56} color="#F59E0B" />
            </View>
            <Text style={styles.moveDeleteConfirmTitle}>Confirm Move & Delete</Text>
            <Text style={styles.moveDeleteConfirmMessage}>
              This will move {categoryToDelete?.product_count} product{(categoryToDelete?.product_count || 0) !== 1 ? 's' : ''} from "{categoryToDelete?.name}" to "{getTargetCategory()?.name}" and permanently delete the "{categoryToDelete?.name}" category.
            </Text>
            <Text style={styles.moveDeleteWarning}>This action cannot be undone.</Text>
            <View style={styles.moveDeleteActions}>
              <TouchableOpacity 
                style={styles.moveDeleteCancelBtn}
                onPress={() => setShowMoveDeleteConfirm(false)}
              >
                <Text style={styles.moveDeleteCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.moveDeleteConfirmBtn}
                onPress={handleReassignAndDelete}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.moveDeleteConfirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable 
          style={styles.categoryPickerOverlay}
          onPress={() => setShowCategoryPicker(false)}
        >
          <Pressable 
            style={styles.categoryPickerModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.categoryPickerHeader}>
              <View style={styles.categoryPickerHeaderLeft}>
                <View style={styles.categoryPickerIconBadge}>
                  <Ionicons name="folder" size={18} color={THEME.primary} />
                </View>
                <View>
                  <Text style={styles.categoryPickerTitle}>Select Category</Text>
                  <Text style={styles.categoryPickerSubtitle}>{getAvailableCategories().length} categories available</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.categoryPickerCloseBtn}
                onPress={() => setShowCategoryPicker(false)}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.categorySearchContainer}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={styles.categorySearchIcon} />
              <TextInput
                style={styles.categorySearchInput}
                placeholder="Search categories..."
                placeholderTextColor="#9CA3AF"
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
              />
              {categorySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView style={styles.categoryPickerList} showsVerticalScrollIndicator={false}>
              {getFilteredCategories().map((cat, index) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryPickerItem,
                    targetCategoryId === cat.id && styles.categoryPickerItemActive,
                    index === 0 && styles.categoryPickerItemFirst
                  ]}
                  onPress={() => {
                    setTargetCategoryId(cat.id);
                    setCategorySearchQuery('');
                    setShowCategoryPicker(false);
                  }}
                >
                  <View style={[styles.categoryColorDot, { backgroundColor: THEME.primary }]} />
                  <View style={styles.categoryPickerItemInfo}>
                    <Text style={[
                      styles.categoryPickerItemName,
                      targetCategoryId === cat.id && styles.categoryPickerItemNameActive
                    ]}>
                      {cat.name}
                    </Text>
                    <Text style={styles.categoryPickerItemCount}>{cat.product_count || 0} products</Text>
                  </View>
                  {targetCategoryId === cat.id ? (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                  )}
                </TouchableOpacity>
              ))}
              
              {categorySearchQuery.length > 0 && getFilteredCategories().length === 0 && (
                <View style={styles.noSearchResults}>
                  <Ionicons name="search-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.noSearchResultsText}>No categories found</Text>
                  <Text style={styles.noSearchResultsSubtext}>Create a new category below</Text>
                </View>
              )}
            </ScrollView>

            {showInlineCreateForm ? (
              <View style={styles.inlineCreateForm}>
                <View style={styles.inlineCreateHeader}>
                  <Ionicons name="add-circle" size={20} color={THEME.primary} />
                  <Text style={styles.inlineCreateTitle}>New Category</Text>
                  <TouchableOpacity 
                    style={styles.inlineCreateClose}
                    onPress={() => {
                      setShowInlineCreateForm(false);
                      setInlineCategoryName('');
                      setInlineCategoryDesc('');
                    }}
                  >
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="Category name *"
                  placeholderTextColor="#9CA3AF"
                  value={inlineCategoryName}
                  onChangeText={setInlineCategoryName}
                  autoFocus
                />
                <TextInput
                  style={[styles.inlineInput, styles.inlineInputDesc]}
                  placeholder="Description (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={inlineCategoryDesc}
                  onChangeText={setInlineCategoryDesc}
                  multiline
                />
                <TouchableOpacity 
                  style={[
                    styles.inlineCreateBtn,
                    !inlineCategoryName.trim() && styles.inlineCreateBtnDisabled
                  ]}
                  onPress={handleCreateInlineCategory}
                  disabled={!inlineCategoryName.trim() || creatingInlineCategory}
                >
                  {creatingInlineCategory ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.inlineCreateBtnText}>Create & Select</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.categoryPickerFooter}>
                <TouchableOpacity
                  style={styles.createCategoryBtn}
                  onPress={() => setShowInlineCreateForm(true)}
                >
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.createCategoryBtnText}>Create New Category</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={56} color="#10B981" />
            </View>
            <Text style={styles.confirmTitle}>{successMessage.title}</Text>
            <Text style={styles.confirmMessage}>{successMessage.subtitle}</Text>
            <TouchableOpacity 
              style={[styles.submitBtn, { marginTop: 20, width: '100%' }]} 
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.submitBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: THEME.dark },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, padding: 16 },
  categoryCard: { width: 350, flexGrow: 1, flexShrink: 0, maxWidth: 450, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  categoryIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryInfo: { flex: 1, marginLeft: 16 },
  categoryName: { fontSize: 16, fontWeight: '700', color: THEME.dark },
  categoryDesc: { fontSize: 14, color: THEME.gray, marginTop: 2 },
  deleteIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  editIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.dark, marginTop: 12 },
  emptyText: { fontSize: 14, color: THEME.gray, marginTop: 4, textAlign: 'center', maxWidth: 280 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: THEME.primary, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 0 },
  tableHeaderCell: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableCell: { fontSize: 14, color: '#374151' },
  tableCellName: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tableCellActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  categoryIconSmall: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionButton: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: THEME.dark, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: THEME.dark },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: THEME.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  confirmModal: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '85%', maxWidth: 400, alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: THEME.dark, marginTop: 16 },
  confirmMessage: { fontSize: 15, color: THEME.gray, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  successIconContainer: { marginBottom: 8 },
  
  // Reassign Modal
  reassignOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  reassignModal: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 420, padding: 20 },
  reassignHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  reassignHeaderIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reassignHeaderText: { flex: 1 },
  reassignTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  reassignSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  reassignCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  reassignInstructions: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, marginBottom: 20, gap: 10 },
  reassignInstructionsText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  reassignLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  categorySelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  categorySelectorPlaceholder: { fontSize: 15, color: '#9CA3AF' },
  selectedCategoryDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedCategoryName: { fontSize: 15, fontWeight: '500', color: '#111827' },
  browseAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2FF', paddingVertical: 10, borderRadius: 10, marginTop: 12, gap: 6 },
  browseAllBtnText: { fontSize: 14, fontWeight: '600', color: THEME.primary },
  reassignActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  reassignCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  reassignCancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  reassignConfirmBtn: { flex: 1.5, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reassignConfirmBtnDisabled: { backgroundColor: '#D1D5DB' },
  reassignConfirmBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  
  // Category Picker
  categoryPickerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  categoryPickerModal: { backgroundColor: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 420, maxHeight: '80%', overflow: 'hidden' },
  categoryPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  categoryPickerHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryPickerIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  categoryPickerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  categoryPickerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  categoryPickerCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  categorySearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  categorySearchIcon: { marginRight: 10 },
  categorySearchInput: { flex: 1, fontSize: 15, color: '#111827', padding: 0 },
  categoryPickerList: { paddingHorizontal: 12, maxHeight: 320 },
  categoryPickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 4, gap: 12 },
  categoryPickerItemFirst: { marginTop: 4 },
  categoryPickerItemActive: { backgroundColor: '#EEF2FF' },
  categoryColorDot: { width: 10, height: 10, borderRadius: 5 },
  categoryPickerItemInfo: { flex: 1 },
  categoryPickerItemName: { fontSize: 15, fontWeight: '500', color: '#374151' },
  categoryPickerItemNameActive: { color: THEME.primary, fontWeight: '600' },
  categoryPickerItemCount: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  selectedBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: THEME.primary, justifyContent: 'center', alignItems: 'center' },
  noSearchResults: { alignItems: 'center', paddingVertical: 40 },
  noSearchResultsText: { fontSize: 15, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  noSearchResultsSubtext: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  categoryPickerFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  createCategoryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.primary, paddingVertical: 14, borderRadius: 12, gap: 8 },
  createCategoryBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  inlineCreateForm: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#F9FAFB' },
  inlineCreateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  inlineCreateTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  inlineCreateClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  inlineInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', marginBottom: 10 },
  inlineInputDesc: { minHeight: 60, textAlignVertical: 'top' },
  inlineCreateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.primary, paddingVertical: 12, borderRadius: 10, gap: 6 },
  inlineCreateBtnDisabled: { backgroundColor: '#D1D5DB' },
  inlineCreateBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  // Move & Delete Confirmation Modal
  moveDeleteConfirmModal: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '90%', maxWidth: 400, alignItems: 'center' },
  moveDeleteIconContainer: { marginBottom: 16 },
  moveDeleteConfirmTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
  moveDeleteConfirmMessage: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  moveDeleteWarning: { fontSize: 13, color: '#EF4444', fontWeight: '600', marginBottom: 20 },
  moveDeleteActions: { flexDirection: 'row', gap: 12, width: '100%' },
  moveDeleteCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  moveDeleteCancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  moveDeleteConfirmBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', gap: 6 },
  moveDeleteConfirmBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  // Mobile Card Container
  mobileCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  listInsideCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  // Web Page Header styles
  webPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webPageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  webPageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  webCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  webCreateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Web Content wrapper
  webContentWrapper: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F3F4F6',
  },
  webWhiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  webCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  webCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  webSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 200,
    gap: 8,
  },
  webSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none',
  },
  webListContainer: {
    flex: 1,
  },
  webEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  webEmptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  webGridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
});
