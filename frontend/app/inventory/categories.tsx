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
  Platform,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import WebModal from '../../src/components/WebModal';
import ViewToggle from '../../src/components/ViewToggle';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
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
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
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
  
  // Reassign products modal state (replaces simple "cannot delete" modal)
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  
  // Inline category creation state (within picker modal)
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

  // Handle delete attempt - check if category has products
  const handleDeleteAttempt = (cat: Category) => {
    setCategoryToDelete(cat);
    if (cat.item_count > 0) {
      setTargetCategoryId('');
      setCategorySearchQuery('');
      setShowReassignModal(true);
    } else {
      setShowConfirmDelete(true);
    }
  };

  // Get available categories for reassignment (exclude the one being deleted)
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

  // Handle reassign and delete
  const handleReassignAndDelete = async () => {
    if (!categoryToDelete || !targetCategoryId) {
      Alert.alert('Error', 'Please select a category to move products to');
      return;
    }

    setReassigning(true);
    try {
      // First, get all products in the category to delete
      const productsRes = await api.get(`/inventory/items?category_id=${categoryToDelete.id}`);
      const products = productsRes.data;

      // Move each product to the target category
      for (const product of products) {
        await api.put(`/inventory/items/${product.id}`, {
          ...product,
          category_id: targetCategoryId,
        });
      }

      // Now delete the empty category
      await api.delete(`/inventory/categories/${categoryToDelete.id}`);

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
      const response = await api.post('/inventory/categories', {
        name: inlineCategoryName.trim(),
        description: inlineCategoryDesc.trim() || undefined,
        color: '#10B981',
      });
      
      // Add the new category to the list and select it
      const newCategory = response.data;
      setCategories(prev => [...prev, newCategory]);
      setTargetCategoryId(newCategory.id);
      
      // Reset the inline form
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
      const savedName = newName;
      setNewName('');
      setNewDescription('');
      fetchCategories();
      setSuccessMessage({ 
        title: 'Category Created!', 
        subtitle: `"${savedName}" has been added successfully.` 
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
    if (!editName.trim() || !editingCategory) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.put(`/inventory/categories/${editingCategory.id}`, {
        name: editName,
        description: editDescription,
      });
      setShowEditModal(false);
      setEditingCategory(null);
      setEditName('');
      setEditDescription('');
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
      await api.delete(`/inventory/categories/${categoryToDelete.id}`);
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
      {/* Web Page Header */}
      {isWeb && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Categories</Text>
            <Text style={styles.webPageSubtitle}>{categories.length} categorie(s)</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle
              currentView={categoriesView}
              onToggle={setCategoriesView}
            />
            <TouchableOpacity style={styles.webCreateBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>Add Category</Text>
            </TouchableOpacity>
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
            {/* Search Box */}
            <View style={styles.webCardHeader}>
              <View style={styles.webSearchBox}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={styles.webSearchInput}
                  placeholder="Search categories..."
                  value={categorySearchQuery}
                  onChangeText={setCategorySearchQuery}
                  placeholderTextColor="#6B7280"
                />
                {categorySearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Categories List */}
            <ScrollView
              style={styles.webListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={INVENTORY_THEME.primary} />}
            >
              {categories.filter(c => !categorySearchQuery || c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())).length === 0 ? (
                <View style={styles.webEmptyState}>
                  <Ionicons name="folder-outline" size={64} color={INVENTORY_THEME.gray} />
                  <Text style={styles.webEmptyText}>No categories found</Text>
                  <TouchableOpacity style={styles.webEmptyBtn} onPress={() => setShowAddModal(true)}>
                    <Text style={styles.webEmptyBtnText}>Create First Category</Text>
                  </TouchableOpacity>
                </View>
              ) : categoriesView === 'table' ? (
                <>
                  {/* Table Header */}
                  <View style={styles.webTableHeader}>
                    <Text style={[styles.webTableHeaderCell, { flex: 0.5 }]}>#</Text>
                    <Text style={[styles.webTableHeaderCell, { flex: 2 }]}>NAME</Text>
                    <Text style={[styles.webTableHeaderCell, { flex: 1 }]}>ITEMS</Text>
                    <Text style={[styles.webTableHeaderCell, { flex: 1, textAlign: 'right' }]}>ACTIONS</Text>
                  </View>
                  {/* Table Rows */}
                  {categories.filter(c => !categorySearchQuery || c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())).map((cat, index) => (
                    <View key={cat.id} style={styles.webTableRow}>
                      <Text style={[styles.webTableCell, { flex: 0.5 }]}>{index + 1}</Text>
                      <View style={[styles.webTableCellName, { flex: 2 }]}>
                        <View style={[styles.webCategoryIcon, { backgroundColor: `${cat.color}20` }]}>
                          <Ionicons name="folder" size={16} color={cat.color} />
                        </View>
                        <Text style={styles.webTableCell}>{cat.name}</Text>
                      </View>
                      <Text style={[styles.webTableCell, { flex: 1 }]}>{cat.item_count} items</Text>
                      <View style={[styles.webTableCellActions, { flex: 1 }]}>
                        <TouchableOpacity style={styles.editIconBtn} onPress={() => handleEditCategory(cat)}>
                          <Ionicons name="pencil-outline" size={18} color={INVENTORY_THEME.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDeleteAttempt(cat)}>
                          <Ionicons name="trash-outline" size={18} color={INVENTORY_THEME.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                /* Grid View - 3 columns */
                <View style={styles.webCategoriesGrid}>
                  {categories.filter(c => !categorySearchQuery || c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())).map((cat) => (
                    <View key={cat.id} style={styles.webCategoryCard}>
                      <View style={[styles.webCategoryCardIcon, { backgroundColor: `${cat.color}20` }]}>
                        <Ionicons name="folder" size={28} color={cat.color} />
                      </View>
                      <View style={styles.webCategoryCardInfo}>
                        <Text style={styles.webCategoryCardName}>{cat.name}</Text>
                        <Text style={styles.webCategoryCardCount}>{cat.item_count} items</Text>
                      </View>
                      <View style={styles.webCategoryCardActions}>
                        <TouchableOpacity style={styles.webCardActionBtn} onPress={() => handleEditCategory(cat)}>
                          <Ionicons name="pencil-outline" size={18} color={INVENTORY_THEME.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.webCardActionBtn} onPress={() => handleDeleteAttempt(cat)}>
                          <Ionicons name="trash-outline" size={18} color={INVENTORY_THEME.danger} />
                        </TouchableOpacity>
                      </View>
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
        <View style={styles.mobileContent}>
          <View style={styles.mobileCardContainer}>
            <ScrollView
              style={styles.mobileList}
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
                    <TouchableOpacity style={styles.editIconBtn} onPress={() => handleEditCategory(cat)}>
                      <Ionicons name="pencil-outline" size={20} color={INVENTORY_THEME.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDeleteAttempt(cat)}>
                      <Ionicons name="trash-outline" size={20} color={INVENTORY_THEME.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      )}
      
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
      
      {/* Edit Category Modal */}
      <WebModal visible={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Category">
        <Text style={styles.inputLabel}>Category Name *</Text>
        <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Enter category name" />
        
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput style={[styles.input, styles.textArea]} value={editDescription} onChangeText={setEditDescription} placeholder="Optional description" multiline numberOfLines={3} />
        
        <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateCategory} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Update Category</Text>}
        </TouchableOpacity>
      </WebModal>
      
      {/* Delete Confirmation - Only shown for empty categories */}
      <ConfirmationModal
        visible={showConfirmDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"?`}
        confirmLabel="Yes"
        cancelLabel="No"
        variant="danger"
        onConfirm={handleDeleteCategory}
        onCancel={() => setShowConfirmDelete(false)}
      />
      
      {/* Reassign Products Modal - Shown when category has products */}
      <Modal
        visible={showReassignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReassignModal(false)}
      >
        <View style={styles.reassignOverlay}>
          <View style={styles.reassignModal}>
            {/* Header */}
            <View style={styles.reassignHeader}>
              <View style={styles.reassignHeaderIcon}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
              </View>
              <View style={styles.reassignHeaderText}>
                <Text style={styles.reassignTitle}>Cannot Delete Category</Text>
                <Text style={styles.reassignSubtitle}>
                  "{categoryToDelete?.name}" has {categoryToDelete?.item_count} product{(categoryToDelete?.item_count || 0) !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.reassignCloseBtn}
                onPress={() => setShowReassignModal(false)}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={styles.reassignInstructions}>
              <Ionicons name="information-circle" size={18} color="#3B82F6" />
              <Text style={styles.reassignInstructionsText}>
                Move all products to another category before deleting
              </Text>
            </View>

            {/* Category Selector */}
            <Text style={styles.reassignLabel}>Move products to:</Text>
            
            {/* Selected Category Display / Dropdown Trigger */}
            <TouchableOpacity 
              style={styles.categorySelector}
              onPress={() => setShowCategoryPicker(true)}
            >
              {targetCategoryId ? (
                <View style={styles.selectedCategoryDisplay}>
                  <View style={[styles.categoryColorDot, { backgroundColor: getTargetCategory()?.color || '#6B7280' }]} />
                  <Text style={styles.selectedCategoryName}>{getTargetCategory()?.name}</Text>
                </View>
              ) : (
                <Text style={styles.categorySelectorPlaceholder}>Select a category...</Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* Browse All Button */}
            <TouchableOpacity 
              style={styles.browseAllBtn}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Ionicons name="grid-outline" size={16} color="#2563EB" />
              <Text style={styles.browseAllBtnText}>Browse All Categories ({getAvailableCategories().length})</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
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
                onPress={handleReassignAndDelete}
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
            {/* Header */}
            <View style={styles.categoryPickerHeader}>
              <View style={styles.categoryPickerHeaderLeft}>
                <View style={styles.categoryPickerIconBadge}>
                  <Ionicons name="folder" size={18} color="#2563EB" />
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
            
            {/* Search Bar */}
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
            
            {/* Category List */}
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
                  <View style={[styles.categoryColorDot, { backgroundColor: cat.color || '#6B7280' }]} />
                  <View style={styles.categoryPickerItemInfo}>
                    <Text style={[
                      styles.categoryPickerItemName,
                      targetCategoryId === cat.id && styles.categoryPickerItemNameActive
                    ]}>
                      {cat.name}
                    </Text>
                    <Text style={styles.categoryPickerItemCount}>{cat.item_count} items</Text>
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
              
              {/* No results */}
              {categorySearchQuery.length > 0 && getFilteredCategories().length === 0 && (
                <View style={styles.noSearchResults}>
                  <Ionicons name="search-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.noSearchResultsText}>No categories found</Text>
                  <Text style={styles.noSearchResultsSubtext}>Create a new category below</Text>
                </View>
              )}
            </ScrollView>

            {/* Inline Create Category Form */}
            {showInlineCreateForm ? (
              <View style={styles.inlineCreateForm}>
                <View style={styles.inlineCreateHeader}>
                  <Ionicons name="add-circle" size={20} color={INVENTORY_THEME.primary} />
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
              <Ionicons name="checkmark-circle" size={64} color={INVENTORY_THEME.primary} />
            </View>
            <Text style={styles.confirmTitle}>{successMessage.title}</Text>
            <Text style={styles.confirmMessage}>{successMessage.subtitle}</Text>
            <TouchableOpacity 
              style={[styles.submitBtn, { width: '100%', marginTop: 20 }]} 
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.submitBtnText}>OK</Text>
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
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: INVENTORY_THEME.dark },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: INVENTORY_THEME.primary, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, padding: 16 },
  mobileContent: { flex: 1, padding: 16 },
  mobileCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mobileList: { flex: 1 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 10 },
  categoryIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryInfo: { flex: 1, marginLeft: 16 },
  categoryName: { fontSize: 16, fontWeight: '700', color: INVENTORY_THEME.dark },
  categoryDesc: { fontSize: 14, color: INVENTORY_THEME.gray, marginTop: 2 },
  deleteIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  editIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: INVENTORY_THEME.gray, marginTop: 12 },
  emptyBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: INVENTORY_THEME.primary, borderRadius: 12 },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  // Table styles
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 16, borderRadius: 8, marginBottom: 8 },
  tableHeaderCell: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, marginHorizontal: 16, marginBottom: 1, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableCell: { fontSize: 14, color: '#374151' },
  tableCellName: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tableCellActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  categoryIconSmall: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
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
  successIconContainer: { marginBottom: 8 },
  
  // Reassign Products Modal Styles
  reassignOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reassignModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 20,
  },
  reassignHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reassignHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reassignHeaderText: {
    flex: 1,
  },
  reassignTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  reassignSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  reassignCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reassignInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  reassignInstructionsText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  reassignLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categorySelectorPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  selectedCategoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedCategoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  browseAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  browseAllBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  reassignActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  reassignCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  reassignCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  reassignConfirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reassignConfirmBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  reassignConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Category Picker Modal Styles
  categoryPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  categoryPickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  categoryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryPickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryPickerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  categoryPickerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  categoryPickerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categorySearchIcon: {
    marginRight: 10,
  },
  categorySearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  categoryPickerList: {
    paddingHorizontal: 12,
    maxHeight: 320,
  },
  categoryPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  categoryPickerItemFirst: {
    marginTop: 4,
  },
  categoryPickerItemActive: {
    backgroundColor: '#EEF2FF',
  },
  categoryColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryPickerItemInfo: {
    flex: 1,
  },
  categoryPickerItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  categoryPickerItemNameActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  categoryPickerItemCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSearchResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noSearchResultsText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  noSearchResultsSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  // Category Picker Footer
  categoryPickerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  createCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createCategoryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Inline Create Form
  inlineCreateForm: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  inlineCreateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  inlineCreateTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  inlineCreateClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  inlineInputDesc: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inlineCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INVENTORY_THEME.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  inlineCreateBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  inlineCreateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Web Page Header & Layout
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
  webPageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  webPageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  webCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: INVENTORY_THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  webCreateBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  webContentWrapper: {
    flex: 1,
    padding: 24,
  },
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
  webCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none',
  },
  webListContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  webEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  webEmptyText: { fontSize: 16, color: '#6B7280', marginTop: 16 },
  webEmptyBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: INVENTORY_THEME.primary,
    borderRadius: 12,
  },
  webEmptyBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  
  // Web Table Styles
  webTableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  webTableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  webTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webTableCell: {
    fontSize: 14,
    color: '#374151',
  },
  webTableCellName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webCategoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTableCellActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  
  // Web Grid/Card Styles
  webCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  webCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
    gap: 12,
  },
  webCategoryCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCategoryCardInfo: {
    flex: 1,
  },
  webCategoryCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  webCategoryCardCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  webCategoryCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  webCardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
