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
import { businessesApi, locationsApi, subscriptionApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
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
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon', 
  'Cape Verde', 'Central African Republic', 'Chad', 'Comoros', 'Congo', 'Côte d\'Ivoire',
  'DR Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia',
  'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia',
  'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique',
  'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles',
  'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo',
  'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
  'Argentina', 'Bahamas', 'Barbados', 'Belize', 'Bolivia', 'Brazil', 'Canada', 'Chile',
  'Colombia', 'Costa Rica', 'Cuba', 'Dominican Republic', 'Ecuador', 'El Salvador',
  'Guatemala', 'Guyana', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama',
  'Paraguay', 'Peru', 'Puerto Rico', 'Suriname', 'Trinidad and Tobago', 'United States',
  'Uruguay', 'Venezuela',
  'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei',
  'Cambodia', 'China', 'Georgia', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Japan',
  'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Malaysia', 'Maldives',
  'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan', 'Palestine', 'Philippines',
  'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea', 'Sri Lanka', 'Syria', 'Taiwan',
  'Tajikistan', 'Thailand', 'Timor-Leste', 'Turkey', 'Turkmenistan', 'United Arab Emirates',
  'Uzbekistan', 'Vietnam', 'Yemen',
  'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria',
  'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany',
  'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands',
  'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino',
  'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom',
  'Vatican City',
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

interface Location {
  id: string;
  name: string;
  address?: string;
  is_default?: boolean;
}

interface ContextSwitcherProps {
  allowAddBusiness?: boolean;
  allowAddLocation?: boolean;
  onBusinessSwitch?: () => void;
  onLocationSwitch?: () => void;
}

type ModalView = 'main' | 'businesses' | 'locations' | 'add-business' | 'add-location' | 'success-business' | 'success-location';

interface CreatedBusiness {
  id: string;
  name: string;
  country: string;
  industry: string;
}

interface CreatedLocation {
  id: string;
  name: string;
  address?: string;
}

export default function ContextSwitcher({ 
  allowAddBusiness = false, 
  allowAddLocation = false,
  onBusinessSwitch,
  onLocationSwitch 
}: ContextSwitcherProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalView, setModalView] = useState<ModalView>('main');
  
  // Business state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
  const [isSwitchingBusiness, setIsSwitchingBusiness] = useState(false);
  
  // Location state
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const { selectedLocationId, setSelectedLocationId } = useLocationStore();
  
  // Subscription state
  const [subscription, setSubscription] = useState<any>(null);
  
  // Add business form state
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessCountry, setNewBusinessCountry] = useState('');
  const [newBusinessIndustry, setNewBusinessIndustry] = useState('retail');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryList, setShowCountryList] = useState(false);
  const [showIndustryList, setShowIndustryList] = useState(false);
  const [isAddingBusiness, setIsAddingBusiness] = useState(false);
  
  // Add location form state
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  
  // Success state
  const [createdBusiness, setCreatedBusiness] = useState<CreatedBusiness | null>(null);
  const [createdLocation, setCreatedLocation] = useState<CreatedLocation | null>(null);
  
  // Confetti ref
  const confettiRef = useRef<any>(null);
  
  // Expanded sections
  const [expandedSection, setExpandedSection] = useState<'business' | 'location' | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!showModal) {
      resetForm();
    }
  }, [showModal]);

  useEffect(() => {
    if (modalView === 'success-business' || modalView === 'success-location') {
      confettiRef.current?.start();
    }
  }, [modalView]);

  const resetForm = () => {
    setModalView('main');
    setNewBusinessName('');
    setNewBusinessCountry('');
    setNewBusinessIndustry('retail');
    setNewLocationName('');
    setNewLocationAddress('');
    setCountrySearch('');
    setShowCountryList(false);
    setShowIndustryList(false);
    setCreatedBusiness(null);
    setCreatedLocation(null);
    setExpandedSection(null);
  };

  const fetchData = async () => {
    await Promise.all([fetchBusinesses(), fetchLocations(), fetchSubscription()]);
  };

  const fetchBusinesses = async () => {
    try {
      setIsLoadingBusinesses(true);
      const response = await businessesApi.getUserBusinesses();
      setBusinesses(response.data.businesses || []);
      setCurrentBusinessId(response.data.current_business_id);
    } catch (error) {
      console.log('Failed to fetch businesses:', error);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  const fetchLocations = async () => {
    try {
      setIsLoadingLocations(true);
      const response = await locationsApi.getAll();
      setLocations(response.data || []);
    } catch (error) {
      console.log('Failed to fetch locations:', error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await subscriptionApi.getCurrent();
      setSubscription(response.data);
    } catch (error) {
      console.log('Failed to fetch subscription:', error);
    }
  };

  const currentBusiness = businesses.find(b => b.is_current) || businesses[0];
  const currentLocation = locations.find(l => l.id === selectedLocationId) || locations[0];
  const planName = subscription?.plan?.name || 'Starter';

  const handleSwitchBusiness = async (businessId: string) => {
    if (businessId === currentBusinessId) {
      setShowModal(false);
      return;
    }
    setIsSwitchingBusiness(true);
    try {
      await businessesApi.switchBusiness(businessId);
      if (Platform.OS === 'web') {
        window.location.reload();
      } else {
        onBusinessSwitch?.();
        await fetchBusinesses();
      }
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to switch business');
    } finally {
      setIsSwitchingBusiness(false);
      setShowModal(false);
    }
  };

  const handleSwitchLocation = (locationId: string | null) => {
    setSelectedLocationId(locationId);
    onLocationSwitch?.();
    setShowModal(false);
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

    setIsAddingBusiness(true);
    try {
      const response = await businessesApi.addBusiness({
        name: newBusinessName.trim(),
        country: newBusinessCountry,
        industry: newBusinessIndustry,
      });
      
      await fetchBusinesses();
      setCreatedBusiness({
        id: response.data?.business?.id,
        name: newBusinessName.trim(),
        country: newBusinessCountry,
        industry: newBusinessIndustry,
      });
      setModalView('success-business');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to create business');
    } finally {
      setIsAddingBusiness(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }

    setIsAddingLocation(true);
    try {
      const response = await locationsApi.create({
        name: newLocationName.trim(),
        address: newLocationAddress.trim() || undefined,
      });
      
      await fetchLocations();
      setCreatedLocation({
        id: response.data?.id,
        name: newLocationName.trim(),
        address: newLocationAddress.trim() || undefined,
      });
      setModalView('success-location');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to create location');
    } finally {
      setIsAddingLocation(false);
    }
  };

  const getIndustryIcon = (industry: string) => {
    const icons: Record<string, string> = {
      retail: 'storefront', restaurant: 'restaurant', services: 'construct',
      healthcare: 'medical', education: 'school', beauty: 'sparkles',
      automotive: 'car', electronics: 'hardware-chip', fashion: 'shirt',
      grocery: 'cart', fitness: 'barbell', hospitality: 'bed', other: 'business',
    };
    return icons[industry] || 'business';
  };

  const getSelectedIndustry = () => INDUSTRIES.find(i => i.id === newBusinessIndustry) || INDUSTRIES[0];
  const getCreatedIndustry = () => INDUSTRIES.find(i => i.id === createdBusiness?.industry) || INDUSTRIES[0];

  const filteredCountries = countrySearch 
    ? COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  const getPlanColor = () => {
    const colors: Record<string, { bg: string; text: string }> = {
      starter: { bg: '#E0E7FF', text: '#4338CA' },
      professional: { bg: '#DBEAFE', text: '#1D4ED8' },
      enterprise: { bg: '#D1FAE5', text: '#059669' },
    };
    return colors[planName.toLowerCase()] || colors.starter;
  };

  // Main View - Clean card-based layout
  const renderMainView = () => (
    <View style={styles.mainContent}>
      {/* Business Section */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'business' ? null : 'business')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionIcon}>
            <Ionicons name={getIndustryIcon(currentBusiness?.industry || 'retail') as any} size={20} color="#6366F1" />
          </View>
          <View style={styles.sectionInfo}>
            <Text style={styles.sectionLabel}>Business</Text>
            <Text style={styles.sectionValue} numberOfLines={1}>
              {isLoadingBusinesses ? 'Loading...' : (currentBusiness?.name || 'Select Business')}
            </Text>
          </View>
          {businesses.length > 1 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{businesses.length}</Text>
            </View>
          )}
          <Ionicons 
            name={expandedSection === 'business' ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color="#9CA3AF" 
          />
        </TouchableOpacity>
        
        {expandedSection === 'business' && (
          <View style={styles.expandedContent}>
            {businesses.slice(0, 3).map((business) => (
              <TouchableOpacity
                key={business.id}
                style={[styles.listItem, business.is_current && styles.listItemActive]}
                onPress={() => handleSwitchBusiness(business.id)}
              >
                <View style={[styles.listItemIcon, business.is_current && styles.listItemIconActive]}>
                  <Ionicons name={getIndustryIcon(business.industry) as any} size={16} color={business.is_current ? '#6366F1' : '#6B7280'} />
                </View>
                <Text style={[styles.listItemText, business.is_current && styles.listItemTextActive]} numberOfLines={1}>
                  {business.name}
                </Text>
                {business.is_current && <Ionicons name="checkmark-circle" size={18} color="#6366F1" />}
              </TouchableOpacity>
            ))}
            {businesses.length > 3 && (
              <TouchableOpacity 
                style={styles.viewAllBtn}
                onPress={() => setModalView('businesses')}
              >
                <Text style={styles.viewAllText}>View all {businesses.length} businesses</Text>
                <Ionicons name="arrow-forward" size={14} color="#6366F1" />
              </TouchableOpacity>
            )}
            {allowAddBusiness && (
              <TouchableOpacity 
                style={styles.addBtn}
                onPress={() => setModalView('add-business')}
              >
                <Ionicons name="add-circle-outline" size={18} color="#6366F1" />
                <Text style={styles.addBtnText}>Add New Business</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Location Section */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(expandedSection === 'location' ? null : 'location')}
          activeOpacity={0.7}
        >
          <View style={[styles.sectionIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="location" size={20} color="#10B981" />
          </View>
          <View style={styles.sectionInfo}>
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.sectionValue} numberOfLines={1}>
              {isLoadingLocations ? 'Loading...' : (selectedLocationId === null ? 'All Locations' : (currentLocation?.name || 'Select Location'))}
            </Text>
          </View>
          {locations.length > 1 && (
            <View style={[styles.countBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.countBadgeText, { color: '#059669' }]}>{locations.length}</Text>
            </View>
          )}
          <Ionicons 
            name={expandedSection === 'location' ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color="#9CA3AF" 
          />
        </TouchableOpacity>
        
        {expandedSection === 'location' && (
          <View style={styles.expandedContent}>
            {locations.length > 1 && (
              <TouchableOpacity
                style={[styles.listItem, selectedLocationId === null && styles.listItemActive]}
                onPress={() => handleSwitchLocation(null)}
              >
                <View style={[styles.listItemIcon, { backgroundColor: '#F0FDF4' }, selectedLocationId === null && styles.listItemIconActive]}>
                  <Ionicons name="globe-outline" size={16} color={selectedLocationId === null ? '#10B981' : '#6B7280'} />
                </View>
                <Text style={[styles.listItemText, selectedLocationId === null && { color: '#10B981' }]}>
                  All Locations
                </Text>
                {selectedLocationId === null && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
              </TouchableOpacity>
            )}
            {locations.slice(0, 3).map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[styles.listItem, selectedLocationId === location.id && styles.listItemActive]}
                onPress={() => handleSwitchLocation(location.id)}
              >
                <View style={[styles.listItemIcon, { backgroundColor: '#F0FDF4' }, selectedLocationId === location.id && styles.listItemIconActive]}>
                  <Ionicons name="storefront-outline" size={16} color={selectedLocationId === location.id ? '#10B981' : '#6B7280'} />
                </View>
                <Text style={[styles.listItemText, selectedLocationId === location.id && { color: '#10B981' }]} numberOfLines={1}>
                  {location.name}
                </Text>
                {selectedLocationId === location.id && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
              </TouchableOpacity>
            ))}
            {locations.length > 3 && (
              <TouchableOpacity 
                style={styles.viewAllBtn}
                onPress={() => setModalView('locations')}
              >
                <Text style={[styles.viewAllText, { color: '#10B981' }]}>View all {locations.length} locations</Text>
                <Ionicons name="arrow-forward" size={14} color="#10B981" />
              </TouchableOpacity>
            )}
            {allowAddLocation && (
              <TouchableOpacity 
                style={styles.addBtn}
                onPress={() => setModalView('add-location')}
              >
                <Ionicons name="add-circle-outline" size={18} color="#10B981" />
                <Text style={[styles.addBtnText, { color: '#10B981' }]}>Add New Location</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Subscription Badge */}
      <View style={[styles.subscriptionCard, { backgroundColor: getPlanColor().bg }]}>
        <Ionicons name="diamond" size={18} color={getPlanColor().text} />
        <Text style={[styles.subscriptionText, { color: getPlanColor().text }]}>
          {planName} Plan
        </Text>
        <TouchableOpacity style={styles.upgradeBtn}>
          <Text style={styles.upgradeBtnText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Full Businesses List View
  const renderBusinessesView = () => (
    <>
      <View style={styles.modalHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setModalView('main')}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>All Businesses</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView style={styles.listContainer}>
        {businesses.map((business) => (
          <TouchableOpacity
            key={business.id}
            style={[styles.fullListItem, business.is_current && styles.fullListItemActive]}
            onPress={() => handleSwitchBusiness(business.id)}
          >
            <View style={[styles.fullListIcon, business.is_current && styles.fullListIconActive]}>
              <Ionicons name={getIndustryIcon(business.industry) as any} size={22} color={business.is_current ? '#6366F1' : '#6B7280'} />
            </View>
            <View style={styles.fullListInfo}>
              <Text style={[styles.fullListName, business.is_current && styles.fullListNameActive]}>{business.name}</Text>
              <Text style={styles.fullListMeta}>{business.industry} • {business.country}</Text>
            </View>
            {business.role === 'owner' && (
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerBadgeText}>Owner</Text>
              </View>
            )}
            {business.is_current && <Ionicons name="checkmark-circle" size={22} color="#6366F1" />}
          </TouchableOpacity>
        ))}
        {allowAddBusiness && (
          <TouchableOpacity style={styles.fullAddBtn} onPress={() => setModalView('add-business')}>
            <View style={styles.fullAddIcon}>
              <Ionicons name="add" size={22} color="#6366F1" />
            </View>
            <Text style={styles.fullAddText}>Add New Business</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );

  // Full Locations List View
  const renderLocationsView = () => (
    <>
      <View style={styles.modalHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setModalView('main')}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>All Locations</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView style={styles.listContainer}>
        {locations.length > 1 && (
          <TouchableOpacity
            style={[styles.fullListItem, selectedLocationId === null && styles.fullListItemActive]}
            onPress={() => handleSwitchLocation(null)}
          >
            <View style={[styles.fullListIcon, { backgroundColor: '#F0FDF4' }, selectedLocationId === null && { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="globe-outline" size={22} color={selectedLocationId === null ? '#10B981' : '#6B7280'} />
            </View>
            <View style={styles.fullListInfo}>
              <Text style={[styles.fullListName, selectedLocationId === null && { color: '#10B981' }]}>All Locations</Text>
              <Text style={styles.fullListMeta}>View data across all branches</Text>
            </View>
            {selectedLocationId === null && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
          </TouchableOpacity>
        )}
        {locations.map((location) => (
          <TouchableOpacity
            key={location.id}
            style={[styles.fullListItem, selectedLocationId === location.id && styles.fullListItemActive]}
            onPress={() => handleSwitchLocation(location.id)}
          >
            <View style={[styles.fullListIcon, { backgroundColor: '#F0FDF4' }, selectedLocationId === location.id && { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="storefront-outline" size={22} color={selectedLocationId === location.id ? '#10B981' : '#6B7280'} />
            </View>
            <View style={styles.fullListInfo}>
              <Text style={[styles.fullListName, selectedLocationId === location.id && { color: '#10B981' }]}>{location.name}</Text>
              {location.address && <Text style={styles.fullListMeta}>{location.address}</Text>}
            </View>
            {location.is_default && (
              <View style={[styles.ownerBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.ownerBadgeText, { color: '#059669' }]}>Default</Text>
              </View>
            )}
            {selectedLocationId === location.id && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
          </TouchableOpacity>
        ))}
        {allowAddLocation && (
          <TouchableOpacity style={styles.fullAddBtn} onPress={() => setModalView('add-location')}>
            <View style={[styles.fullAddIcon, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
              <Ionicons name="add" size={22} color="#10B981" />
            </View>
            <Text style={[styles.fullAddText, { color: '#10B981' }]}>Add New Location</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );

  // Add Business Form
  const renderAddBusinessView = () => (
    <>
      <View style={styles.modalHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setModalView('main')}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Add Business</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.inputLabel}>Business Name *</Text>
        <TextInput
          style={styles.input}
          value={newBusinessName}
          onChangeText={setNewBusinessName}
          placeholder="Enter business name"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.inputLabel}>Country *</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => { setShowCountryList(!showCountryList); setShowIndustryList(false); }}
        >
          <Ionicons name="globe-outline" size={18} color="#6B7280" />
          <Text style={[styles.selectBtnText, newBusinessCountry && styles.selectBtnTextSelected]}>
            {newBusinessCountry || 'Select a country'}
          </Text>
          <Ionicons name={showCountryList ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
        </TouchableOpacity>
        {showCountryList && (
          <View style={styles.dropdownList}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder="Search countries..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {filteredCountries.map((country) => (
                <TouchableOpacity
                  key={country}
                  style={[styles.dropdownItem, newBusinessCountry === country && styles.dropdownItemSelected]}
                  onPress={() => { setNewBusinessCountry(country); setShowCountryList(false); setCountrySearch(''); }}
                >
                  <Text style={[styles.dropdownItemText, newBusinessCountry === country && styles.dropdownItemTextSelected]}>{country}</Text>
                  {newBusinessCountry === country && <Ionicons name="checkmark" size={16} color="#6366F1" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={styles.inputLabel}>Industry Type</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => { setShowIndustryList(!showIndustryList); setShowCountryList(false); }}
        >
          <Ionicons name={getSelectedIndustry().icon as any} size={18} color="#6366F1" />
          <Text style={[styles.selectBtnText, styles.selectBtnTextSelected]}>{getSelectedIndustry().name}</Text>
          <Ionicons name={showIndustryList ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
        </TouchableOpacity>
        {showIndustryList && (
          <View style={styles.dropdownList}>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {INDUSTRIES.map((industry) => (
                <TouchableOpacity
                  key={industry.id}
                  style={[styles.dropdownItem, styles.industryDropdownItem, newBusinessIndustry === industry.id && styles.dropdownItemSelected]}
                  onPress={() => { setNewBusinessIndustry(industry.id); setShowIndustryList(false); }}
                >
                  <View style={[styles.industryIconSmall, newBusinessIndustry === industry.id && styles.industryIconSmallSelected]}>
                    <Ionicons name={industry.icon as any} size={16} color={newBusinessIndustry === industry.id ? '#6366F1' : '#6B7280'} />
                  </View>
                  <Text style={[styles.dropdownItemText, newBusinessIndustry === industry.id && styles.dropdownItemTextSelected]}>{industry.name}</Text>
                  {newBusinessIndustry === industry.id && <Ionicons name="checkmark" size={16} color="#6366F1" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
      <View style={styles.formFooter}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalView('main')}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitBtn, isAddingBusiness && styles.submitBtnDisabled]} 
          onPress={handleAddBusiness}
          disabled={isAddingBusiness}
        >
          {isAddingBusiness ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Create</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  // Add Location Form
  const renderAddLocationView = () => (
    <>
      <View style={styles.modalHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setModalView('main')}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Add Location</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.formContainer}>
        <Text style={styles.inputLabel}>Location Name *</Text>
        <TextInput
          style={styles.input}
          value={newLocationName}
          onChangeText={setNewLocationName}
          placeholder="e.g., Main Branch, Downtown Store"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.inputLabel}>Address (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={newLocationAddress}
          onChangeText={setNewLocationAddress}
          placeholder="Enter street address"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
        />
      </View>
      <View style={styles.formFooter}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalView('main')}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: '#10B981' }, isAddingLocation && styles.submitBtnDisabled]} 
          onPress={handleAddLocation}
          disabled={isAddingLocation}
        >
          {isAddingLocation ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Create</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  // Success View - Business
  const renderSuccessBusinessView = () => (
    <View style={styles.successContainer}>
      <ConfettiCannon 
        ref={confettiRef} 
        count={100} 
        origin={{ x: 200, y: 0 }} 
        autoStart={false} 
        fadeOut={true}
        fallSpeed={4000}
        explosionSpeed={200}
        colors={['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6']} 
      />
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={40} color="#FFFFFF" />
      </View>
      <Text style={styles.successTitle}>Business Created!</Text>
      <Text style={styles.successMessage}>"{createdBusiness?.name}" is ready to use.</Text>
      <View style={styles.successCard}>
        <View style={styles.successCardIcon}>
          <Ionicons name={getCreatedIndustry().icon as any} size={24} color="#6366F1" />
        </View>
        <View style={styles.successCardInfo}>
          <Text style={styles.successCardName}>{createdBusiness?.name}</Text>
          <Text style={styles.successCardMeta}>{getCreatedIndustry().name} • {createdBusiness?.country}</Text>
        </View>
        <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
      </View>
      <View style={styles.successActions}>
        <TouchableOpacity style={styles.stayBtn} onPress={() => { resetForm(); setModalView('main'); }}>
          <Text style={styles.stayBtnText}>Stay Here</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.switchBtn} onPress={() => handleSwitchBusiness(createdBusiness?.id || '')}>
          <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
          <Text style={styles.switchBtnText}>Switch Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Success View - Location
  const renderSuccessLocationView = () => (
    <View style={styles.successContainer}>
      <ConfettiCannon 
        ref={confettiRef} 
        count={100} 
        origin={{ x: 200, y: 0 }} 
        autoStart={false} 
        fadeOut={true}
        fallSpeed={4000}
        explosionSpeed={200}
        colors={['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#047857']} 
      />
      <View style={[styles.successIcon, { backgroundColor: '#10B981' }]}>
        <Ionicons name="checkmark" size={40} color="#FFFFFF" />
      </View>
      <Text style={styles.successTitle}>Location Added!</Text>
      <Text style={styles.successMessage}>"{createdLocation?.name}" is now available.</Text>
      <View style={[styles.successCard, { borderColor: '#A7F3D0', backgroundColor: '#F0FDF4' }]}>
        <View style={[styles.successCardIcon, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="storefront" size={24} color="#10B981" />
        </View>
        <View style={styles.successCardInfo}>
          <Text style={styles.successCardName}>{createdLocation?.name}</Text>
          {createdLocation?.address && <Text style={styles.successCardMeta}>{createdLocation.address}</Text>}
        </View>
        <View style={[styles.newBadge, { backgroundColor: '#10B981' }]}><Text style={styles.newBadgeText}>NEW</Text></View>
      </View>
      <View style={styles.successActions}>
        <TouchableOpacity style={styles.stayBtn} onPress={() => { resetForm(); setModalView('main'); }}>
          <Text style={styles.stayBtnText}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.switchBtn, { backgroundColor: '#10B981' }]} onPress={() => handleSwitchLocation(createdLocation?.id || null)}>
          <Ionicons name="locate" size={18} color="#FFFFFF" />
          <Text style={styles.switchBtnText}>Switch to Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (modalView) {
      case 'main': return renderMainView();
      case 'businesses': return renderBusinessesView();
      case 'locations': return renderLocationsView();
      case 'add-business': return renderAddBusinessView();
      case 'add-location': return renderAddLocationView();
      case 'success-business': return renderSuccessBusinessView();
      case 'success-location': return renderSuccessLocationView();
      default: return renderMainView();
    }
  };

  return (
    <>
      {/* Compact Trigger Button */}
      <TouchableOpacity style={styles.triggerBtn} onPress={() => setShowModal(true)} activeOpacity={0.7}>
        <View style={styles.triggerIcon}>
          <Ionicons name={getIndustryIcon(currentBusiness?.industry || 'retail') as any} size={16} color="#6366F1" />
        </View>
        <View style={styles.triggerInfo}>
          <Text style={styles.triggerBusiness} numberOfLines={1}>
            {isLoadingBusinesses ? '...' : (currentBusiness?.name?.substring(0, 12) || 'Select')}
            {(currentBusiness?.name?.length || 0) > 12 ? '...' : ''}
          </Text>
          <View style={styles.triggerMeta}>
            <View style={[styles.triggerDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.triggerLocation} numberOfLines={1}>
              {selectedLocationId === null ? 'All' : (currentLocation?.name?.substring(0, 8) || 'Location')}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={14} color="#6B7280" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalContainer} onPress={e => e.stopPropagation()}>
            {/* Close button */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
            {renderContent()}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger Button
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  triggerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerInfo: {
    flex: 1,
    minWidth: 0,
  },
  triggerBusiness: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  triggerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  triggerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  triggerLocation: {
    fontSize: 11,
    color: '#64748B',
  },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // Main View
  mainContent: {
    padding: 16,
    paddingTop: 48,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#E0E7FF',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  listItemActive: {
    backgroundColor: '#EEF2FF',
  },
  listItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemIconActive: {
    backgroundColor: '#E0E7FF',
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  listItemTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6366F1',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  subscriptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
  },
  upgradeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  // Header with back button
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  // List Container
  listContainer: {
    maxHeight: 400,
    backgroundColor: '#FFFFFF',
  },
  fullListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  fullListItemActive: {
    backgroundColor: '#EEF2FF',
  },
  fullListIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullListIconActive: {
    backgroundColor: '#E0E7FF',
  },
  fullListInfo: {
    flex: 1,
  },
  fullListName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  fullListNameActive: {
    color: '#6366F1',
  },
  fullListMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  fullAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  fullAddIcon: {
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
  fullAddText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
  // Form
  formContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  selectBtnText: {
    flex: 1,
    fontSize: 15,
    color: '#94A3B8',
  },
  selectBtnTextSelected: {
    color: '#1E293B',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    padding: 0,
  },
  dropdownScroll: {
    maxHeight: 150,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#475569',
  },
  dropdownItemTextSelected: {
    color: '#6366F1',
    fontWeight: '500',
  },
  industryDropdownItem: {
    gap: 10,
    justifyContent: 'flex-start',
  },
  industryIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  industryIconSmallSelected: {
    backgroundColor: '#E0E7FF',
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Success
  successContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 14,
    width: '100%',
    marginBottom: 24,
  },
  successCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCardInfo: {
    flex: 1,
  },
  successCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  successCardMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  newBadgeText: {
    fontSize: 10,
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
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  stayBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
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
