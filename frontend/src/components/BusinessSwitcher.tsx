import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { businessesApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import ConfettiCannon from 'react-native-confetti-cannon';

// Industry options with icons
const INDUSTRIES = [
  { id: 'retail', name: 'Retail Store', icon: 'storefront' },
  { id: 'restaurant', name: 'Restaurant & Food', icon: 'restaurant' },
  { id: 'services', name: 'Professional Services', icon: 'construct' },
  { id: 'healthcare', name: 'Healthcare & Pharmacy', icon: 'medical' },
  { id: 'education', name: 'Education & Training', icon: 'school' },
  { id: 'beauty', name: 'Beauty & Wellness', icon: 'sparkles' },
  { id: 'automotive', name: 'Automotive', icon: 'car' },
  { id: 'electronics', name: 'Electronics & Tech', icon: 'hardware-chip' },
  { id: 'fashion', name: 'Fashion & Apparel', icon: 'shirt' },
  { id: 'grocery', name: 'Grocery & Supermarket', icon: 'cart' },
  { id: 'fitness', name: 'Fitness & Gym', icon: 'barbell' },
  { id: 'hospitality', name: 'Hotel & Hospitality', icon: 'bed' },
  { id: 'other', name: 'Other', icon: 'business' },
];

// Comprehensive list of countries
const COUNTRIES = [
  // Africa
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon', 
  'Cape Verde', 'Central African Republic', 'Chad', 'Comoros', 'Congo', 'Côte d\'Ivoire',
  'DR Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia',
  'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia',
  'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique',
  'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles',
  'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo',
  'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
  // Americas
  'Argentina', 'Bahamas', 'Barbados', 'Belize', 'Bolivia', 'Brazil', 'Canada', 'Chile',
  'Colombia', 'Costa Rica', 'Cuba', 'Dominican Republic', 'Ecuador', 'El Salvador',
  'Guatemala', 'Guyana', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama',
  'Paraguay', 'Peru', 'Puerto Rico', 'Suriname', 'Trinidad and Tobago', 'United States',
  'Uruguay', 'Venezuela',
  // Asia
  'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei',
  'Cambodia', 'China', 'Georgia', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Japan',
  'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Malaysia', 'Maldives',
  'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan', 'Palestine', 'Philippines',
  'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea', 'Sri Lanka', 'Syria', 'Taiwan',
  'Tajikistan', 'Thailand', 'Timor-Leste', 'Turkey', 'Turkmenistan', 'United Arab Emirates',
  'Uzbekistan', 'Vietnam', 'Yemen',
  // Europe
  'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria',
  'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany',
  'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
  'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino',
  'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom',
  'Vatican City',
  // Oceania
  'Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'New Zealand',
  'Palau', 'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu',
].sort();

interface Business {
  id: string;
  name: string;
  industry: string;
  status: string;
  role: string;
  joined_at: string;
  is_current: boolean;
  logo_url?: string;
  country?: string;
}

interface BusinessSwitcherProps {
  compact?: boolean;
  onSwitch?: () => void;
  allowAddBusiness?: boolean; // Only true in main app (Software Galaxy/RetailPro)
}

type ModalView = 'list' | 'add' | 'success';

interface CreatedBusiness {
  id: string;
  name: string;
  country: string;
  industry: string;
}

export default function BusinessSwitcher({ compact = false, onSwitch, allowAddBusiness = false }: BusinessSwitcherProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [modalView, setModalView] = useState<ModalView>('list');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [canAddMore, setCanAddMore] = useState(true);
  const [maxBusinesses, setMaxBusinesses] = useState(1);
  const [extraBusinessPrice, setExtraBusinessPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  
  // Add business form state
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessCountry, setNewBusinessCountry] = useState('');
  const [newBusinessIndustry, setNewBusinessIndustry] = useState('retail');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryList, setShowCountryList] = useState(false);
  const [showIndustryList, setShowIndustryList] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Success confirmation state
  const [createdBusiness, setCreatedBusiness] = useState<CreatedBusiness | null>(null);
  
  // Confetti ref
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!showDropdown) {
      setModalView('list');
      setNewBusinessName('');
      setNewBusinessCountry('');
      setNewBusinessIndustry('retail');
      setCountrySearch('');
      setShowCountryList(false);
      setShowIndustryList(false);
      setCreatedBusiness(null);
    }
  }, [showDropdown]);
  
  // Trigger confetti when success view is shown
  useEffect(() => {
    if (modalView === 'success' && confettiRef.current) {
      confettiRef.current.start();
    }
  }, [modalView]);

  const fetchBusinesses = async () => {
    try {
      setIsLoading(true);
      const response = await businessesApi.getUserBusinesses();
      setBusinesses(response.data.businesses || []);
      setCurrentBusinessId(response.data.current_business_id);
      setCanAddMore(response.data.can_add_more ?? true);
      setMaxBusinesses(response.data.max_businesses || 1);
      setExtraBusinessPrice(response.data.extra_business_price || 0);
    } catch (error) {
      console.log('Failed to fetch businesses:', error);
      setCanAddMore(true);
    } finally {
      setIsLoading(false);
    }
  };

  const currentBusiness = businesses.find(b => b.is_current) || businesses[0];
  
  // Don't show if only 1 business and can't add more
  if (businesses.length <= 1 && !canAddMore && !isLoading) {
    return null;
  }

  const handleSwitchBusiness = async (businessId: string) => {
    if (businessId === currentBusinessId) {
      setShowDropdown(false);
      return;
    }

    setIsSwitching(true);
    try {
      await businessesApi.switchBusiness(businessId);
      if (Platform.OS === 'web') {
        window.location.reload();
      } else {
        onSwitch?.();
        await fetchBusinesses();
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to switch business');
    } finally {
      setIsSwitching(false);
      setShowDropdown(false);
    }
  };

  const handleAddBusiness = async () => {
    if (!newBusinessName.trim()) {
      Alert.alert('Error', 'Please enter a business name');
      return;
    }
    if (!newBusinessCountry) {
      Alert.alert('Error', 'Please select a country');
      return;
    }

    setIsAdding(true);
    try {
      const response = await businessesApi.addBusiness({
        name: newBusinessName.trim(),
        country: newBusinessCountry,
        industry: newBusinessIndustry,
      });
      
      // Refresh business list
      await fetchBusinesses();
      
      // Store created business info and show success view
      setCreatedBusiness({
        id: response.data?.business?.id,
        name: newBusinessName.trim(),
        country: newBusinessCountry,
        industry: newBusinessIndustry,
      });
      setModalView('success');
      
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to create business');
    } finally {
      setIsAdding(false);
    }
  };
  
  const getSelectedIndustry = () => {
    return INDUSTRIES.find(i => i.id === newBusinessIndustry) || INDUSTRIES[0];
  };

  const handleSwitchToNewBusiness = async () => {
    if (createdBusiness?.id) {
      await handleSwitchBusiness(createdBusiness.id);
    }
  };

  const handleStayHere = () => {
    setModalView('list');
    setNewBusinessName('');
    setNewBusinessCountry('');
    setCreatedBusiness(null);
  };

  const getIndustryIcon = (industry: string) => {
    const icons: Record<string, string> = {
      retail: 'storefront',
      restaurant: 'restaurant',
      services: 'construct',
      healthcare: 'medical',
      education: 'school',
      default: 'business',
    };
    return icons[industry] || icons.default;
  };

  const filteredCountries = countrySearch 
    ? COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  const renderListView = () => (
    <>
      <View style={styles.dropdownHeader}>
        <Ionicons name="business-outline" size={20} color="#111827" />
        <Text style={styles.dropdownTitle}>My Businesses</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowDropdown(false)}
        >
          <Ionicons name="close" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {isLoading || isSwitching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.loadingText}>
            {isSwitching ? 'Switching business...' : 'Loading businesses...'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.businessList} showsVerticalScrollIndicator={false}>
          {businesses.map((business) => (
            <TouchableOpacity
              key={business.id}
              style={[
                styles.businessItem,
                business.is_current && styles.businessItemSelected,
              ]}
              onPress={() => handleSwitchBusiness(business.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.businessItemIcon,
                business.is_current && styles.businessItemIconSelected,
              ]}>
                <Ionicons 
                  name={getIndustryIcon(business.industry) as any} 
                  size={20} 
                  color={business.is_current ? "#6366F1" : "#6B7280"} 
                />
              </View>
              <View style={styles.businessItemInfo}>
                <View style={styles.businessNameRow}>
                  <Text style={[
                    styles.businessName,
                    business.is_current && styles.businessNameSelected,
                  ]} numberOfLines={1}>
                    {business.name}
                  </Text>
                  {business.role === 'owner' && (
                    <View style={styles.ownerBadge}>
                      <Text style={styles.ownerBadgeText}>Owner</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.businessMeta}>
                  {business.industry.charAt(0).toUpperCase() + business.industry.slice(1)}
                  {business.country ? ` • ${business.country}` : ''}
                </Text>
              </View>
              {business.is_current && (
                <Ionicons name="checkmark-circle" size={22} color="#6366F1" />
              )}
            </TouchableOpacity>
          ))}

          {/* Add Business Button - Only in main app */}
          {allowAddBusiness && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.addBusinessBtn}
                onPress={() => setModalView('add')}
                activeOpacity={0.7}
              >
                <View style={styles.addBusinessIcon}>
                  <Ionicons name="add" size={20} color="#6366F1" />
                </View>
                <View style={styles.addBusinessInfo}>
                  <Text style={styles.addBusinessText}>Add New Business</Text>
                  {extraBusinessPrice > 0 && businesses.length >= maxBusinesses && (
                    <Text style={styles.addBusinessPrice}>+${extraBusinessPrice}/month</Text>
                  )}
                </View>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

      <View style={styles.dropdownFooter}>
        <Text style={styles.footerText}>
          {businesses.length} of {maxBusinesses === 999 ? '∞' : maxBusinesses} businesses
        </Text>
      </View>
    </>
  );

  const renderAddView = () => (
    <>
      <View style={styles.dropdownHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setModalView('list')}
        >
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.dropdownTitle}>Add New Business</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowDropdown(false)}
        >
          <Ionicons name="close" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.addFormContent} showsVerticalScrollIndicator={false}>
        {/* Business Name */}
        <Text style={styles.inputLabel}>Business Name *</Text>
        <TextInput
          style={styles.input}
          value={newBusinessName}
          onChangeText={setNewBusinessName}
          placeholder="Enter business name"
          placeholderTextColor="#9CA3AF"
          autoFocus
        />

        {/* Country Selection */}
        <Text style={styles.inputLabel}>Country *</Text>
        <TouchableOpacity
          style={styles.countrySelectBtn}
          onPress={() => setShowCountryList(!showCountryList)}
        >
          <Ionicons name="globe-outline" size={18} color="#6B7280" />
          <Text style={[
            styles.countrySelectText,
            newBusinessCountry && styles.countrySelectTextSelected
          ]}>
            {newBusinessCountry || 'Select a country'}
          </Text>
          <Ionicons 
            name={showCountryList ? "chevron-up" : "chevron-down"} 
            size={18} 
            color="#6B7280" 
          />
        </TouchableOpacity>

        {/* Country List/Search */}
        {showCountryList && (
          <View style={styles.countryListContainer}>
            <View style={styles.countrySearchContainer}>
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.countrySearchInput}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search countries..."
                placeholderTextColor="#9CA3AF"
              />
              {countrySearch ? (
                <TouchableOpacity onPress={() => setCountrySearch('')}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView style={styles.countryListScroll} nestedScrollEnabled>
              {filteredCountries.map((country) => (
                <TouchableOpacity
                  key={country}
                  style={[
                    styles.countryItem,
                    newBusinessCountry === country && styles.countryItemSelected
                  ]}
                  onPress={() => {
                    setNewBusinessCountry(country);
                    setShowCountryList(false);
                    setCountrySearch('');
                  }}
                >
                  <Text style={[
                    styles.countryItemText,
                    newBusinessCountry === country && styles.countryItemTextSelected
                  ]}>
                    {country}
                  </Text>
                  {newBusinessCountry === country && (
                    <Ionicons name="checkmark" size={16} color="#6366F1" />
                  )}
                </TouchableOpacity>
              ))}
              {filteredCountries.length === 0 && (
                <Text style={styles.noCountryText}>No countries found</Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Industry Selection (Optional) */}
        <Text style={styles.inputLabel}>Industry Type</Text>
        <TouchableOpacity
          style={styles.countrySelectBtn}
          onPress={() => {
            setShowIndustryList(!showIndustryList);
            setShowCountryList(false);
          }}
        >
          <Ionicons name={getSelectedIndustry().icon as any} size={18} color="#6366F1" />
          <Text style={[styles.countrySelectText, styles.countrySelectTextSelected]}>
            {getSelectedIndustry().name}
          </Text>
          <Ionicons 
            name={showIndustryList ? "chevron-up" : "chevron-down"} 
            size={18} 
            color="#6B7280" 
          />
        </TouchableOpacity>

        {/* Industry List */}
        {showIndustryList && (
          <View style={styles.industryListContainer}>
            <ScrollView style={styles.industryListScroll} nestedScrollEnabled>
              {INDUSTRIES.map((industry) => (
                <TouchableOpacity
                  key={industry.id}
                  style={[
                    styles.industryItem,
                    newBusinessIndustry === industry.id && styles.industryItemSelected
                  ]}
                  onPress={() => {
                    setNewBusinessIndustry(industry.id);
                    setShowIndustryList(false);
                  }}
                >
                  <View style={[
                    styles.industryIconBox,
                    newBusinessIndustry === industry.id && styles.industryIconBoxSelected
                  ]}>
                    <Ionicons 
                      name={industry.icon as any} 
                      size={18} 
                      color={newBusinessIndustry === industry.id ? '#6366F1' : '#6B7280'} 
                    />
                  </View>
                  <Text style={[
                    styles.industryItemText,
                    newBusinessIndustry === industry.id && styles.industryItemTextSelected
                  ]}>
                    {industry.name}
                  </Text>
                  {newBusinessIndustry === industry.id && (
                    <Ionicons name="checkmark" size={16} color="#6366F1" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Price Notice */}
        {extraBusinessPrice > 0 && businesses.length >= maxBusinesses && (
          <View style={styles.priceNotice}>
            <Ionicons name="information-circle-outline" size={18} color="#D97706" />
            <Text style={styles.priceNoticeText}>
              Adding this business will cost an additional ${extraBusinessPrice}/month
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.addFormFooter}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setModalView('list')}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createBtn, isAdding && styles.createBtnDisabled]}
          onPress={handleAddBusiness}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Create Business</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const getCreatedIndustry = () => {
    return INDUSTRIES.find(i => i.id === createdBusiness?.industry) || INDUSTRIES[0];
  };

  const renderSuccessView = () => (
    <View style={styles.successContainer}>
      {/* Confetti Animation */}
      <ConfettiCannon
        ref={confettiRef}
        count={80}
        origin={{ x: 200, y: 0 }}
        autoStart={false}
        fadeOut={true}
        fallSpeed={2500}
        explosionSpeed={300}
        colors={['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6']}
      />
      
      {/* Success Icon */}
      <View style={styles.successIconContainer}>
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark" size={40} color="#FFFFFF" />
        </View>
      </View>
      
      {/* Success Message */}
      <Text style={styles.successTitle}>Business Created!</Text>
      <Text style={styles.successMessage}>
        "{createdBusiness?.name}" has been successfully created in {createdBusiness?.country}.
      </Text>
      
      {/* Business Card Preview */}
      <View style={styles.successBusinessCard}>
        <View style={styles.successBusinessIcon}>
          <Ionicons name={getCreatedIndustry().icon as any} size={24} color="#6366F1" />
        </View>
        <View style={styles.successBusinessInfo}>
          <Text style={styles.successBusinessName}>{createdBusiness?.name}</Text>
          <Text style={styles.successBusinessMeta}>{getCreatedIndustry().name} • {createdBusiness?.country}</Text>
        </View>
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.successActions}>
        <TouchableOpacity
          style={styles.stayBtn}
          onPress={handleStayHere}
        >
          <Text style={styles.stayBtnText}>Stay Here</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.switchBtn}
          onPress={handleSwitchToNewBusiness}
        >
          <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
          <Text style={styles.switchBtnText}>Switch Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorButton, compact && styles.selectorButtonCompact]}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.7}
      >
        <View style={styles.businessIcon}>
          <Ionicons 
            name={getIndustryIcon(currentBusiness?.industry || 'retail') as any} 
            size={compact ? 14 : 16} 
            color="#6366F1" 
          />
        </View>
        <Text style={[styles.selectorText, compact && styles.selectorTextCompact]} numberOfLines={1}>
          {isLoading ? 'Loading...' : (currentBusiness?.name || 'Select Business')}
        </Text>
        <Ionicons name="chevron-down" size={compact ? 12 : 14} color="#6B7280" />
      </TouchableOpacity>

      {/* Business Modal - Single Modal with Inline Views */}
      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <Pressable 
            style={styles.dropdownContainer}
            onPress={(e) => e.stopPropagation()}
          >
            {modalView === 'list' && renderListView()}
            {modalView === 'add' && renderAddView()}
            {modalView === 'success' && renderSuccessView()}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    maxWidth: 200,
  },
  selectorButtonCompact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: 160,
  },
  businessIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6366F1',
    flex: 1,
  },
  selectorTextCompact: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  businessList: {
    maxHeight: 350,
  },
  businessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  businessItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  businessItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessItemIconSelected: {
    backgroundColor: '#E0E7FF',
  },
  businessItemInfo: {
    flex: 1,
  },
  businessNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    flexShrink: 1,
  },
  businessNameSelected: {
    color: '#6366F1',
    fontWeight: '600',
  },
  businessMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  ownerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  addBusinessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  addBusinessIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBusinessInfo: {
    flex: 1,
  },
  addBusinessText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6366F1',
  },
  addBusinessPrice: {
    fontSize: 12,
    color: '#D97706',
    marginTop: 2,
  },
  dropdownFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Add Form Styles
  addFormContent: {
    padding: 16,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
  },
  countrySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  countrySelectText: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
  },
  countrySelectTextSelected: {
    color: '#111827',
  },
  countryListContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 200,
    overflow: 'hidden',
  },
  countrySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  countrySearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  countryListScroll: {
    maxHeight: 150,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  countryItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  countryItemText: {
    fontSize: 14,
    color: '#374151',
  },
  countryItemTextSelected: {
    color: '#6366F1',
    fontWeight: '500',
  },
  noCountryText: {
    padding: 16,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
  // Industry Selector Styles
  industryListContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 220,
    overflow: 'hidden',
  },
  industryListScroll: {
    maxHeight: 220,
  },
  industryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  industryItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  industryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  industryIconBoxSelected: {
    backgroundColor: '#E0E7FF',
  },
  industryItemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  industryItemTextSelected: {
    color: '#6366F1',
    fontWeight: '500',
  },
  priceNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  priceNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  addFormFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Success View Styles
  successContainer: {
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  successBusinessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  successBusinessIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBusinessInfo: {
    flex: 1,
  },
  successBusinessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  successBusinessMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  stayBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
  },
  switchBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
