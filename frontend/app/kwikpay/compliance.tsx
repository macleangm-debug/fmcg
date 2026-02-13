import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import api from '../../src/api/client';
import * as DocumentPicker from 'expo-document-picker';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#D1FAE5',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface KYCRequirements {
  country_code: string;
  country_name: string;
  currency: string;
  required_documents: {
    business: DocumentRequirement[];
    identity: DocumentRequirement[];
    address: DocumentRequirement[];
  };
  additional_info: string[];
}

interface DocumentRequirement {
  type: string;
  name: string;
  description: string;
  required: boolean;
  accepted_formats: string[];
  max_size_mb: number;
  sides?: string[];
}

interface UploadedDocument {
  document_id: string;
  type: string;
  category: string;
  file_name: string;
  status: string;
  uploaded_at: string;
  rejection_reason?: string;
}

interface KYCStatus {
  submission_id?: string;
  status: string;
  progress: number;
  documents_uploaded: number;
  documents_required: number;
  documents: UploadedDocument[];
  review_notes: any[];
  submitted_at?: string;
  approved_at?: string;
}

interface SupportedCountry {
  code: string;
  name: string;
  currency: string;
}

export default function CompliancePage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supportedCountries, setSupportedCountries] = useState<SupportedCountry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('TZ');
  const [requirements, setRequirements] = useState<KYCRequirements | null>(null);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyType, setPolicyType] = useState<string>('');
  const [policyContent, setPolicyContent] = useState<any>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);

  const fetchSupportedCountries = useCallback(async () => {
    try {
      const response = await api.get('/kyc/supported-countries');
      setSupportedCountries(response.data.countries);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
    }
  }, []);

  const fetchRequirements = useCallback(async (countryCode: string) => {
    try {
      const response = await api.get(`/kyc/requirements/${countryCode}`);
      setRequirements(response.data);
    } catch (error) {
      console.error('Failed to fetch requirements:', error);
    }
  }, []);

  const fetchKYCStatus = useCallback(async () => {
    try {
      const response = await api.get('/kyc/status');
      setKycStatus(response.data);
    } catch (error: any) {
      if (error.response?.status !== 401) {
        console.error('Failed to fetch KYC status:', error);
      }
      setKycStatus({
        status: 'not_started',
        progress: 0,
        documents_uploaded: 0,
        documents_required: 0,
        documents: [],
        review_notes: [],
      });
    }
  }, []);

  const startKYCProcess = async () => {
    try {
      setLoading(true);
      const response = await api.post('/kyc/start', { country_code: selectedCountry });
      Alert.alert('Success', 'KYC process started successfully');
      fetchKYCStatus();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start KYC process');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (docType: string, category: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      setUploading(true);

      // Read file as base64
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const base64Content = base64data.split(',')[1];

        try {
          const uploadResponse = await api.post('/kyc/documents/upload', {
            document_type: docType,
            document_category: category,
            file_name: file.name,
            file_content: base64Content,
            mime_type: file.mimeType || 'application/pdf',
          });

          Alert.alert('Success', 'Document uploaded successfully');
          fetchKYCStatus();
        } catch (error: any) {
          Alert.alert('Error', error.response?.data?.detail || 'Failed to upload document');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Document picker error:', error);
      setUploading(false);
    }
  };

  const submitKYC = async () => {
    try {
      setLoading(true);
      const response = await api.post('/kyc/submit');
      if (response.data.success) {
        Alert.alert('Success', 'KYC submitted for review');
        fetchKYCStatus();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to submit KYC');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit KYC');
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/kyc/documents/${documentId}`);
              Alert.alert('Success', 'Document deleted');
              fetchKYCStatus();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const fetchPolicy = async (type: string) => {
    setLoadingPolicy(true);
    setPolicyType(type);
    setShowPolicyModal(true);
    try {
      const response = await api.get(`/kyc/legal-policies/${selectedCountry}?policy_type=${type}`);
      setPolicyContent(response.data);
    } catch (error) {
      console.error('Failed to fetch policy:', error);
    } finally {
      setLoadingPolicy(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchSupportedCountries();
      await fetchRequirements('TZ');
      await fetchKYCStatus();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      fetchRequirements(selectedCountry);
    }
  }, [selectedCountry]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchKYCStatus();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'verified':
        return COLORS.success;
      case 'rejected':
        return COLORS.danger;
      case 'pending':
      case 'under_review':
        return COLORS.warning;
      default:
        return COLORS.gray;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'verified':
        return COLORS.successLight;
      case 'rejected':
        return COLORS.dangerLight;
      case 'pending':
      case 'under_review':
        return COLORS.warningLight;
      default:
        return COLORS.lightGray;
    }
  };

  const renderDocumentRequirement = (doc: DocumentRequirement, category: string) => {
    const uploaded = kycStatus?.documents.find(d => d.type === doc.type);
    
    return (
      <View key={doc.type} style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentInfo}>
            <Text style={styles.documentName}>{doc.name}</Text>
            <Text style={styles.documentDescription}>{doc.description}</Text>
            <Text style={styles.documentFormats}>
              Formats: {doc.accepted_formats.join(', ').toUpperCase()} | Max: {doc.max_size_mb}MB
            </Text>
          </View>
          {doc.required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          )}
        </View>

        {uploaded ? (
          <View style={styles.uploadedContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(uploaded.status) }]}>
              <Ionicons
                name={uploaded.status === 'verified' ? 'checkmark-circle' : uploaded.status === 'rejected' ? 'close-circle' : 'time'}
                size={16}
                color={getStatusColor(uploaded.status)}
              />
              <Text style={[styles.statusText, { color: getStatusColor(uploaded.status) }]}>
                {uploaded.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.uploadedFileName} numberOfLines={1}>{uploaded.file_name}</Text>
            {uploaded.rejection_reason && (
              <Text style={styles.rejectionReason}>{uploaded.rejection_reason}</Text>
            )}
            {uploaded.status !== 'verified' && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteDocument(uploaded.document_id)}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                <Text style={styles.deleteButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => handleDocumentUpload(doc.type, category)}
            disabled={uploading || kycStatus?.status === 'not_started'}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
                <Text style={styles.uploadButtonText}>Upload Document</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading KYC Information...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Compliance & KYC</Text>
            <Text style={styles.pageSubtitle}>Verify your business to accept payments</Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.bigStatusBadge, { backgroundColor: getStatusBgColor(kycStatus?.status || 'not_started') }]}>
              <Ionicons
                name={
                  kycStatus?.status === 'approved' ? 'checkmark-circle' :
                  kycStatus?.status === 'rejected' ? 'close-circle' :
                  kycStatus?.status === 'under_review' ? 'time' :
                  'document-text-outline'
                }
                size={24}
                color={getStatusColor(kycStatus?.status || 'not_started')}
              />
              <Text style={[styles.bigStatusText, { color: getStatusColor(kycStatus?.status || 'not_started') }]}>
                {(kycStatus?.status || 'not_started').replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${kycStatus?.progress || 0}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {kycStatus?.documents_uploaded || 0} of {kycStatus?.documents_required || 0} documents uploaded ({kycStatus?.progress || 0}%)
            </Text>
          </View>

          {kycStatus?.status === 'not_started' && (
            <View style={styles.startSection}>
              <Text style={styles.startText}>Select your country and start the verification process</Text>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(true)}
              >
                <Ionicons name="location-outline" size={20} color={COLORS.gray} />
                <Text style={styles.countrySelectorText}>
                  {supportedCountries.find(c => c.code === selectedCountry)?.name || 'Select Country'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.gray} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.startButton} onPress={startKYCProcess}>
                <Ionicons name="rocket-outline" size={20} color={COLORS.white} />
                <Text style={styles.startButtonText}>Start KYC Process</Text>
              </TouchableOpacity>
            </View>
          )}

          {kycStatus?.status === 'approved' && kycStatus?.approved_at && (
            <View style={styles.approvedInfo}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={styles.approvedTitle}>Your business is verified!</Text>
              <Text style={styles.approvedSubtitle}>
                Approved on {new Date(kycStatus.approved_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Legal Policies Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Policies</Text>
          <Text style={styles.sectionSubtitle}>Review our compliance documents</Text>
          <View style={styles.policiesGrid}>
            <TouchableOpacity style={styles.policyCard} onPress={() => fetchPolicy('terms_of_service')}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.blue} />
              <Text style={styles.policyName}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.policyCard} onPress={() => fetchPolicy('privacy_policy')}>
              <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.purple} />
              <Text style={styles.policyName}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.policyCard} onPress={() => fetchPolicy('aml_policy')}>
              <Ionicons name="shield-outline" size={24} color={COLORS.warning} />
              <Text style={styles.policyName}>AML Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Documents Section */}
        {kycStatus?.status !== 'not_started' && requirements && (
          <>
            {/* Business Documents */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business-outline" size={24} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Business Documents</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Upload your business registration and tax documents</Text>
              {requirements.required_documents.business.map(doc =>
                renderDocumentRequirement(doc, 'business')
              )}
            </View>

            {/* Identity Documents */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={24} color={COLORS.blue} />
                <Text style={styles.sectionTitle}>Identity Documents</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Verify the identity of directors/owners</Text>
              {requirements.required_documents.identity.map(doc =>
                renderDocumentRequirement(doc, 'identity')
              )}
            </View>

            {/* Address Documents */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location-outline" size={24} color={COLORS.purple} />
                <Text style={styles.sectionTitle}>Address Verification</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Proof of business address</Text>
              {requirements.required_documents.address.map(doc =>
                renderDocumentRequirement(doc, 'address')
              )}
            </View>

            {/* Submit Button */}
            {kycStatus?.status === 'pending' && (kycStatus?.progress || 0) >= 80 && (
              <TouchableOpacity style={styles.submitButton} onPress={submitKYC}>
                <Ionicons name="paper-plane-outline" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Submit for Review</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Review Notes */}
        {kycStatus?.review_notes && kycStatus.review_notes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles-outline" size={24} color={COLORS.warning} />
              <Text style={styles.sectionTitle}>Review Notes</Text>
            </View>
            {kycStatus.review_notes.map((note, index) => (
              <View key={index} style={styles.noteCard}>
                <Text style={styles.noteText}>{note.note}</Text>
                <Text style={styles.noteDate}>
                  {new Date(note.at).toLocaleDateString()} - {note.action}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {supportedCountries.map(country => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryOption,
                    selectedCountry === country.code && styles.countryOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCountry(country.code);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={[
                    styles.countryOptionText,
                    selectedCountry === country.code && styles.countryOptionTextSelected,
                  ]}>
                    {country.name} ({country.currency})
                  </Text>
                  {selectedCountry === country.code && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Policy Modal */}
      <Modal visible={showPolicyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.policyModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {policyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <TouchableOpacity onPress={() => setShowPolicyModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            {loadingPolicy ? (
              <View style={styles.policyLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : policyContent ? (
              <ScrollView style={styles.policyScroll}>
                <Text style={styles.policyTitle}>{policyContent.title}</Text>
                <Text style={styles.policyDate}>Effective: {policyContent.effective_date}</Text>
                <Text style={styles.policyDate}>Last Updated: {policyContent.last_updated}</Text>
                {policyContent.sections?.map((section: any, index: number) => (
                  <View key={index} style={styles.policySection}>
                    <Text style={styles.policySectionTitle}>
                      {section.number}. {section.title}
                    </Text>
                    <Text style={styles.policySectionContent}>{section.content}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  pageSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bigStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  bigStatusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  startSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  startText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
    textAlign: 'center',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    width: '100%',
    maxWidth: 300,
  },
  countrySelectorText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  approvedInfo: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  approvedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.success,
    marginTop: 12,
  },
  approvedSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 16,
    marginLeft: 34,
  },
  policiesGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  policyCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  policyName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.dark,
    textAlign: 'center',
  },
  documentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  documentInfo: {
    flex: 1,
    marginRight: 12,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
  },
  documentFormats: {
    fontSize: 11,
    color: COLORS.gray,
  },
  requiredBadge: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.danger,
  },
  uploadedContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  uploadedFileName: {
    fontSize: 13,
    color: COLORS.dark,
  },
  rejectionReason: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 8,
    fontStyle: 'italic',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 12,
    color: COLORS.danger,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  noteCard: {
    backgroundColor: COLORS.warningLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 11,
    color: COLORS.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  policyModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
  },
  countryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  countryOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  countryOptionText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  countryOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  policyLoading: {
    padding: 40,
    alignItems: 'center',
  },
  policyScroll: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  policyDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  policySection: {
    marginTop: 20,
  },
  policySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  policySectionContent: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 22,
  },
});
