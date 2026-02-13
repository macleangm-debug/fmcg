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
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { expensesApi } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useBusinessStore } from '../../src/store/businessStore';
import { useViewSettingsStore } from '../../src/store/viewSettingsStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import EmptyState from '../../src/components/EmptyState';
import ViewToggle from '../../src/components/ViewToggle';
import WebModal from '../../src/components/WebModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent', icon: 'home-outline', color: '#DC2626' },
  { value: 'utilities', label: 'Utilities', icon: 'flash-outline', color: '#F59E0B' },
  { value: 'salaries', label: 'Salaries', icon: 'people-outline', color: '#2563EB' },
  { value: 'supplies', label: 'Supplies', icon: 'cube-outline', color: '#10B981' },
  { value: 'marketing', label: 'Marketing', icon: 'megaphone-outline', color: '#8B5CF6' },
  { value: 'maintenance', label: 'Maintenance', icon: 'construct-outline', color: '#6B7280' },
  { value: 'transport', label: 'Transport', icon: 'car-outline', color: '#3B82F6' },
  { value: 'inventory', label: 'Inventory', icon: 'layers-outline', color: '#EC4899' },
  { value: 'Inventory/Stock', label: 'Stock Purchase', icon: 'cube', color: '#06B6D4' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#9CA3AF' },
];

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  vendor?: string;
  receipt_number?: string;
  date: string;
  notes?: string;
  created_by_name: string;
  created_at: string;
}

interface ExpenseSummary {
  total_expenses: number;
  count: number;
  by_category: Array<{ category: string; amount: number }>;
}

export default function Expenses() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user: currentUser } = useAuthStore();
  const { formatCurrency, settings } = useBusinessStore();
  const { expensesView, setExpensesView } = useViewSettingsStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const PAGE_SIZE = 20;

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter expenses based on search
  const filteredExpenses = expenses.filter(exp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exp.description.toLowerCase().includes(query) ||
      exp.category.toLowerCase().includes(query) ||
      (exp.vendor && exp.vendor.toLowerCase().includes(query)) ||
      (exp.notes && exp.notes.toLowerCase().includes(query))
    );
  });

  // Form state
  const [formCategory, setFormCategory] = useState('other');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formNotes, setFormNotes] = useState('');

  // Form validation state
  const [formErrors, setFormErrors] = useState<{
    description?: string;
    amount?: string;
  }>({});
  const [formTouched, setFormTouched] = useState<{
    description?: boolean;
    amount?: boolean;
  }>({});

  const validateDescription = (value: string) => {
    if (!value.trim()) return 'Description is required';
    if (value.trim().length < 3) return 'Description must be at least 3 characters';
    return undefined;
  };

  const validateAmount = (value: string) => {
    if (!value) return 'Amount is required';
    const num = parseFloat(value);
    if (isNaN(num)) return 'Please enter a valid amount';
    if (num <= 0) return 'Amount must be greater than zero';
    return undefined;
  };

  const handleFieldBlur = (field: 'description' | 'amount') => {
    setFormTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'description') {
      setFormErrors(prev => ({ ...prev, description: validateDescription(formDescription) }));
    } else if (field === 'amount') {
      setFormErrors(prev => ({ ...prev, amount: validateAmount(formAmount) }));
    }
  };

  useEffect(() => {
    if (!['admin', 'manager', 'finance'].includes(currentUser?.role || '')) {
      Alert.alert('Access Denied', 'Not authorized to view expenses');
      router.back();
    }
  }, [currentUser]);

  const fetchData = async (reset: boolean = true) => {
    try {
      const skip = reset ? 0 : expenses.length;
      const [expensesRes, summaryRes] = await Promise.all([
        expensesApi.getAll({ skip, limit: PAGE_SIZE }),
        reset ? expensesApi.getSummary('month') : Promise.resolve({ data: summary }),
      ]);
      console.log('Expenses loaded:', expensesRes.data?.length, expensesRes.data);
      if (reset) {
        setExpenses(expensesRes.data);
        setSummary(summaryRes.data);
      } else {
        setExpenses(prev => [...prev, ...expensesRes.data]);
      }
      setHasMore(expensesRes.data.length === PAGE_SIZE);
    } catch (error) {
      console.log('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchData(true);
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      fetchData(false);
    }
  }, [loadingMore, hasMore, loading, expenses.length]);

  const resetForm = () => {
    setFormCategory('other');
    setFormDescription('');
    setFormAmount('');
    setFormVendor('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormNotes('');
    setEditingExpense(null);
    setFormErrors({});
    setFormTouched({});
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormCategory(expense.category);
    setFormDescription(expense.description);
    setFormAmount(expense.amount.toString());
    setFormVendor(expense.vendor || '');
    setFormDate(expense.date);
    setFormNotes(expense.notes || '');
    setFormErrors({});
    setFormTouched({});
    setShowModal(true);
  };

  const handleSaveExpense = async () => {
    // Validate all required fields
    setFormTouched({ description: true, amount: true });
    const descriptionError = validateDescription(formDescription);
    const amountError = validateAmount(formAmount);
    setFormErrors({ description: descriptionError, amount: amountError });

    if (descriptionError || amountError) {
      return;
    }

    setSaving(true);
    try {
      const expenseData = {
        category: formCategory,
        description: formDescription.trim(),
        amount: parseFloat(formAmount),
        vendor: formVendor.trim() || undefined,
        date: formDate,
        notes: formNotes.trim() || undefined,
      };

      if (editingExpense) {
        await expensesApi.update(editingExpense.id, expenseData);
        setSuccessMessage('Expense updated successfully!');
      } else {
        await expensesApi.create(expenseData);
        setSuccessMessage('Expense recorded successfully!');
      }

      resetForm();
      setShowModal(false);
      fetchData();
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = (expense: Expense) => {
    setExpenseToDelete(expense);
    setShowDeleteModal(true);
  };

  const executeDeleteExpense = async () => {
    if (!expenseToDelete) return;
    
    setDeleting(true);
    try {
      await expensesApi.delete(expenseToDelete.id);
      setShowDeleteModal(false);
      setExpenseToDelete(null);
      setSuccessMessage('Expense deleted successfully');
      setShowSuccessModal(true);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteExpense = () => {
    setShowDeleteModal(false);
    setExpenseToDelete(null);
  };

  const getCategoryInfo = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[9];
  };

  const renderSummary = () => (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>This Month</Text>
        <Text style={styles.summaryTotal}>{formatCurrency(summary?.total_expenses || 0)}</Text>
      </View>
      <Text style={styles.summarySubtext}>{summary?.count || 0} expenses recorded</Text>
    </View>
  );

  const renderExpenseGrid = ({ item }: { item: Expense }) => {
    const catInfo = getCategoryInfo(item.category);
    return (
      <View style={styles.expenseCard}>
        <TouchableOpacity
          style={styles.expenseCardContent}
          onPress={() => handleEditExpense(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.expenseIcon, { backgroundColor: `${catInfo.color}15` }]}>
            <Ionicons name={catInfo.icon as any} size={20} color={catInfo.color} />
          </View>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseDescription}>{item.description}</Text>
            <Text style={styles.expenseMeta}>
              {catInfo.label} • {item.date}
            </Text>
          </View>
          <Text style={styles.expenseAmount}>-{formatCurrency(item.amount)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteExpense(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderExpenseTable = ({ item }: { item: Expense }) => {
    const catInfo = getCategoryInfo(item.category);
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { width: 40 }]}>
          <View style={[styles.tableIcon, { backgroundColor: `${catInfo.color}15` }]}>
            <Ionicons name={catInfo.icon as any} size={16} color={catInfo.color} />
          </View>
        </View>
        <Text style={[styles.tableCell, styles.tableCellDate]}>{item.date}</Text>
        <Text style={[styles.tableCell, styles.tableCellCategory]}>{catInfo.label}</Text>
        <Text style={[styles.tableCell, styles.tableCellDesc]} numberOfLines={1}>{item.description}</Text>
        <Text style={[styles.tableCell, styles.tableCellVendor]} numberOfLines={1}>{item.vendor || '-'}</Text>
        <Text style={[styles.tableCell, styles.tableCellAmount]}>-{formatCurrency(item.amount)}</Text>
        <View style={[styles.tableCell, styles.tableCellActions]}>
          <TouchableOpacity style={styles.tableActionButton} onPress={() => handleEditExpense(item)}>
            <Ionicons name="pencil-outline" size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tableActionButton} onPress={() => handleDeleteExpense(item)}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderCell, { width: 40 }]}></Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellDate]}>Date</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellCategory]}>Category</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellDesc]}>Description</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellVendor]}>Vendor</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellAmount]}>Amount</Text>
      <Text style={[styles.tableHeaderCell, styles.tableCellActions]}>Actions</Text>
    </View>
  );

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
            <Text style={styles.webPageTitle}>Expenses</Text>
            <Text style={styles.webPageSubtitle}>{expenses.length} expenses • {formatCurrency(summary?.total_expenses || 0)} total</Text>
          </View>
          <View style={styles.headerActions}>
            <ViewToggle
              currentView={expensesView}
              onToggle={setExpensesView}
            />
            <Pressable 
              onPress={() => { resetForm(); setShowModal(true); }} 
              style={styles.webCreateBtn}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.webCreateBtnText}>Add Expense</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Mobile Header */}
      {!isWeb && (
        <View style={styles.header}>
          <Text style={styles.title}>Expenses</Text>
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
              <Text style={styles.webCardTitle}>{filteredExpenses.length} Expenses</Text>
              <View style={styles.webSearchBox}>
                <Ionicons name="search" size={18} color="#6B7280" />
                <TextInput
                  style={styles.webSearchInput}
                  placeholder="Search expenses..."
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
            {expensesView === 'table' && filteredExpenses.length > 0 && <TableHeader />}

            {/* Content */}
            <ScrollView
              style={styles.webListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              {expensesView !== 'table' && summary && renderSummary()}
              
              {filteredExpenses.length === 0 ? (
                <View style={styles.webEmptyState}>
                  <Ionicons name="wallet-outline" size={64} color="#6B7280" />
                  <Text style={styles.webEmptyText}>
                    {searchQuery ? 'No expenses match your search' : 'No expenses found'}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity style={styles.emptyBtn} onPress={() => { resetForm(); setShowModal(true); }}>
                      <Text style={styles.emptyBtnText}>Add Expense</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : expensesView === 'table' ? (
                filteredExpenses.map((item) => renderExpenseTable({ item }))
              ) : (
                <View style={styles.webGridList}>
                  {filteredExpenses.map((item) => renderExpenseGrid({ item }))}
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
            data={expenses}
            renderItem={renderExpenseGrid}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listInsideCard}
            showsVerticalScrollIndicator={true}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={summary ? renderSummary : null}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.loadingMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon="wallet-outline"
                title="No Expenses"
                message="Record your business expenses"
                actionLabel="Add Expense"
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
        title={editingExpense ? 'Edit Expense' : 'Record Expense'}
        subtitle={editingExpense ? 'Update expense details' : 'Track your business expenses'}
        icon={editingExpense ? 'create-outline' : 'receipt-outline'}
        iconColor="#EF4444"
        maxWidth={500}
      >
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {EXPENSE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryOption,
                formCategory === cat.value && styles.categoryOptionActive,
              ]}
              onPress={() => setFormCategory(cat.value)}
            >
              <Ionicons
                name={cat.icon as any}
                size={20}
                color={formCategory === cat.value ? cat.color : '#6B7280'}
              />
              <Text
                style={[
                  styles.categoryOptionLabel,
                  formCategory === cat.value && { color: cat.color },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputWrapper}>
          <Input
            label="Description *"
            placeholder="e.g., Office supplies"
            value={formDescription}
            onChangeText={(text) => {
              setFormDescription(text);
              if (formTouched.description) {
                setFormErrors(prev => ({ ...prev, description: validateDescription(text) }));
              }
            }}
            onBlur={() => handleFieldBlur('description')}
          />
          {formTouched.description && formErrors.description && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{formErrors.description}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputWrapper}>
          <Input
            label="Amount *"
            placeholder="0.00"
            value={formAmount}
            onChangeText={(text) => {
              setFormAmount(text);
              if (formTouched.amount) {
                setFormErrors(prev => ({ ...prev, amount: validateAmount(text) }));
              }
            }}
            onBlur={() => handleFieldBlur('amount')}
            keyboardType="numeric"
            leftIcon={<Text style={styles.currencyPrefix}>{settings?.currencySymbol || '$'}</Text>}
          />
          {formTouched.amount && formErrors.amount && (
            <View style={styles.fieldError}>
              <Ionicons name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.fieldErrorText}>{formErrors.amount}</Text>
            </View>
          )}
        </View>

        <Input
          label="Vendor/Supplier"
          placeholder="Optional"
          value={formVendor}
          onChangeText={setFormVendor}
        />

        <Input
          label="Date"
          placeholder="YYYY-MM-DD"
          value={formDate}
          onChangeText={setFormDate}
        />

        <Input
          label="Notes"
          placeholder="Optional notes"
          value={formNotes}
          onChangeText={setFormNotes}
          multiline
        />

        <Button
          title={editingExpense ? 'Update Expense' : 'Save Expense'}
          onPress={handleSaveExpense}
          loading={saving}
          style={styles.saveButton}
        />

        {editingExpense && (
          <TouchableOpacity
            style={styles.deleteButtonModal}
            onPress={() => {
              setShowModal(false);
              setTimeout(() => handleDeleteExpense(editingExpense), 300);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
            <Text style={styles.deleteButtonText}>Delete Expense</Text>
          </TouchableOpacity>
        )}
      </WebModal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successModalIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
            </View>
            <Text style={styles.successModalTitle}>Success!</Text>
            <Text style={styles.successModalMessage}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successModalBtn}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successModalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Expense"
        message={expenseToDelete ? `Are you sure you want to delete this expense of ${formatCurrency(expenseToDelete.amount)}? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={executeDeleteExpense}
        onCancel={cancelDeleteExpense}
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
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
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
  tableIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellDate: {
    width: 100,
    fontSize: 13,
    color: '#6B7280',
  },
  tableCellCategory: {
    width: 100,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  tableCellDesc: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  tableCellVendor: {
    width: 120,
    fontSize: 13,
    color: '#6B7280',
  },
  tableCellAmount: {
    width: 100,
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'right',
    paddingRight: 16,
  },
  tableCellActions: {
    width: 100,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingLeft: 8,
  },
  tableActionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryTotal: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summarySubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  expenseCard: {
    width: 350,
    flexGrow: 1,
    flexShrink: 0,
    maxWidth: 450,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  expenseCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  expenseMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  deleteButton: {
    width: 44,
    height: '100%',
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  categoryOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EEF2FF',
  },
  categoryOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
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
  deleteButtonModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
    padding: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  successModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  successModalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successModalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  successModalBtnText: {
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
