import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  ScrollView,
  useWindowDimensions,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { promotionsApi, productsApi, categoriesApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import ViewToggle from '../../src/components/ViewToggle';
import WebModal from '../../src/components/WebModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';

const COLORS = {
  primary: '#2563EB',
  success: '#10B981',
  danger: '#DC2626',
  white: '#FFFFFF',
  dark: '#1F2937',
  gray: '#6B7280',
};

const PROMOTION_TYPES = [
  { value: 'percentage_discount', label: 'Percentage Discount', icon: 'pricetag-outline', description: 'X% off on products' },
  { value: 'fixed_discount', label: 'Fixed Discount', icon: 'cash-outline', description: '$X off on products' },
  { value: 'spend_x_get_y', label: 'Spend X Get Y', icon: 'gift-outline', description: 'Spend $X get reward' },
  { value: 'buy_x_get_y_free', label: 'Buy X Get Y Free', icon: 'cube-outline', description: 'Buy X items, get Y free' },
];

interface Promotion {
  id: string;
  name: string;
  description?: string;
  promotion_type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  applicable_product_ids: string[];
  applicable_category_ids: string[];
  condition?: any;
  reward: any;
  created_at: string;
  created_by_name: string;
}

interface Product {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function Promotions() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user: currentUser } = useAuthStore();
  const { promotionsView, setPromotionsView } = useViewSettingsStore();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter promotions based on search
  const filteredPromotions = promotions.filter(promo => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      promo.name.toLowerCase().includes(query) ||
      (promo.description && promo.description.toLowerCase().includes(query)) ||
      promo.promotion_type.toLowerCase().includes(query)
    );
  });

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('percentage_discount');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDiscountPercentage, setFormDiscountPercentage] = useState('');
  const [formDiscountAmount, setFormDiscountAmount] = useState('');
  const [formMinSpend, setFormMinSpend] = useState('');
  const [formMinQuantity, setFormMinQuantity] = useState('');
  const [formFreeQuantity, setFormFreeQuantity] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [applyTo, setApplyTo] = useState<'all' | 'products' | 'categories'>('all');

  // Form validation state
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    discount?: string;
    dates?: string;
  }>({});
  const [formTouched, setFormTouched] = useState<{
    name?: boolean;
    discount?: boolean;
    dates?: boolean;
  }>({});

  const validateName = (value: string) => {
    if (!value.trim()) return 'Promotion name is required';
    if (value.trim().length < 3) return 'Name must be at least 3 characters';
    return undefined;
  };

  const validateDiscount = () => {
    if (formType === 'percentage_discount') {
      const val = parseFloat(formDiscountPercentage);
      if (!formDiscountPercentage || isNaN(val)) return 'Discount percentage is required';
      if (val <= 0 || val > 100) return 'Percentage must be between 1 and 100';
    } else if (formType === 'fixed_discount') {
      const val = parseFloat(formDiscountAmount);
      if (!formDiscountAmount || isNaN(val)) return 'Discount amount is required';
      if (val <= 0) return 'Amount must be greater than zero';
    } else if (formType === 'buy_x_get_y') {
      const minQty = parseInt(formMinQuantity);
      const freeQty = parseInt(formFreeQuantity);
      if (!formMinQuantity || isNaN(minQty) || minQty < 1) return 'Minimum quantity is required';
      if (!formFreeQuantity || isNaN(freeQty) || freeQty < 1) return 'Free quantity is required';
    }
    return undefined;
  };

  const validateDates = () => {
    if (!formStartDate) return 'Start date is required';
    if (!formEndDate) return 'End date is required';
    if (new Date(formEndDate) <= new Date(formStartDate)) return 'End date must be after start date';
    return undefined;
  };

  const handleFieldBlur = (field: 'name' | 'discount' | 'dates') => {
    setFormTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'name') {
      setFormErrors(prev => ({ ...prev, name: validateName(formName) }));
    } else if (field === 'discount') {
      setFormErrors(prev => ({ ...prev, discount: validateDiscount() }));
    } else if (field === 'dates') {
      setFormErrors(prev => ({ ...prev, dates: validateDates() }));
    }
  };

  // Check admin/manager access
  useEffect(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager') {
      Alert.alert('Access Denied', 'Only admins and managers can access this page');
      router.back();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      const [promosRes, productsRes, categoriesRes] = await Promise.all([
        promotionsApi.getAll(),
        productsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setPromotions(promosRes.data);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.log('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormType('percentage_discount');
    setFormStartDate(format(new Date(), 'yyyy-MM-dd'));
    setFormEndDate(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    setFormDiscountPercentage('');
    setFormDiscountAmount('');
    setFormMinSpend('');
    setFormMinQuantity('');
    setFormFreeQuantity('');
    setSelectedProducts([]);
    setSelectedCategories([]);
    setApplyTo('all');
    setEditingPromotion(null);
    setFormErrors({});
    setFormTouched({});
  };

  const handleEditPromotion = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormName(promo.name);
    setFormDescription(promo.description || '');
    setFormType(promo.promotion_type);
    setFormStartDate(promo.start_date);
    setFormEndDate(promo.end_date);
    
    // Set reward values based on type
    if (promo.reward?.discount_percentage) {
      setFormDiscountPercentage(promo.reward.discount_percentage.toString());
    }
    if (promo.reward?.discount_amount) {
      setFormDiscountAmount(promo.reward.discount_amount.toString());
    }
    if (promo.condition?.min_spend) {
      setFormMinSpend(promo.condition.min_spend.toString());
    }
    if (promo.condition?.min_quantity) {
      setFormMinQuantity(promo.condition.min_quantity.toString());
    }
    if (promo.reward?.free_quantity) {
      setFormFreeQuantity(promo.reward.free_quantity.toString());
    }
    
    // Set apply to
    if (promo.applicable_product_ids?.length > 0) {
      setApplyTo('products');
      setSelectedProducts(promo.applicable_product_ids);
    } else if (promo.applicable_category_ids?.length > 0) {
      setApplyTo('categories');
      setSelectedCategories(promo.applicable_category_ids);
    } else {
      setApplyTo('all');
    }
    
    setFormErrors({});
    setFormTouched({});
    setShowModal(true);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSavePromotion = async () => {
    // Validate all fields
    setFormTouched({ name: true, discount: true, dates: true });
    const nameError = validateName(formName);
    const discountError = validateDiscount();
    const datesError = validateDates();
    setFormErrors({ name: nameError, discount: discountError, dates: datesError });

    if (nameError || discountError || datesError) {
      return;
    }

    // Validate product/category selection
    if (applyTo === 'products' && selectedProducts.length === 0) {
      Alert.alert('Error', 'Please select at least one product');
      return;
    }
    if (applyTo === 'categories' && selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }

    // Build reward object based on type
    const reward: any = {};
    const condition: any = {};

    switch (formType) {
      case 'percentage_discount':
        reward.discount_percentage = parseFloat(formDiscountPercentage);
        break;
      case 'fixed_discount':
        reward.discount_amount = parseFloat(formDiscountAmount);
        break;
      case 'spend_x_get_y':
        condition.min_spend = parseFloat(formMinSpend);
        reward.discount_amount = parseFloat(formDiscountAmount);
        break;
      case 'buy_x_get_y_free':
        condition.min_quantity = parseInt(formMinQuantity);
        reward.free_quantity = parseInt(formFreeQuantity);
        break;
    }

    setSaving(true);
    try {
      const productIds = applyTo === 'products' ? selectedProducts : [];
      const categoryIds = applyTo === 'categories' ? selectedCategories : [];

      const promotionData = {
        name: formName,
        description: formDescription || undefined,
        promotion_type: formType,
        start_date: formStartDate,
        end_date: formEndDate,
        is_active: true,
        applicable_product_ids: productIds,
        applicable_category_ids: categoryIds,
        condition: Object.keys(condition).length > 0 ? condition : undefined,
        reward,
      };

      if (editingPromotion) {
        await promotionsApi.update(editingPromotion.id, promotionData);
        setSuccessMessage({ title: 'Promotion Updated!', subtitle: `"${formName}" has been updated successfully.` });
      } else {
        await promotionsApi.create(promotionData);
        setSuccessMessage({ title: 'Promotion Created!', subtitle: `"${formName}" has been created.` });
      }

      resetForm();
      setShowModal(false);
      setShowSuccessModal(true);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save promotion');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (promo: Promotion) => {
    setPromotionToDelete(promo);
    setShowDeleteModal(true);
  };

  const handleDeletePermanently = (promo: Promotion) => {
    setPromotionToDelete(promo);
    setShowDeleteModal(true);
  };

  const executeDeleteFromModal = async () => {
    if (!promotionToDelete) return;
    
    setDeleting(true);
    try {
      await promotionsApi.delete(promotionToDelete.id);
      setShowDeleteModal(false);
      setSuccessMessage({ title: 'Promotion Deleted', subtitle: `"${promotionToDelete.name}" has been removed.` });
      setPromotionToDelete(null);
      setShowSuccessModal(true);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete promotion');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPromotionToDelete(null);
  };

  const getTypeInfo = (type: string) => {
    return PROMOTION_TYPES.find(t => t.value === type) || PROMOTION_TYPES[0];
  };

  const isActive = (promo: Promotion) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return promo.is_active && promo.start_date <= today && promo.end_date >= today;
  };

  const getRewardText = (item: Promotion) => {
    if (item.promotion_type === 'percentage_discount') {
      return `${item.reward.discount_percentage}% off`;
    }
    if (item.promotion_type === 'fixed_discount') {
      return `$${item.reward.discount_amount} off`;
    }
    if (item.promotion_type === 'spend_x_get_y') {
      return `Spend $${item.condition?.min_spend} get $${item.reward.discount_amount} off`;
    }
    if (item.promotion_type === 'buy_x_get_y_free') {
      return `Buy ${item.condition?.min_quantity}, get ${item.reward.free_quantity} free`;
    }
    return '-';
  };

  // Grid view render (original)
  const renderPromotionGrid = ({ item }: { item: Promotion }) => {
    const typeInfo = getTypeInfo(item.promotion_type);
    const active = isActive(item);

    return (
      <TouchableOpacity 
        style={[styles.promoCard, !active && styles.promoCardInactive]}
        onPress={() => handleEditPromotion(item)}
        activeOpacity={0.7}
      >
        <View style={styles.promoHeader}>
          <View style={styles.promoIconContainer}>
            <Ionicons name={typeInfo.icon as any} size={24} color={active ? '#2563EB' : '#9CA3AF'} />
          </View>
          <View style={styles.promoInfo}>
            <Text style={styles.promoName}>{item.name}</Text>
            <Text style={styles.promoType}>{typeInfo.label}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: active ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.statusText, { color: active ? '#10B981' : '#DC2626' }]}>
              {active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.promoDescription}>{item.description}</Text>
        )}

        <View style={styles.promoDates}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={styles.promoDateText}>
            {item.start_date} to {item.end_date}
          </Text>
        </View>

        <View style={styles.promoReward}>
          <Text style={styles.rewardText}>{getRewardText(item)}</Text>
        </View>

        <View style={styles.promoActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => handleEditPromotion(item)}
          >
            <Ionicons name="pencil-outline" size={16} color="#2563EB" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          {item.is_active && (
            <TouchableOpacity
              style={styles.deactivateBtn}
              onPress={() => handleDeactivate(item)}
            >
              <Ionicons name="pause-circle-outline" size={16} color="#F59E0B" />
              <Text style={styles.deactivateBtnText}>Deactivate</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeletePermanently(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Table row view render
  const renderPromotionTable = ({ item }: { item: Promotion }) => {
    const typeInfo = getTypeInfo(item.promotion_type);
    const active = isActive(item);

    return (
      <TouchableOpacity
        style={styles.tableRow}
        onPress={() => handleEditPromotion(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.tableCell, { width: 40 }]}>
          <View style={[styles.tableIconContainer, { backgroundColor: active ? '#EEF2FF' : '#F3F4F6' }]}>
            <Ionicons name={typeInfo.icon as any} size={16} color={active ? '#2563EB' : '#9CA3AF'} />
          </View>
        </View>
        <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.tableCell, styles.tableCellType]}>{typeInfo.label}</Text>
        <Text style={[styles.tableCell, styles.tableCellReward]} numberOfLines={1}>{getRewardText(item)}</Text>
        <Text style={[styles.tableCell, styles.tableCellDates]}>{item.start_date} - {item.end_date}</Text>
        <View style={[styles.tableCell, styles.tableCellStatus]}>
          <View style={[styles.statusBadgeSmall, { backgroundColor: active ? '#D1FAE5' : '#FEE2E2' }]}>
            <Text style={[styles.statusTextSmall, { color: active ? '#10B981' : '#DC2626' }]}>
              {active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <View style={[styles.tableCell, styles.tableCellActions]}>
          <TouchableOpacity style={styles.tableActionButton} onPress={() => handleEditPromotion(item)}>
            <Ionicons name="pencil-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
          {item.is_active && (
            <TouchableOpacity style={styles.tableActionButton} onPress={() => handleDeactivate(item)}>
              <Ionicons name="pause-circle-outline" size={16} color="#F59E0B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.tableActionButton} onPress={() => handleDeletePermanently(item)}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Table header
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: 40 }]}></Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellName]}>Name</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellType]}>Type</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellReward]}>Reward</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellDates]}>Period</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellStatus]}>Status</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellActions]}>Actions</Text>
    </View>
  );

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
      {/* Web Page Header */}
      {isWeb && (
        <View style={styles.webPageHeader}>
          <View>
            <Text style={styles.webPageTitle}>Promotions</Text>
            <Text style={styles.webPageSubtitle}>{promotions.length} promotions</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle
              currentView={promotionsView}
              onToggle={setPromotionsView}
            />
            <Pressable 
              onPress={() => { resetForm(); setShowModal(true); }} 
              style={styles.webCreateBtn}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>Create Promotion</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.title}>Promotions</Text>
          <View style={styles.headerActions}>
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
      )}

      {/* Web Layout with White Card Container */}
      {isWeb ? (
        <View style={styles.webContentWrapper}>
          <View style={styles.webWhiteCard}>
            {/* Search Row */}
            <View style={styles.webCardHeader}>
              <Text style={styles.webCardTitle}>{filteredPromotions.length} Promotions</Text>
              <View style={styles.webSearchBox}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={styles.webSearchInput}
                  placeholder="Search promotions..."
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

            {/* Table Header */}
            {promotionsView === 'table' && filteredPromotions.length > 0 && <TableHeader />}

            {/* Content */}
            <ScrollView
              style={styles.webListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {filteredPromotions.length === 0 ? (
                <View style={styles.webEmptyState}>
                  <Ionicons name="pricetag-outline" size={64} color="#6B7280" />
                  <Text style={styles.webEmptyText}>
                    {searchQuery ? 'No promotions match your search' : 'No promotions found'}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity style={styles.emptyBtn} onPress={() => { resetForm(); setShowModal(true); }}>
                      <Text style={styles.emptyBtnText}>Create Promotion</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : promotionsView === 'table' ? (
                filteredPromotions.map((item) => renderPromotionTable({ item }))
              ) : (
                <View style={styles.webGridList}>
                  {filteredPromotions.map((item) => renderPromotionGrid({ item }))}
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <View style={styles.mobileCardContainer}>
          <FlatList
            data={promotions}
            renderItem={renderPromotionGrid}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listInsideCard}
            showsVerticalScrollIndicator={true}
            ListEmptyComponent={
              <EmptyState
                icon="pricetag-outline"
                title="No Promotions"
                message="Create your first sales campaign"
                actionLabel="Create Promotion"
                onAction={() => {
                  resetForm();
                  setShowModal(true);
                }}
              />
            }
          />
        </View>
      )}

      <WebModal
        visible={showModal}
        onClose={() => {
          resetForm();
          setShowModal(false);
        }}
        title={editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
        subtitle={editingPromotion ? 'Update promotion details' : 'Set up discounts and special offers'}
        icon={editingPromotion ? 'create-outline' : 'pricetag-outline'}
        iconColor="#F59E0B"
        maxWidth={550}
      >
        <View style={styles.inputWrapper}>
          <Input
            label="Promotion Name *"
            placeholder="e.g., Summer Sale"
            value={formName}
            onChangeText={(text) => {
              setFormName(text);
              if (formTouched.name) setFormErrors(prev => ({ ...prev, name: validateName(text) }));
            }}
            onBlur={() => handleFieldBlur('name')}
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
        />

        <Text style={styles.sectionLabel}>Promotion Type *</Text>
        <View style={styles.typeGrid}>
          {PROMOTION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeOption,
                formType === type.value && styles.typeOptionActive,
              ]}
              onPress={() => {
                setFormType(type.value);
                setFormErrors(prev => ({ ...prev, discount: undefined }));
                setFormTouched(prev => ({ ...prev, discount: false }));
              }}
            >
              <Ionicons
                name={type.icon as any}
                size={24}
                color={formType === type.value ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.typeOptionLabel,
                  formType === type.value && styles.typeOptionLabelActive,
                ]}
              >
                {type.label}
              </Text>
              <Text style={styles.typeOptionDesc}>{type.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Input
                label="Start Date *"
                placeholder="YYYY-MM-DD"
                value={formStartDate}
                onChangeText={(text) => {
                  setFormStartDate(text);
                  if (formTouched.dates) setFormErrors(prev => ({ ...prev, dates: validateDates() }));
                }}
                onBlur={() => handleFieldBlur('dates')}
              />
            </View>
            <View style={styles.dateField}>
              <Input
                label="End Date *"
                placeholder="YYYY-MM-DD"
                value={formEndDate}
                onChangeText={(text) => {
                  setFormEndDate(text);
                  if (formTouched.dates) setFormErrors(prev => ({ ...prev, dates: validateDates() }));
                }}
                onBlur={() => handleFieldBlur('dates')}
              />
            </View>
          </View>
          {formTouched.dates && formErrors.dates && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{formErrors.dates}</Text>
            </View>
          )}
        </View>

        {/* Apply To Section */}
        <Text style={styles.sectionLabel}>Apply Promotion To *</Text>
        <View style={styles.applyToGrid}>
          <TouchableOpacity
            style={[styles.applyToOption, applyTo === 'all' && styles.applyToOptionActive]}
            onPress={() => {
              setApplyTo('all');
              setSelectedProducts([]);
              setSelectedCategories([]);
            }}
          >
            <Ionicons
              name="globe-outline"
              size={24}
              color={applyTo === 'all' ? '#2563EB' : '#6B7280'}
            />
            <Text style={[styles.applyToLabel, applyTo === 'all' && styles.applyToLabelActive]}>
              All Products
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.applyToOption, applyTo === 'categories' && styles.applyToOptionActive]}
            onPress={() => setApplyTo('categories')}
          >
            <Ionicons
              name="folder-outline"
              size={24}
              color={applyTo === 'categories' ? '#2563EB' : '#6B7280'}
            />
            <Text style={[styles.applyToLabel, applyTo === 'categories' && styles.applyToLabelActive]}>
              Categories
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.applyToOption, applyTo === 'products' && styles.applyToOptionActive]}
            onPress={() => setApplyTo('products')}
          >
            <Ionicons
              name="cube-outline"
              size={24}
              color={applyTo === 'products' ? '#2563EB' : '#6B7280'}
            />
            <Text style={[styles.applyToLabel, applyTo === 'products' && styles.applyToLabelActive]}>
              Specific Products
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Selection */}
        {applyTo === 'categories' && (
          <View style={styles.selectionSection}>
            <Text style={styles.selectionLabel}>
              Select Categories ({selectedCategories.length} selected)
            </Text>
            <View style={styles.selectionGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.selectionItem,
                    selectedCategories.includes(category.id) && styles.selectionItemActive,
                  ]}
                  onPress={() => toggleCategorySelection(category.id)}
                >
                  <Ionicons
                    name={selectedCategories.includes(category.id) ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={selectedCategories.includes(category.id) ? '#2563EB' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.selectionItemText,
                      selectedCategories.includes(category.id) && styles.selectionItemTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedCategories.length === 0 && (
              <Text style={styles.selectionHint}>Please select at least one category</Text>
            )}
          </View>
        )}

        {/* Product Selection */}
        {applyTo === 'products' && (
          <View style={styles.selectionSection}>
            <Text style={styles.selectionLabel}>
              Select Products ({selectedProducts.length} selected)
            </Text>
            <ScrollView 
              style={styles.productSelectionList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.productSelectionItem,
                    selectedProducts.includes(product.id) && styles.productSelectionItemActive,
                  ]}
                  onPress={() => toggleProductSelection(product.id)}
                >
                  <Ionicons
                    name={selectedProducts.includes(product.id) ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={selectedProducts.includes(product.id) ? '#2563EB' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.productSelectionText,
                      selectedProducts.includes(product.id) && styles.productSelectionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {product.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedProducts.length === 0 && (
              <Text style={styles.selectionHintError}>Please select at least one product</Text>
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>Reward Settings</Text>

        {formType === 'percentage_discount' && (
          <Input
            label="Discount Percentage *"
            placeholder="e.g., 20"
            value={formDiscountPercentage}
            onChangeText={setFormDiscountPercentage}
            keyboardType="numeric"
            leftIcon={<Text style={styles.inputPrefix}>%</Text>}
          />
        )}

        {formType === 'fixed_discount' && (
          <Input
            label="Discount Amount *"
            placeholder="e.g., 10"
            value={formDiscountAmount}
            onChangeText={setFormDiscountAmount}
            keyboardType="numeric"
            leftIcon={<Text style={styles.inputPrefix}>$</Text>}
          />
        )}

        {formType === 'spend_x_get_y' && (
          <>
            <Input
              label="Minimum Spend *"
              placeholder="e.g., 100"
              value={formMinSpend}
              onChangeText={setFormMinSpend}
              keyboardType="numeric"
              leftIcon={<Text style={styles.inputPrefix}>$</Text>}
            />
            <Input
              label="Discount Amount *"
              placeholder="e.g., 20"
              value={formDiscountAmount}
              onChangeText={setFormDiscountAmount}
              keyboardType="numeric"
              leftIcon={<Text style={styles.inputPrefix}>$</Text>}
            />
          </>
        )}

        {formType === 'buy_x_get_y_free' && (
          <>
            <Input
              label="Buy Quantity *"
              placeholder="e.g., 2"
              value={formMinQuantity}
              onChangeText={setFormMinQuantity}
              keyboardType="numeric"
            />
            <Input
              label="Get Free Quantity *"
              placeholder="e.g., 1"
              value={formFreeQuantity}
              onChangeText={setFormFreeQuantity}
              keyboardType="numeric"
            />
          </>
        )}

        <Button
          title={editingPromotion ? 'Update Promotion' : 'Create Promotion'}
          onPress={handleSavePromotion}
          loading={saving}
          style={styles.saveButton}
        />

        {editingPromotion && (
          <View style={styles.modalActionsRow}>
            {editingPromotion.is_active && (
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => {
                  setShowModal(false);
                  setTimeout(() => handleDeactivate(editingPromotion), 300);
                }}
              >
                <Ionicons name="pause-circle-outline" size={20} color="#F59E0B" />
                <Text style={styles.modalActionTextWarning}>Deactivate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={() => {
                setShowModal(false);
                setTimeout(() => handleDeletePermanently(editingPromotion), 300);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={styles.modalActionTextDanger}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </WebModal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable style={styles.successOverlay} onPress={() => setShowSuccessModal(false)}>
          <View style={styles.successModal}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            </View>
            <Text style={styles.successTitle}>{successMessage.title}</Text>
            <Text style={styles.successSubtitle}>{successMessage.subtitle}</Text>
            <TouchableOpacity style={styles.successBtn} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.successBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Promotion"
        message={promotionToDelete ? `Are you sure you want to delete "${promotionToDelete.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={executeDeleteFromModal}
        onCancel={cancelDelete}
        variant="danger"
        loading={deleting}
      />
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerWeb: {
    paddingHorizontal: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
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
  content: {
    flex: 1,
  },
  contentWeb: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  list: {
    padding: 20,
    paddingTop: 0,
  },
  tableList: {
    paddingHorizontal: 16,
  },
  // Table styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCell: {
    paddingHorizontal: 8,
  },
  tableIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tableCellType: {
    width: 140,
    fontSize: 13,
    color: '#6B7280',
  },
  tableCellReward: {
    flex: 1,
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  tableCellDates: {
    width: 180,
    fontSize: 12,
    color: '#6B7280',
  },
  tableCellStatus: {
    width: 80,
    alignItems: 'center',
  },
  tableCellActions: {
    width: 120,
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
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  promoCard: {
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  promoCardInactive: {
    opacity: 0.7,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  promoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  promoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  promoType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  promoDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  promoDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  promoDateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  promoReward: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  rewardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  promoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  deactivateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deactivateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
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
  typeGrid: {
    gap: 10,
    marginBottom: 20,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  typeOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EEF2FF',
  },
  typeOptionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  typeOptionLabelActive: {
    color: '#2563EB',
  },
  typeOptionDesc: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyToGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  applyToOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  applyToOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EEF2FF',
  },
  applyToLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  applyToLabelActive: {
    color: '#2563EB',
  },
  selectionSection: {
    marginBottom: 20,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  selectionItemActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EEF2FF',
  },
  selectionItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectionItemTextActive: {
    color: '#2563EB',
  },
  productSelectionList: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  productSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  productSelectionItemActive: {
    backgroundColor: '#EEF2FF',
  },
  productSelectionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  productSelectionTextActive: {
    color: '#2563EB',
    fontWeight: '500',
  },
  selectionHint: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 8,
    fontStyle: 'italic',
  },
  selectionHintError: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 8,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 32,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  modalActionTextWarning: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
  },
  modalActionTextDanger: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
  deleteButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    padding: 12,
    gap: 8,
  },
  deleteButtonText: {
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
  // Success Modal
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  successModal: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  successIconContainer: { marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  successSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  successBtn: { marginTop: 24, backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' },
  successBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
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
    padding: 16,
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
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
