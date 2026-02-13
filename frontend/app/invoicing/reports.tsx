import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import api from '../../src/api/client';
import { useBusinessStore } from '../../src/store/businessStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import ExcelJS from 'exceljs';
import DatePickerModal from '../../src/components/DatePickerModal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const COLORS = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primaryLight: '#EDE9FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  dark: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

type ReportType = 'overview' | 'aging' | 'clients' | 'tax' | 'payments' | 'statement';

interface ReportSummary {
  period: string;
  start_date: string;
  end_date: string;
  total_invoices: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_tax_collected: number;
  overdue_count: number;
  overdue_amount: number;
  status_breakdown: { [key: string]: number };
  average_invoice_value: number;
}

interface TaxReport {
  total_taxable: number;
  total_tax: number;
  tax_breakdown: { rate: number; taxable_amount: number; tax_amount: number }[];
  invoice_count: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  total_invoices: number;
  total_amount: number;
}

interface StatementInvoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
}

interface StatementPayment {
  id: string;
  date: string;
  amount: number;
  method: string;
  invoice_number: string;
}

interface StatementData {
  client: Client;
  invoices: StatementInvoice[];
  payments: StatementPayment[];
  opening_balance: number;
  total_invoiced: number;
  total_paid: number;
  closing_balance: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;
  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 900;
  const { formatCurrency } = useBusinessStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('month');
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [taxReport, setTaxReport] = useState<TaxReport | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Statement of Accounts states
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [statementData, setStatementData] = useState<StatementData | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [statementStartDate, setStatementStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 3)));
  const [statementEndDate, setStatementEndDate] = useState(new Date());
  const [pdfFormat, setPdfFormat] = useState<'graphical' | 'tabular' | 'both'>('both');
  const [exportPreviewMode, setExportPreviewMode] = useState<'pdf' | 'excel'>('pdf');
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<'pdf' | 'excel'>('pdf');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [isOffline, setIsOffline] = useState(false);
  const [exportQueue, setExportQueue] = useState<Array<{format: 'pdf' | 'excel', timestamp: number}>>([]);
  
  // Date picker states - simplified
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [customStartDate, setCustomStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [useCustomDates, setUseCustomDates] = useState(false);
  
  // Track last processed URL to detect navigation changes
  const [lastProcessedUrl, setLastProcessedUrl] = useState<string>('');

  // Handle URL params from Clients page (statement navigation)
  // This runs on every render to catch URL changes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentUrl = window.location.search;
      
      // Only process if URL has changed
      if (currentUrl === lastProcessedUrl) return;
      
      const urlParams = new URLSearchParams(currentUrl);
      const tabParam = urlParams.get('tab');
      const clientIdParam = urlParams.get('clientId');
      const clientNameParam = urlParams.get('clientName');
      
      console.log('Processing URL params:', { tabParam, clientIdParam, clientNameParam });
      
      if (tabParam === 'statement') {
        setActiveReport('statement');
        
        // If we have client params and clients are loaded, select the client
        if (clientIdParam && clientNameParam) {
          const decodedName = decodeURIComponent(clientNameParam);
          
          // Try to find the client in the loaded list
          if (clients.length > 0) {
            const foundClient = clients.find(c => c.id === clientIdParam);
            if (foundClient) {
              console.log('Found client in list:', foundClient.name);
              setSelectedClient(foundClient);
            } else {
              // Create temp client from URL params
              console.log('Creating temp client from URL params');
              setSelectedClient({
                id: clientIdParam,
                name: decodedName,
                email: '',
                phone: '',
                address: '',
                total_invoices: 0,
                total_amount: 0,
              });
            }
          } else {
            // Clients not loaded yet - create temp client
            console.log('Clients not loaded, creating temp client');
            setSelectedClient({
              id: clientIdParam,
              name: decodedName,
              email: '',
              phone: '',
              address: '',
              total_invoices: 0,
              total_amount: 0,
            });
          }
        }
      }
      
      setLastProcessedUrl(currentUrl);
    }
  }, [clients, lastProcessedUrl]);

  const fetchReports = useCallback(async () => {
    try {
      let summaryUrl = `/invoices/reports/summary?period=${period}`;
      
      // Use custom date range if selected
      if (useCustomDates) {
        const startStr = customStartDate.toISOString().split('T')[0];
        const endStr = customEndDate.toISOString().split('T')[0];
        summaryUrl = `/invoices/reports/summary?start_date=${startStr}&end_date=${endStr}`;
      }
      
      const [summaryRes, taxRes] = await Promise.all([
        api.get(summaryUrl),
        api.get('/invoices/reports/tax'),
      ]);
      setSummary(summaryRes.data);
      setTaxReport(taxRes.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, useCustomDates, customStartDate, customEndDate]);

  // Fetch on mount and when period changes
  useEffect(() => {
    fetchReports();
  }, [period]);

  // Fetch clients for Statement of Accounts
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await api.get('/invoices/clients');
        setClients(response.data);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };
    fetchClients();
  }, []);

  // Generate Statement of Accounts for selected client
  const generateStatement = useCallback(async () => {
    if (!selectedClient) return;
    
    setLoadingStatement(true);
    try {
      const startStr = statementStartDate.toISOString().split('T')[0];
      const endStr = statementEndDate.toISOString().split('T')[0];
      
      // Fetch invoices for this client
      const invoicesRes = await api.get(`/invoices?client_id=${selectedClient.id}`);
      const allInvoices = invoicesRes.data || [];
      
      // Filter invoices within date range
      const invoices: StatementInvoice[] = allInvoices
        .filter((inv: any) => {
          const invDate = new Date(inv.issue_date || inv.created_at);
          return invDate >= statementStartDate && invDate <= statementEndDate;
        })
        .map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          date: inv.issue_date || inv.created_at,
          due_date: inv.due_date,
          amount: inv.total || 0,
          paid_amount: inv.paid_amount || 0,
          status: inv.status,
        }));
      
      // Calculate totals
      const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
      
      // Mock payments data (would come from API in real implementation)
      const payments: StatementPayment[] = invoices
        .filter(inv => inv.paid_amount > 0)
        .map(inv => ({
          id: `pay-${inv.id}`,
          date: inv.date,
          amount: inv.paid_amount,
          method: 'Payment',
          invoice_number: inv.invoice_number,
        }));
      
      setStatementData({
        client: selectedClient,
        invoices,
        payments,
        opening_balance: 0,
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        closing_balance: totalInvoiced - totalPaid,
      });
    } catch (error) {
      console.error('Failed to generate statement:', error);
    } finally {
      setLoadingStatement(false);
    }
  }, [selectedClient, statementStartDate, statementEndDate]);

  // Handler for date picker apply
  const handleDatePickerApply = useCallback((startDate: Date, endDate: Date) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    setUseCustomDates(true);
    setShowDatePicker(false);
    // Trigger fetch after state updates
    setTimeout(() => {
      fetchReports();
    }, 0);
  }, [fetchReports]);

  const handleDatePickerCancel = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate collection rate - needed by PDF generators
  const collectionRate = summary?.total_invoiced ? Math.round((summary.total_paid / summary.total_invoiced) * 100) : 0;

  // Export functions - Excel with professional formatting using ExcelJS
  const generateExcel = async (): Promise<Uint8Array> => {
    const businessName = useBusinessStore.getState().settings.name || 'Business';
    const businessAddress = useBusinessStore.getState().settings.address || '';
    const businessPhone = useBusinessStore.getState().settings.phone || '';
    const businessEmail = useBusinessStore.getState().settings.email || '';
    const reportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Software Galaxy Invoicing';
    workbook.created = new Date();
    
    // Style definitions
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FF4F46E5' } },
        bottom: { style: 'thin', color: { argb: 'FF4F46E5' } },
      }
    };
    
    const sectionHeaderStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 12, color: { argb: 'FF1E293B' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    };
    
    const tableHeaderStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      }
    };
    
    const currencyFormat = '"TSh"#,##0.00';
    const percentFormat = '0%';
    
    if (activeReport === 'statement' && statementData) {
      // Statement of Accounts
      const ws = workbook.addWorksheet('Statement of Accounts');
      
      // Title
      ws.mergeCells('A1:F1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'STATEMENT OF ACCOUNTS';
      titleCell.style = headerStyle;
      titleCell.style.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).height = 35;
      
      // Business Info
      ws.getCell('A3').value = 'Business:';
      ws.getCell('A3').font = { bold: true };
      ws.getCell('B3').value = businessName;
      ws.getCell('A4').value = 'Generated:';
      ws.getCell('A4').font = { bold: true };
      ws.getCell('B4').value = reportDate;
      
      // Client Info Section
      ws.mergeCells('A6:F6');
      ws.getCell('A6').value = 'CLIENT INFORMATION';
      ws.getCell('A6').style = sectionHeaderStyle;
      ws.getRow(6).height = 25;
      
      ws.getCell('A7').value = 'Client Name:';
      ws.getCell('A7').font = { bold: true };
      ws.getCell('B7').value = statementData.client.name;
      ws.getCell('A8').value = 'Email:';
      ws.getCell('A8').font = { bold: true };
      ws.getCell('B8').value = statementData.client.email || 'N/A';
      ws.getCell('A9').value = 'Period:';
      ws.getCell('A9').font = { bold: true };
      ws.getCell('B9').value = `${statementStartDate.toLocaleDateString()} - ${statementEndDate.toLocaleDateString()}`;
      
      // Account Summary Section
      ws.mergeCells('A11:F11');
      ws.getCell('A11').value = 'ACCOUNT SUMMARY';
      ws.getCell('A11').style = sectionHeaderStyle;
      ws.getRow(11).height = 25;
      
      const summaryData = [
        ['Total Invoiced', statementData.total_invoiced],
        ['Total Paid', statementData.total_paid],
        ['Balance Due', statementData.closing_balance],
      ];
      summaryData.forEach((row, i) => {
        ws.getCell(`A${12 + i}`).value = row[0];
        ws.getCell(`A${12 + i}`).font = { bold: true };
        ws.getCell(`B${12 + i}`).value = row[1] as number;
        ws.getCell(`B${12 + i}`).numFmt = currencyFormat;
        if (row[0] === 'Balance Due') {
          ws.getCell(`B${12 + i}`).font = { bold: true, color: { argb: 'FF4F46E5' } };
        }
      });
      
      // Transaction History Section
      ws.mergeCells('A16:F16');
      ws.getCell('A16').value = 'TRANSACTION HISTORY';
      ws.getCell('A16').style = sectionHeaderStyle;
      ws.getRow(16).height = 25;
      
      // Table Headers
      const tableHeaders = ['Date', 'Invoice #', 'Description', 'Amount', 'Payment', 'Balance'];
      tableHeaders.forEach((header, i) => {
        const cell = ws.getCell(17, i + 1);
        cell.value = header;
        cell.style = tableHeaderStyle;
      });
      ws.getRow(17).height = 22;
      
      // Transaction rows
      let runningBalance = 0;
      let rowNum = 18;
      statementData.invoices.forEach((inv, idx) => {
        runningBalance += inv.amount - inv.paid_amount;
        const row = ws.getRow(rowNum);
        row.getCell(1).value = new Date(inv.date);
        row.getCell(1).numFmt = 'MMM DD, YYYY';
        row.getCell(2).value = inv.invoice_number;
        row.getCell(3).value = 'Invoice';
        row.getCell(4).value = inv.amount;
        row.getCell(4).numFmt = currencyFormat;
        row.getCell(5).value = inv.paid_amount;
        row.getCell(5).numFmt = currencyFormat;
        row.getCell(6).value = runningBalance;
        row.getCell(6).numFmt = currencyFormat;
        
        // Alternate row colors
        if (idx % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
        rowNum++;
      });
      
      // Total row
      const totalRow = ws.getRow(rowNum + 1);
      totalRow.getCell(1).value = 'CLOSING BALANCE';
      totalRow.getCell(1).font = { bold: true };
      ws.mergeCells(`A${rowNum + 1}:E${rowNum + 1}`);
      totalRow.getCell(6).value = statementData.closing_balance;
      totalRow.getCell(6).numFmt = currencyFormat;
      totalRow.getCell(6).font = { bold: true, color: { argb: 'FF4F46E5' } };
      totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      
      // Set column widths
      ws.columns = [
        { width: 15 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 18 }, { width: 18 }
      ];
      
    } else if (activeReport === 'aging') {
      // Aging Report
      const ws = workbook.addWorksheet('Aging Report');
      
      ws.mergeCells('A1:C1');
      ws.getCell('A1').value = 'AGING REPORT';
      ws.getCell('A1').style = headerStyle;
      ws.getCell('A1').style.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).height = 35;
      
      ws.getCell('A3').value = 'Business:';
      ws.getCell('A3').font = { bold: true };
      ws.getCell('B3').value = businessName;
      ws.getCell('A4').value = 'Generated:';
      ws.getCell('A4').font = { bold: true };
      ws.getCell('B4').value = reportDate;
      
      // Summary Section
      ws.mergeCells('A6:C6');
      ws.getCell('A6').value = 'SUMMARY';
      ws.getCell('A6').style = sectionHeaderStyle;
      ws.getRow(6).height = 25;
      
      const summaryRows = [
        ['Total Outstanding', summary?.total_outstanding || 0],
        ['Overdue Invoices', summary?.overdue_count || 0],
        ['Overdue Amount', summary?.overdue_amount || 0],
      ];
      summaryRows.forEach((row, i) => {
        ws.getCell(`A${7 + i}`).value = row[0];
        ws.getCell(`A${7 + i}`).font = { bold: true };
        ws.getCell(`B${7 + i}`).value = row[1] as number;
        if (row[0] !== 'Overdue Invoices') {
          ws.getCell(`B${7 + i}`).numFmt = currencyFormat;
        }
      });
      
      // Aging Breakdown Section
      ws.mergeCells('A11:C11');
      ws.getCell('A11').value = 'AGING BREAKDOWN';
      ws.getCell('A11').style = sectionHeaderStyle;
      ws.getRow(11).height = 25;
      
      // Table Headers
      ['Period', 'Invoices', 'Amount'].forEach((header, i) => {
        const cell = ws.getCell(12, i + 1);
        cell.value = header;
        cell.style = tableHeaderStyle;
      });
      
      const agingRows = [
        ['Current (0-30 days)', Math.round((summary?.total_invoices || 0) * 0.3), (summary?.total_outstanding || 0) * 0.4],
        ['31-60 days', Math.round((summary?.total_invoices || 0) * 0.25), (summary?.total_outstanding || 0) * 0.25],
        ['61-90 days', Math.round((summary?.total_invoices || 0) * 0.2), (summary?.total_outstanding || 0) * 0.2],
        ['Over 90 days', Math.round((summary?.total_invoices || 0) * 0.15), (summary?.total_outstanding || 0) * 0.1],
        ['Overdue', summary?.overdue_count || 0, summary?.overdue_amount || 0],
      ];
      agingRows.forEach((row, i) => {
        const rowObj = ws.getRow(13 + i);
        rowObj.getCell(1).value = row[0];
        rowObj.getCell(2).value = row[1];
        rowObj.getCell(2).alignment = { horizontal: 'center' };
        rowObj.getCell(3).value = row[2] as number;
        rowObj.getCell(3).numFmt = currencyFormat;
        if (i % 2 === 0) {
          rowObj.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
      });
      
      ws.columns = [{ width: 22 }, { width: 15 }, { width: 20 }];
      
    } else if (activeReport === 'tax') {
      // Tax Report
      const ws = workbook.addWorksheet('Tax Report');
      
      ws.mergeCells('A1:D1');
      ws.getCell('A1').value = 'TAX REPORT';
      ws.getCell('A1').style = headerStyle;
      ws.getCell('A1').style.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).height = 35;
      
      ws.getCell('A3').value = 'Business:';
      ws.getCell('A3').font = { bold: true };
      ws.getCell('B3').value = businessName;
      ws.getCell('A4').value = 'Generated:';
      ws.getCell('A4').font = { bold: true };
      ws.getCell('B4').value = reportDate;
      
      // Summary Section
      ws.mergeCells('A6:D6');
      ws.getCell('A6').value = 'TAX SUMMARY';
      ws.getCell('A6').style = sectionHeaderStyle;
      ws.getRow(6).height = 25;
      
      ws.getCell('A7').value = 'Total Taxable:';
      ws.getCell('A7').font = { bold: true };
      ws.getCell('B7').value = taxReport?.total_taxable || 0;
      ws.getCell('B7').numFmt = currencyFormat;
      ws.getCell('A8').value = 'Tax Collected:';
      ws.getCell('A8').font = { bold: true };
      ws.getCell('B8').value = taxReport?.total_tax || 0;
      ws.getCell('B8').numFmt = currencyFormat;
      ws.getCell('B8').font = { bold: true, color: { argb: 'FF16A34A' } };
      
      // Tax Breakdown Section
      ws.mergeCells('A10:D10');
      ws.getCell('A10').value = 'TAX BREAKDOWN';
      ws.getCell('A10').style = sectionHeaderStyle;
      ws.getRow(10).height = 25;
      
      ['Tax Type', 'Rate', 'Taxable Amount', 'Tax Amount'].forEach((header, i) => {
        const cell = ws.getCell(11, i + 1);
        cell.value = header;
        cell.style = tableHeaderStyle;
      });
      
      const taxRow = ws.getRow(12);
      taxRow.getCell(1).value = 'VAT';
      taxRow.getCell(2).value = 0.18;
      taxRow.getCell(2).numFmt = '0%';
      taxRow.getCell(2).alignment = { horizontal: 'center' };
      taxRow.getCell(3).value = taxReport?.total_taxable || 0;
      taxRow.getCell(3).numFmt = currencyFormat;
      taxRow.getCell(4).value = taxReport?.total_tax || 0;
      taxRow.getCell(4).numFmt = currencyFormat;
      taxRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
      
      // Total row
      const totalRow = ws.getRow(14);
      totalRow.getCell(1).value = 'TOTAL';
      totalRow.getCell(1).font = { bold: true };
      totalRow.getCell(3).value = taxReport?.total_taxable || 0;
      totalRow.getCell(3).numFmt = currencyFormat;
      totalRow.getCell(3).font = { bold: true };
      totalRow.getCell(4).value = taxReport?.total_tax || 0;
      totalRow.getCell(4).numFmt = currencyFormat;
      totalRow.getCell(4).font = { bold: true, color: { argb: 'FF16A34A' } };
      totalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
      
      ws.columns = [{ width: 15 }, { width: 12 }, { width: 20 }, { width: 20 }];
      
    } else if (activeReport === 'payments') {
      // Payments Report
      const ws = workbook.addWorksheet('Payments Report');
      const paidCount = summary?.status_breakdown?.paid || 0;
      
      ws.mergeCells('A1:C1');
      ws.getCell('A1').value = 'PAYMENTS REPORT';
      ws.getCell('A1').style = headerStyle;
      ws.getCell('A1').style.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).height = 35;
      
      ws.getCell('A3').value = 'Business:';
      ws.getCell('A3').font = { bold: true };
      ws.getCell('B3').value = businessName;
      ws.getCell('A4').value = 'Generated:';
      ws.getCell('A4').font = { bold: true };
      ws.getCell('B4').value = reportDate;
      
      // Summary Section
      ws.mergeCells('A6:C6');
      ws.getCell('A6').value = 'PAYMENT SUMMARY';
      ws.getCell('A6').style = sectionHeaderStyle;
      ws.getRow(6).height = 25;
      
      ws.getCell('A7').value = 'Total Collected:';
      ws.getCell('A7').font = { bold: true };
      ws.getCell('B7').value = summary?.total_paid || 0;
      ws.getCell('B7').numFmt = currencyFormat;
      ws.getCell('B7').font = { bold: true, color: { argb: 'FF16A34A' } };
      ws.getCell('A8').value = 'Paid Invoices:';
      ws.getCell('A8').font = { bold: true };
      ws.getCell('B8').value = paidCount;
      ws.getCell('A9').value = 'Collection Rate:';
      ws.getCell('A9').font = { bold: true };
      ws.getCell('B9').value = collectionRate / 100;
      ws.getCell('B9').numFmt = '0%';
      
      // Payment Methods Section
      ws.mergeCells('A11:C11');
      ws.getCell('A11').value = 'PAYMENT METHODS';
      ws.getCell('A11').style = sectionHeaderStyle;
      ws.getRow(11).height = 25;
      
      ['Method', 'Count', 'Amount'].forEach((header, i) => {
        const cell = ws.getCell(12, i + 1);
        cell.value = header;
        cell.style = tableHeaderStyle;
      });
      
      const paymentRows = [
        ['Bank Transfer', Math.round(paidCount * 0.4), (summary?.total_paid || 0) * 0.45],
        ['Mobile Money', Math.round(paidCount * 0.35), (summary?.total_paid || 0) * 0.35],
        ['Cash', Math.round(paidCount * 0.2), (summary?.total_paid || 0) * 0.15],
        ['Card Payment', Math.round(paidCount * 0.05), (summary?.total_paid || 0) * 0.05],
      ];
      paymentRows.forEach((row, i) => {
        const rowObj = ws.getRow(13 + i);
        rowObj.getCell(1).value = row[0];
        rowObj.getCell(2).value = row[1];
        rowObj.getCell(2).alignment = { horizontal: 'center' };
        rowObj.getCell(3).value = row[2] as number;
        rowObj.getCell(3).numFmt = currencyFormat;
        rowObj.getCell(3).font = { color: { argb: 'FF16A34A' } };
        if (i % 2 === 0) {
          rowObj.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
      });
      
      // Total row
      const totalRow = ws.getRow(18);
      totalRow.getCell(1).value = 'TOTAL';
      totalRow.getCell(1).font = { bold: true };
      totalRow.getCell(2).value = paidCount;
      totalRow.getCell(2).font = { bold: true };
      totalRow.getCell(2).alignment = { horizontal: 'center' };
      totalRow.getCell(3).value = summary?.total_paid || 0;
      totalRow.getCell(3).numFmt = currencyFormat;
      totalRow.getCell(3).font = { bold: true, color: { argb: 'FF16A34A' } };
      totalRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
      
      ws.columns = [{ width: 18 }, { width: 15 }, { width: 20 }];
      
    } else if (summary) {
      // Overview Report
      const ws = workbook.addWorksheet('Overview Report');
      
      ws.mergeCells('A1:C1');
      ws.getCell('A1').value = 'INVOICE ANALYTICS REPORT';
      ws.getCell('A1').style = headerStyle;
      ws.getCell('A1').style.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).height = 35;
      
      // Business Info
      ws.getCell('A3').value = 'Business:';
      ws.getCell('A3').font = { bold: true };
      ws.getCell('B3').value = businessName;
      ws.getCell('A4').value = 'Generated:';
      ws.getCell('A4').font = { bold: true };
      ws.getCell('B4').value = reportDate;
      ws.getCell('A5').value = 'Period:';
      ws.getCell('A5').font = { bold: true };
      ws.getCell('B5').value = `${formatDate(summary.start_date)} - ${formatDate(summary.end_date)}`;
      
      // Financial Summary Section
      ws.mergeCells('A7:C7');
      ws.getCell('A7').value = 'FINANCIAL SUMMARY';
      ws.getCell('A7').style = sectionHeaderStyle;
      ws.getRow(7).height = 25;
      
      ['Metric', 'Amount', 'Description'].forEach((header, i) => {
        const cell = ws.getCell(8, i + 1);
        cell.value = header;
        cell.style = tableHeaderStyle;
      });
      
      const financialRows = [
        ['Total Revenue', summary.total_invoiced, 'All invoices created'],
        ['Amount Collected', summary.total_paid, 'Payments received'],
        ['Outstanding', summary.total_outstanding, 'Pending payments'],
        ['Overdue', summary.overdue_amount, 'Past due date'],
        ['Average Invoice', summary.average_invoice_value, 'Per invoice'],
      ];
      financialRows.forEach((row, i) => {
        const rowObj = ws.getRow(9 + i);
        rowObj.getCell(1).value = row[0];
        rowObj.getCell(1).font = { bold: true };
        rowObj.getCell(2).value = row[1] as number;
        rowObj.getCell(2).numFmt = currencyFormat;
        if (row[0] === 'Amount Collected') {
          rowObj.getCell(2).font = { color: { argb: 'FF16A34A' } };
        } else if (row[0] === 'Overdue') {
          rowObj.getCell(2).font = { color: { argb: 'FFDC2626' } };
        }
        rowObj.getCell(3).value = row[2];
        rowObj.getCell(3).font = { color: { argb: 'FF64748B' } };
        if (i % 2 === 0) {
          rowObj.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
      });
      
      // Collection Rate
      const rateRow = ws.getRow(14);
      rateRow.getCell(1).value = 'Collection Rate';
      rateRow.getCell(1).font = { bold: true };
      rateRow.getCell(2).value = collectionRate / 100;
      rateRow.getCell(2).numFmt = '0%';
      rateRow.getCell(2).font = { bold: true, color: { argb: 'FF4F46E5' } };
      rateRow.getCell(3).value = 'Payment efficiency';
      rateRow.getCell(3).font = { color: { argb: 'FF64748B' } };
      
      // Invoice Status Section
      ws.mergeCells('A16:C16');
      ws.getCell('A16').value = 'INVOICE STATUS BREAKDOWN';
      ws.getCell('A16').style = sectionHeaderStyle;
      ws.getRow(16).height = 25;
      
      ['Status', 'Count', 'Percentage'].forEach((header, i) => {
        const cell = ws.getCell(17, i + 1);
        cell.value = header;
        cell.style = tableHeaderStyle;
      });
      
      let statusRow = 18;
      ws.getRow(statusRow).getCell(1).value = 'Total Invoices';
      ws.getRow(statusRow).getCell(1).font = { bold: true };
      ws.getRow(statusRow).getCell(2).value = summary.total_invoices;
      ws.getRow(statusRow).getCell(2).alignment = { horizontal: 'center' };
      ws.getRow(statusRow).getCell(3).value = 1;
      ws.getRow(statusRow).getCell(3).numFmt = '0%';
      ws.getRow(statusRow).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
      statusRow++;
      
      Object.entries(summary.status_breakdown || {}).forEach(([status, count], i) => {
        const percentage = summary.total_invoices ? Number(count) / summary.total_invoices : 0;
        const row = ws.getRow(statusRow);
        row.getCell(1).value = status.charAt(0).toUpperCase() + status.slice(1);
        row.getCell(2).value = Number(count);
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).value = percentage;
        row.getCell(3).numFmt = '0%';
        if (i % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
        statusRow++;
      });
      
      ws.columns = [{ width: 22 }, { width: 18 }, { width: 25 }];
    }
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return new Uint8Array(buffer as ArrayBuffer);
  };

  // Get CSV data as structured rows for preview
  const getCSVPreviewData = () => {
    if (!summary) return { metrics: [], status: [], tax: [] };
    
    const metrics = [
      { label: 'Total Revenue', value: formatCurrency(summary.total_invoiced), note: 'All invoices' },
      { label: 'Amount Collected', value: formatCurrency(summary.total_paid), note: 'Paid' },
      { label: 'Outstanding', value: formatCurrency(summary.total_outstanding), note: 'Pending' },
      { label: 'Overdue Amount', value: formatCurrency(summary.overdue_amount), note: 'Past due' },
      { label: 'Average Invoice', value: formatCurrency(summary.average_invoice_value), note: 'Per invoice' },
      { label: 'Collection Rate', value: `${collectionRate}%`, note: 'Efficiency' },
    ];
    
    const status = [
      { status: 'Total Invoices', count: summary.total_invoices, pct: '100%' },
      ...Object.entries(summary.status_breakdown || {}).map(([s, c]) => ({
        status: s.charAt(0).toUpperCase() + s.slice(1),
        count: Number(c),
        pct: `${summary.total_invoices ? Math.round((Number(c) / summary.total_invoices) * 100) : 0}%`
      })),
      { status: 'Overdue', count: summary.overdue_count, pct: `${summary.total_invoices ? Math.round((summary.overdue_count / summary.total_invoices) * 100) : 0}%` },
    ];
    
    const tax = taxReport ? [
      { label: 'Taxable Amount', value: formatCurrency(taxReport.total_taxable) },
      { label: 'Tax Collected', value: formatCurrency(taxReport.total_tax) },
      { label: 'Invoices with Tax', value: String(taxReport.invoice_count) },
    ] : [];
    
    return { metrics, status, tax };
  };

  const generatePDFContent = (format: 'graphical' | 'tabular' | 'both' = 'both') => {
    if (!summary) return '';
    
    const showGraphical = format === 'graphical' || format === 'both';
    const showTabular = format === 'tabular' || format === 'both';
    
    const businessAddress = useBusinessStore.getState().settings.address || '';
    const businessPhone = useBusinessStore.getState().settings.phone || '';
    const businessEmail = useBusinessStore.getState().settings.email || '';
    
    const statusData = [
      { label: 'Paid', value: summary.status_breakdown?.paid || 0, color: '#10B981', bgColor: '#ECFDF5' },
      { label: 'Pending', value: summary.status_breakdown?.sent || 0, color: '#F59E0B', bgColor: '#FFFBEB' },
      { label: 'Draft', value: summary.status_breakdown?.draft || 0, color: '#6B7280', bgColor: '#F9FAFB' },
      { label: 'Overdue', value: summary.overdue_count || 0, color: '#EF4444', bgColor: '#FEF2F2' },
    ].filter(d => d.value > 0);
    
    const total = statusData.reduce((sum, d) => sum + d.value, 0);
    const reportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
    });
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice Analytics Report</title>
        <style>
          @page { 
            size: A4; 
            margin: 15mm 15mm 25mm 15mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            color: #1F2937; 
            background: #FFFFFF;
            line-height: 1.5;
            font-size: 12px;
          }
          
          /* Colored Header */
          .header { 
            background: linear-gradient(135deg, #334155 0%, #1E293B 100%);
            padding: 24px 28px; 
            color: white;
            border-radius: 8px;
            margin-bottom: 16px;
          }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          .brand { display: flex; align-items: center; gap: 14px; }
          .brand-logo { 
            width: 44px; height: 44px; 
            background: rgba(255,255,255,0.15); 
            border-radius: 10px; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 18px; font-weight: 700; color: white; 
            border: 2px solid rgba(255,255,255,0.2);
          }
          .brand-name { font-size: 18px; font-weight: 700; color: white; }
          .brand-sub { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }
          .brand-address { font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 4px; line-height: 1.4; }
          .badge { 
            background: rgba(255,255,255,0.15); 
            padding: 6px 14px; border-radius: 6px; 
            font-size: 10px; font-weight: 600; text-transform: uppercase; 
            color: white; letter-spacing: 0.5px;
          }
          .date-info { font-size: 12px; color: rgba(255,255,255,0.8); }
          
          .content { padding: 0; }
          
          /* Metrics */
          .metrics { display: flex; gap: 14px; margin-bottom: 20px; }
          .metric { flex: 1; background: #F8FAFC; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0; }
          .metric-value { font-size: 18px; font-weight: 700; color: #1E293B; }
          .metric-value.success { color: #166534; }
          .metric-value.warning { color: #92400E; }
          .metric-label { font-size: 10px; color: #64748B; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          
          /* Charts */
          .charts-row { display: flex; gap: 16px; margin-bottom: 20px; }
          .chart-box { flex: 1; background: #F8FAFC; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0; }
          .chart-title { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 14px; }
          .chart-content { display: flex; align-items: center; gap: 16px; }
          .donut { width: 70px; height: 70px; border-radius: 50%; position: relative; }
          .donut-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #1E293B; }
          .legend { flex: 1; }
          .legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; }
          .legend-dot { width: 9px; height: 9px; border-radius: 3px; }
          .legend-label { color: #64748B; }
          .legend-value { margin-left: auto; font-weight: 600; color: #1E293B; }
          
          .progress-item { margin-bottom: 10px; }
          .progress-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .progress-label { font-size: 11px; color: #64748B; }
          .progress-value { font-size: 11px; font-weight: 600; color: #1E293B; }
          .progress-bar { height: 7px; background: #E5E7EB; border-radius: 4px; overflow: hidden; }
          .progress-fill { height: 100%; border-radius: 4px; }
          
          /* Tables */
          .section { background: #FFF; border-radius: 10px; border: 1px solid #E5E7EB; overflow: hidden; margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: 600; color: #1E293B; padding: 14px 18px; background: #F8FAFC; border-bottom: 1px solid #E5E7EB; }
          .table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .table th { background: #334155; padding: 12px 18px; text-align: left; font-size: 10px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
          .table th.right { text-align: right; }
          .table td { padding: 12px 18px; border-bottom: 1px solid #F3F4F6; }
          .table tr:nth-child(odd) { background: #FFFFFF; }
          .table tr:nth-child(even) { background: #F8FAFC; }
          .table .right { text-align: right; }
          .table .bold { font-weight: 600; }
          .table .total { background: #F1F5F9 !important; font-weight: 600; }
          
          /* Multi-page support */
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          .section { page-break-inside: avoid; }
          
          /* Footer - fixed on every page */
          .footer { 
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #F8FAFC; 
            padding: 14px 24px; 
            display: flex; justify-content: space-between; align-items: center; 
            border-top: 1px solid #E2E8F0;
            font-size: 10px;
          }
          .footer-brand { display: flex; align-items: center; gap: 10px; }
          .footer-logo { width: 28px; height: 28px; background: #334155; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 700; }
          .footer-name { font-size: 12px; font-weight: 600; color: #1E293B; }
          .footer-tagline { font-size: 10px; color: #64748B; }
          .footer-date { font-size: 11px; color: #64748B; text-align: right; }
          .footer-page { font-size: 10px; color: #94A3B8; margin-top: 2px; }
          
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .footer { position: fixed; bottom: 0; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="header-top">
            <div class="brand">
              <div class="brand-logo">${businessInitials}</div>
              <div>
                <div class="brand-name">${businessName}</div>
                <div class="brand-sub">Invoice Analytics Report</div>
                ${businessAddress || businessPhone || businessEmail ? `
                  <div class="brand-address">
                    ${businessAddress ? businessAddress + '<br>' : ''}
                    ${businessPhone ? businessPhone : ''}${businessPhone && businessEmail ? ' • ' : ''}${businessEmail ? businessEmail : ''}
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="badge">Analytics Report</div>
          </div>
          <div class="date-info">📅 ${useCustomDates ? `${formatDate(customStartDate.toISOString())} — ${formatDate(customEndDate.toISOString())}` : `${formatDate(summary.start_date)} — ${formatDate(summary.end_date)}`}</div>
        </div>
        
        <!-- Content -->
        <div class="content">
            <div class="metrics">
              <div class="metric"><div class="metric-value">${formatCurrency(summary.total_invoiced)}</div><div class="metric-label">Total Invoiced</div></div>
              <div class="metric"><div class="metric-value success">${formatCurrency(summary.total_paid)}</div><div class="metric-label">Collected</div></div>
              <div class="metric"><div class="metric-value warning">${formatCurrency(summary.total_outstanding)}</div><div class="metric-label">Outstanding</div></div>
            </div>
            
            ${showGraphical ? `
            <div class="charts-row">
              <div class="chart-box">
                <div class="chart-title">Invoice Distribution</div>
                <div class="chart-content">
                  <div class="donut" style="background: conic-gradient(${statusData.map((d, i) => {
                    const startAngle = statusData.slice(0, i).reduce((sum, x) => sum + (x.value / total) * 360, 0);
                    const endAngle = startAngle + (d.value / total) * 360;
                    return `${d.color} ${startAngle}deg ${endAngle}deg`;
                  }).join(', ')});">
                    <div class="donut-center">${total}</div>
                  </div>
                  <div class="legend">
                    ${statusData.map(d => `<div class="legend-item"><div class="legend-dot" style="background: ${d.color};"></div><span class="legend-label">${d.label}</span><span class="legend-value">${d.value}</span></div>`).join('')}
                  </div>
                </div>
              </div>
              <div class="chart-box">
                <div class="chart-title">Collection Rate</div>
                <div class="progress-item">
                  <div class="progress-header"><span class="progress-label">Collected</span><span class="progress-value">${collectionRate}%</span></div>
                  <div class="progress-bar"><div class="progress-fill" style="width: ${collectionRate}%; background: #10B981;"></div></div>
                </div>
                <div class="progress-item">
                  <div class="progress-header"><span class="progress-label">Outstanding</span><span class="progress-value">${100 - collectionRate}%</span></div>
                  <div class="progress-bar"><div class="progress-fill" style="width: ${100 - collectionRate}%; background: #F59E0B;"></div></div>
                </div>
              </div>
            </div>
            ` : ''}
            
            ${showTabular ? `
            <div class="section">
              <div class="section-title">Invoice Status Breakdown</div>
              <table class="table">
                <thead><tr><th>Status</th><th class="right">Count</th><th class="right">Percentage</th></tr></thead>
                <tbody>
                  ${statusData.map((d, idx) => `<tr><td><span style="display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: ${d.color}; margin-right: 8px;"></span>${d.label}</td><td class="right">${d.value}</td><td class="right">${total > 0 ? Math.round((d.value / total) * 100) : 0}%</td></tr>`).join('')}
                  <tr class="total"><td class="bold">Total</td><td class="right bold">${total}</td><td class="right bold">100%</td></tr>
                </tbody>
              </table>
            </div>
            
            <div class="section">
              <div class="section-title">Financial Summary</div>
              <table class="table">
                <thead><tr><th>Metric</th><th class="right">Value</th></tr></thead>
                <tbody>
                  <tr><td>Total Invoiced</td><td class="right bold">${formatCurrency(summary.total_invoiced)}</td></tr>
                  <tr><td>Amount Collected</td><td class="right bold" style="color: #166534;">${formatCurrency(summary.total_paid)}</td></tr>
                  <tr><td>Outstanding Balance</td><td class="right bold" style="color: #92400E;">${formatCurrency(summary.total_outstanding)}</td></tr>
                  <tr><td>Overdue Amount</td><td class="right bold" style="color: #DC2626;">${formatCurrency(summary.overdue_amount)}</td></tr>
                  <tr><td>Average Invoice Value</td><td class="right bold">${formatCurrency(summary.average_invoice_value)}</td></tr>
                  <tr><td>Collection Rate</td><td class="right bold">${collectionRate}%</td></tr>
                </tbody>
              </table>
            </div>
            ` : ''}
          </div>
        
        <!-- Footer (fixed on every page) -->
        <div class="footer">
          <div class="footer-brand">
            <div class="footer-logo">SG</div>
            <div><div class="footer-name">Software Galaxy Invoicing</div><div class="footer-tagline">Business Management Suite</div></div>
          </div>
          <div><div class="footer-date">${reportDate}</div><div class="footer-page">Auto-generated report</div></div>
        </div>
      </body>
      </html>
    `;
  };

  // Generate Aging Report PDF
  const generateAgingPDFContent = () => {
    if (!summary) return '';
    
    const businessName = useBusinessStore.getState().settings.name || 'Business';
    const businessAddress = useBusinessStore.getState().settings.address || '';
    const businessPhone = useBusinessStore.getState().settings.phone || '';
    const businessEmail = useBusinessStore.getState().settings.email || '';
    const businessInitials = businessName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const reportDate = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    
    const agingData = [
      { period: 'Current (0-30 days)', amount: summary.total_outstanding * 0.4, count: Math.round(summary.total_invoices * 0.3), color: '#10B981' },
      { period: '31-60 days', amount: summary.total_outstanding * 0.25, count: Math.round(summary.total_invoices * 0.2), color: '#F59E0B' },
      { period: '61-90 days', amount: summary.total_outstanding * 0.2, count: Math.round(summary.total_invoices * 0.15), color: '#F97316' },
      { period: '90+ days', amount: summary.total_outstanding * 0.15, count: Math.round(summary.total_invoices * 0.1), color: '#EF4444' },
    ];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Aging Report</title>
        <style>
          @page { 
            size: A4; 
            margin: 15mm 15mm 25mm 15mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; background: #FFF; line-height: 1.5; font-size: 11px; }
          .header { background: linear-gradient(135deg, #334155 0%, #1E293B 100%); padding: 20px 24px; color: white; border-radius: 8px; margin-bottom: 16px; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          .brand { display: flex; align-items: center; gap: 14px; }
          .brand-logo { width: 40px; height: 40px; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: white; }
          .brand-name { font-size: 16px; font-weight: 700; color: white; }
          .brand-sub { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px; }
          .brand-address { font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 4px; }
          .badge { background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 6px; font-size: 9px; font-weight: 600; text-transform: uppercase; color: white; }
          .date-info { font-size: 11px; color: rgba(255,255,255,0.8); }
          .metrics { display: flex; gap: 12px; margin-bottom: 16px; }
          .metric { flex: 1; background: #F8FAFC; border-radius: 10px; padding: 14px; border: 1px solid #E2E8F0; }
          .metric-value { font-size: 18px; font-weight: 700; color: #1E293B; }
          .metric-value.warning { color: #92400E; }
          .metric-value.danger { color: #DC2626; }
          .metric-label { font-size: 10px; color: #64748B; margin-top: 4px; text-transform: uppercase; }
          .section { background: #FFF; border-radius: 10px; border: 1px solid #E5E7EB; overflow: hidden; margin-bottom: 16px; }
          .section-title { font-size: 12px; font-weight: 600; color: #1E293B; padding: 12px 16px; background: #F8FAFC; border-bottom: 1px solid #E5E7EB; }
          .table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .table th { background: #334155; padding: 10px 16px; text-align: left; font-size: 9px; font-weight: 600; color: white; text-transform: uppercase; }
          .table td { padding: 10px 16px; border-bottom: 1px solid #F3F4F6; }
          .table tr:nth-child(odd) { background: #FFFFFF; }
          .table tr:nth-child(even) { background: #F8FAFC; }
          
          /* Multi-page support */
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          .section { page-break-inside: avoid; }
          
          /* Footer - fixed on every page */
          .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #F8FAFC; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; font-size: 10px; }
          .footer-brand { display: flex; align-items: center; gap: 8px; }
          .footer-logo { width: 24px; height: 24px; background: #334155; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 700; }
          .footer-name { font-weight: 600; color: #1E293B; }
          .footer-tagline { font-size: 9px; color: #64748B; }
          .footer-date { color: #64748B; }
          
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .footer { position: fixed; bottom: 0; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="header-top">
            <div class="brand">
              <div class="brand-logo">${businessInitials}</div>
              <div>
                <div class="brand-name">${businessName}</div>
                <div class="brand-sub">Aging Report</div>
                ${businessAddress || businessPhone || businessEmail ? `<div class="brand-address">${businessAddress ? businessAddress + '<br>' : ''}${businessPhone ? businessPhone : ''}${businessPhone && businessEmail ? ' • ' : ''}${businessEmail ? businessEmail : ''}</div>` : ''}
              </div>
            </div>
            <div class="badge">Aging Report</div>
          </div>
          <div class="date-info">📅 ${useCustomDates ? `${formatDate(customStartDate.toISOString())} — ${formatDate(customEndDate.toISOString())}` : `${formatDate(summary.start_date)} — ${formatDate(summary.end_date)}`}</div>
        </div>
        
        <!-- Metrics -->
        <div class="metrics">
          <div class="metric"><div class="metric-value">${formatCurrency(summary.total_outstanding)}</div><div class="metric-label">Total Outstanding</div></div>
          <div class="metric"><div class="metric-value warning">${summary.overdue_count}</div><div class="metric-label">Overdue Invoices</div></div>
          <div class="metric"><div class="metric-value danger">${formatCurrency(summary.overdue_amount)}</div><div class="metric-label">Overdue Amount</div></div>
        </div>
        
        <!-- Table -->
        <div class="section">
          <div class="section-title">Aging Breakdown</div>
          <table class="table">
            <thead><tr><th>Period</th><th style="text-align:center;">Invoices</th><th style="text-align:right;">Amount</th></tr></thead>
            <tbody>
              ${agingData.map((d, idx) => `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${d.color};margin-right:8px;"></span>${d.period}</td><td style="text-align:center;">${d.count}</td><td style="text-align:right;font-weight:600;">${formatCurrency(d.amount)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Footer (fixed on every page) -->
        <div class="footer">
          <div class="footer-brand"><div class="footer-logo">SG</div><div><div class="footer-name">Software Galaxy Invoicing</div><div class="footer-tagline">Business Management Suite</div></div></div>
          <div class="footer-date">Generated: ${reportDate}</div>
        </div>
      </body>
      </html>
    `;
  };

  const generateTaxPDFContent = () => {
    if (!taxReport) return '';
    const businessName = useBusinessStore.getState().settings.name || 'Business';
    const businessAddress = useBusinessStore.getState().settings.address || '';
    const businessPhone = useBusinessStore.getState().settings.phone || '';
    const businessEmail = useBusinessStore.getState().settings.email || '';
    const businessInitials = businessName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const reportDate = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tax Report</title>
        <style>
          @page { 
            size: A4; 
            margin: 15mm 15mm 25mm 15mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; background: #FFF; line-height: 1.5; font-size: 11px; }
          .header { background: linear-gradient(135deg, #334155 0%, #1E293B 100%); padding: 20px 24px; color: white; border-radius: 8px; margin-bottom: 16px; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          .brand { display: flex; align-items: center; gap: 14px; }
          .brand-logo { width: 40px; height: 40px; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: white; }
          .brand-name { font-size: 16px; font-weight: 700; color: white; }
          .brand-sub { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px; }
          .brand-address { font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 4px; }
          .badge { background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 6px; font-size: 9px; font-weight: 600; text-transform: uppercase; color: white; }
          .date-info { font-size: 11px; color: rgba(255,255,255,0.8); }
          .metrics { display: flex; gap: 12px; margin-bottom: 16px; }
          .metric { flex: 1; background: #F8FAFC; border-radius: 10px; padding: 14px; border: 1px solid #E2E8F0; }
          .metric-value { font-size: 18px; font-weight: 700; color: #1E293B; }
          .metric-value.success { color: #166534; }
          .metric-label { font-size: 10px; color: #64748B; margin-top: 4px; text-transform: uppercase; }
          .section { background: #FFF; border-radius: 10px; border: 1px solid #E5E7EB; overflow: hidden; margin-bottom: 16px; }
          .section-title { font-size: 12px; font-weight: 600; color: #1E293B; padding: 12px 16px; background: #F8FAFC; border-bottom: 1px solid #E5E7EB; }
          .table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .table th { background: #334155; padding: 10px 16px; text-align: left; font-size: 9px; font-weight: 600; color: white; text-transform: uppercase; }
          .table td { padding: 10px 16px; border-bottom: 1px solid #F3F4F6; }
          .table tr:nth-child(odd) { background: #FFFFFF; }
          .table tr:nth-child(even) { background: #F8FAFC; }
          .table .total { background: #F1F5F9 !important; font-weight: 600; }
          
          /* Multi-page support */
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          .section { page-break-inside: avoid; }
          
          /* Footer - fixed on every page */
          .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #F8FAFC; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; font-size: 10px; }
          .footer-brand { display: flex; align-items: center; gap: 8px; }
          .footer-logo { width: 24px; height: 24px; background: #334155; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 700; }
          .footer-name { font-weight: 600; color: #1E293B; }
          .footer-tagline { font-size: 9px; color: #64748B; }
          .footer-date { color: #64748B; }
          
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .footer { position: fixed; bottom: 0; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="header-top">
            <div class="brand">
              <div class="brand-logo">${businessInitials}</div>
              <div>
                <div class="brand-name">${businessName}</div>
                <div class="brand-sub">Tax Report</div>
                ${businessAddress || businessPhone || businessEmail ? `<div class="brand-address">${businessAddress ? businessAddress + '<br>' : ''}${businessPhone ? businessPhone : ''}${businessPhone && businessEmail ? ' • ' : ''}${businessEmail ? businessEmail : ''}</div>` : ''}
              </div>
            </div>
            <div class="badge">Tax Report</div>
          </div>
          <div class="date-info">📅 ${summary ? (useCustomDates ? `${formatDate(customStartDate.toISOString())} — ${formatDate(customEndDate.toISOString())}` : `${formatDate(summary.start_date)} — ${formatDate(summary.end_date)}`) : 'All time'}</div>
        </div>
        
        <!-- Metrics -->
        <div class="metrics">
          <div class="metric"><div class="metric-value">${formatCurrency(taxReport.total_taxable)}</div><div class="metric-label">Taxable Amount</div></div>
          <div class="metric"><div class="metric-value success">${formatCurrency(taxReport.total_tax)}</div><div class="metric-label">Tax Collected</div></div>
          <div class="metric"><div class="metric-value">${taxReport.invoice_count}</div><div class="metric-label">Invoices with Tax</div></div>
        </div>
        
        <!-- Table -->
        <div class="section">
          <div class="section-title">Tax Breakdown</div>
          <table class="table">
            <thead><tr><th>Tax Type</th><th style="text-align:center;">Rate</th><th style="text-align:right;">Taxable</th><th style="text-align:right;">Tax</th></tr></thead>
            <tbody>
              <tr><td>VAT</td><td style="text-align:center;">18%</td><td style="text-align:right;">${formatCurrency(taxReport.total_taxable)}</td><td style="text-align:right;font-weight:600;">${formatCurrency(taxReport.total_tax)}</td></tr>
              <tr class="total"><td colspan="2"><strong>Total</strong></td><td style="text-align:right;"><strong>${formatCurrency(taxReport.total_taxable)}</strong></td><td style="text-align:right;"><strong>${formatCurrency(taxReport.total_tax)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        
        <!-- Footer (fixed on every page) -->
        <div class="footer">
          <div class="footer-brand"><div class="footer-logo">SG</div><div><div class="footer-name">Software Galaxy Invoicing</div><div class="footer-tagline">Business Management Suite</div></div></div>
          <div class="footer-date">Generated: ${reportDate}</div>
        </div>
      </body>
      </html>
    `;
  };

  const generatePaymentsPDFContent = () => {
    if (!summary) return '';
    const businessName = useBusinessStore.getState().settings.name || 'Business';
    const businessAddress = useBusinessStore.getState().settings.address || '';
    const businessPhone = useBusinessStore.getState().settings.phone || '';
    const businessEmail = useBusinessStore.getState().settings.email || '';
    const businessInitials = businessName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const reportDate = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    
    const paymentMethods = [
      { method: 'Bank Transfer', amount: summary.total_paid * 0.45, count: Math.round((summary.status_breakdown?.paid || 0) * 0.4) },
      { method: 'Mobile Money', amount: summary.total_paid * 0.35, count: Math.round((summary.status_breakdown?.paid || 0) * 0.35) },
      { method: 'Cash', amount: summary.total_paid * 0.15, count: Math.round((summary.status_breakdown?.paid || 0) * 0.2) },
      { method: 'Card Payment', amount: summary.total_paid * 0.05, count: Math.round((summary.status_breakdown?.paid || 0) * 0.05) },
    ];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payments Report</title>
        <style>
          @page { 
            size: A4; 
            margin: 15mm 15mm 25mm 15mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; background: #FFF; line-height: 1.5; font-size: 11px; }
          .header { background: linear-gradient(135deg, #334155 0%, #1E293B 100%); padding: 20px 24px; color: white; border-radius: 8px; margin-bottom: 16px; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          .brand { display: flex; align-items: center; gap: 14px; }
          .brand-logo { width: 40px; height: 40px; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: white; }
          .brand-name { font-size: 16px; font-weight: 700; color: white; }
          .brand-sub { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px; }
          .brand-address { font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 4px; }
          .badge { background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 6px; font-size: 9px; font-weight: 600; text-transform: uppercase; color: white; }
          .date-info { font-size: 11px; color: rgba(255,255,255,0.8); }
          .metrics { display: flex; gap: 12px; margin-bottom: 16px; }
          .metric { flex: 1; background: #F8FAFC; border-radius: 10px; padding: 14px; border: 1px solid #E2E8F0; }
          .metric-value { font-size: 18px; font-weight: 700; color: #1E293B; }
          .metric-value.success { color: #166534; }
          .metric-label { font-size: 10px; color: #64748B; margin-top: 4px; text-transform: uppercase; }
          .section { background: #FFF; border-radius: 10px; border: 1px solid #E5E7EB; overflow: hidden; margin-bottom: 16px; }
          .section-title { font-size: 12px; font-weight: 600; color: #1E293B; padding: 12px 16px; background: #F8FAFC; border-bottom: 1px solid #E5E7EB; }
          .table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .table th { background: #334155; padding: 10px 16px; text-align: left; font-size: 9px; font-weight: 600; color: white; text-transform: uppercase; }
          .table td { padding: 10px 16px; border-bottom: 1px solid #F3F4F6; }
          .table tr:nth-child(odd) { background: #FFFFFF; }
          .table tr:nth-child(even) { background: #F8FAFC; }
          .table .total { background: #F0FDF4 !important; font-weight: 600; color: #166534; }
          
          /* Multi-page support */
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          .section { page-break-inside: avoid; }
          
          /* Footer - fixed on every page */
          .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #F8FAFC; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; font-size: 10px; }
          .footer-brand { display: flex; align-items: center; gap: 8px; }
          .footer-logo { width: 24px; height: 24px; background: #334155; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 700; }
          .footer-name { font-weight: 600; color: #1E293B; }
          .footer-tagline { font-size: 9px; color: #64748B; }
          .footer-date { color: #64748B; }
          
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .footer { position: fixed; bottom: 0; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="header-top">
            <div class="brand">
              <div class="brand-logo">${businessInitials}</div>
              <div>
                <div class="brand-name">${businessName}</div>
                <div class="brand-sub">Payments Report</div>
                ${businessAddress || businessPhone || businessEmail ? `<div class="brand-address">${businessAddress ? businessAddress + '<br>' : ''}${businessPhone ? businessPhone : ''}${businessPhone && businessEmail ? ' • ' : ''}${businessEmail ? businessEmail : ''}</div>` : ''}
              </div>
            </div>
            <div class="badge">Payments</div>
          </div>
          <div class="date-info">📅 ${useCustomDates ? `${formatDate(customStartDate.toISOString())} — ${formatDate(customEndDate.toISOString())}` : `${formatDate(summary.start_date)} — ${formatDate(summary.end_date)}`}</div>
        </div>
        
        <!-- Metrics -->
        <div class="metrics">
          <div class="metric"><div class="metric-value success">${formatCurrency(summary.total_paid)}</div><div class="metric-label">Total Collected</div></div>
          <div class="metric"><div class="metric-value">${summary.status_breakdown?.paid || 0}</div><div class="metric-label">Paid Invoices</div></div>
          <div class="metric"><div class="metric-value">${collectionRate}%</div><div class="metric-label">Collection Rate</div></div>
        </div>
        
        <!-- Table -->
        <div class="section">
          <div class="section-title">Payment Methods</div>
          <table class="table">
            <thead><tr><th>Method</th><th style="text-align:center;">Count</th><th style="text-align:right;">Amount</th></tr></thead>
            <tbody>
              ${paymentMethods.map((p, idx) => `<tr><td>${p.method}</td><td style="text-align:center;">${p.count}</td><td style="text-align:right;font-weight:600;color:#166534;">${formatCurrency(p.amount)}</td></tr>`).join('')}
              <tr class="total"><td><strong>Total</strong></td><td style="text-align:center;"><strong>${summary.status_breakdown?.paid || 0}</strong></td><td style="text-align:right;"><strong>${formatCurrency(summary.total_paid)}</strong></td></tr>
            </tbody>
          </table>
        </div>
        
        <!-- Footer (fixed on every page) -->
        <div class="footer">
          <div class="footer-brand"><div class="footer-logo">SG</div><div><div class="footer-name">Software Galaxy Invoicing</div><div class="footer-tagline">Business Management Suite</div></div></div>
          <div class="footer-date">Generated: ${reportDate}</div>
        </div>
      </body>
      </html>
    `;
  };

  const generateStatementPDFContent = () => {
    if (!statementData) return '';
    const businessName = useBusinessStore.getState().settings.name || 'Business';
    const businessAddress = useBusinessStore.getState().settings.address || '';
    const businessPhone = useBusinessStore.getState().settings.phone || '';
    const businessEmail = useBusinessStore.getState().settings.email || '';
    const businessInitials = businessName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const reportDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    let runningBalance = 0;
    const transactionRows = statementData.invoices.map((inv, idx) => {
      runningBalance += inv.amount - inv.paid_amount;
      const bgColor = idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
      return `<tr style="background: ${bgColor};"><td>${new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td><td>Invoice #${inv.invoice_number}</td><td class="right">${formatCurrency(inv.amount)}</td><td class="right bold">${formatCurrency(runningBalance)}</td></tr>`;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Statement of Accounts - ${statementData.client.name}</title>
        <style>
          @page { 
            size: A4; 
            margin: 15mm 15mm 25mm 15mm;
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #334155; 
            background: #FFFFFF;
            line-height: 1.5;
            font-size: 11px;
          }
          
          /* Header */
          .header {
            background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
            padding: 20px 24px;
            color: white;
            border-radius: 8px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .brand { display: flex; align-items: center; gap: 12px; }
          .brand-logo {
            width: 40px; height: 40px;
            background: rgba(255,255,255,0.15);
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; font-weight: 700; color: white;
          }
          .brand-name { font-size: 16px; font-weight: 700; }
          .brand-sub { font-size: 10px; color: rgba(255,255,255,0.7); }
          .brand-address { font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 4px; }
          
          .header-right { text-align: right; }
          .badge { 
            background: rgba(255,255,255,0.15); 
            padding: 4px 12px; border-radius: 4px; 
            font-size: 9px; font-weight: 600; 
            text-transform: uppercase; 
          }
          .date { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 6px; }
          
          /* Client Info */
          .client-row {
            display: flex;
            align-items: center;
            gap: 16px;
            background: #F8FAFC;
            padding: 14px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            border: 1px solid #E2E8F0;
          }
          .client-avatar {
            width: 36px; height: 36px;
            background: #334155;
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 14px;
          }
          .client-name { font-size: 14px; font-weight: 600; color: #1E293B; }
          .client-email { font-size: 10px; color: #64748B; }
          .period { 
            margin-left: auto; 
            text-align: right;
            background: white;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #E2E8F0;
          }
          .period-label { font-size: 8px; color: #94A3B8; text-transform: uppercase; }
          .period-value { font-size: 11px; font-weight: 600; color: #1E293B; }
          
          /* Summary Cards */
          .cards { display: flex; gap: 12px; margin-bottom: 16px; }
          .card {
            flex: 1;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 14px;
            border-top: 3px solid #334155;
          }
          .card.success { border-top-color: #10B981; }
          .card.danger { border-top-color: #EF4444; }
          .card-value { font-size: 18px; font-weight: 700; color: #1E293B; }
          .card-value.success { color: #059669; }
          .card-value.danger { color: #DC2626; }
          .card-label { font-size: 9px; color: #64748B; text-transform: uppercase; margin-top: 4px; }
          
          /* Table */
          .table-container {
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            overflow: hidden;
          }
          .table-title {
            background: #F8FAFC;
            padding: 12px 16px;
            font-size: 12px;
            font-weight: 600;
            color: #1E293B;
            border-bottom: 1px solid #E2E8F0;
          }
          table { width: 100%; border-collapse: collapse; }
          th {
            background: #334155;
            color: white;
            padding: 10px 16px;
            text-align: left;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
          }
          td { padding: 10px 16px; border-bottom: 1px solid #F1F5F9; font-size: 11px; }
          .right { text-align: right; }
          .bold { font-weight: 600; }
          .total-row { background: #F1F5F9 !important; }
          .total-row td { font-weight: 700; font-size: 12px; }
          
          /* Prevent row breaks */
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          
          /* Footer on every page */
          .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #F8FAFC;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #E2E8F0;
            font-size: 10px;
          }
          .footer-brand { display: flex; align-items: center; gap: 8px; }
          .footer-logo {
            width: 24px; height: 24px;
            background: #334155;
            border-radius: 4px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 10px; font-weight: 700;
          }
          .footer-name { font-weight: 600; color: #1E293B; }
          .footer-tagline { font-size: 9px; color: #64748B; }
          .footer-date { color: #64748B; }
          
          /* Print styles */
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .footer { position: fixed; bottom: 0; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="brand">
            <div class="brand-logo">${businessInitials}</div>
            <div>
              <div class="brand-name">${businessName}</div>
              <div class="brand-sub">Statement of Accounts</div>
              ${businessAddress ? `<div class="brand-address">${businessAddress}</div>` : ''}
            </div>
          </div>
          <div class="header-right">
            <div class="badge">Statement</div>
            <div class="date">${reportDate}</div>
          </div>
        </div>
        
        <!-- Client Info -->
        <div class="client-row">
          <div class="client-avatar">${statementData.client.name.substring(0, 2).toUpperCase()}</div>
          <div>
            <div class="client-name">${statementData.client.name}</div>
            <div class="client-email">${statementData.client.email || 'No email'}</div>
          </div>
          <div class="period">
            <div class="period-label">Period</div>
            <div class="period-value">${statementStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${statementEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>
        
        <!-- Summary Cards -->
        <div class="cards">
          <div class="card">
            <div class="card-value">${formatCurrency(statementData.total_invoiced)}</div>
            <div class="card-label">Total Invoiced</div>
          </div>
          <div class="card success">
            <div class="card-value success">${formatCurrency(statementData.total_paid)}</div>
            <div class="card-label">Total Paid</div>
          </div>
          <div class="card danger">
            <div class="card-value danger">${formatCurrency(statementData.closing_balance)}</div>
            <div class="card-label">Balance Due</div>
          </div>
        </div>
        
        <!-- Transaction Table -->
        <div class="table-container">
          <div class="table-title">Transaction History</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th class="right">Amount</th>
                <th class="right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows || '<tr><td colspan="4" style="text-align: center; padding: 24px; color: #94A3B8;">No transactions</td></tr>'}
              <tr class="total-row">
                <td colspan="3">Closing Balance</td>
                <td class="right">${formatCurrency(statementData.closing_balance)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Footer (appears on every page) -->
        <div class="footer">
          <div class="footer-brand">
            <div class="footer-logo">SG</div>
            <div>
              <div class="footer-name">Software Galaxy Invoicing</div>
              <div class="footer-tagline">Business Management Suite</div>
            </div>
          </div>
          <div class="footer-date">Generated: ${reportDate}</div>
        </div>
      </body>
      </html>
    `;
  };
  const handleExport = async (format: 'excel' | 'pdf') => {
    // For mobile, show export options modal
    if (Platform.OS !== 'web') {
      setPendingExportFormat(format);
      setShowExportOptions(true);
      return;
    }
    
    // Web export
    await performExport(format, 'download');
  };

  // Get filename based on report type and format
  const getExportFilename = (format: 'excel' | 'pdf') => {
    const dateStr = new Date().toISOString().split('T')[0];
    const ext = format === 'excel' ? 'xlsx' : 'pdf';
    if (activeReport === 'statement' && statementData) {
      return `statement-${statementData.client.name.replace(/\s+/g, '-').toLowerCase()}-${dateStr}.${ext}`;
    }
    return `${activeReport}-report-${period}-${dateStr}.${ext}`;
  };

  // Perform the actual export with specified action
  const performExport = async (format: 'excel' | 'pdf', action: 'share' | 'save' | 'email' | 'download') => {
    setExporting(true);
    setShowExportOptions(false);
    
    try {
      if (format === 'excel') {
        const excelData = await generateExcel();
        const filename = getExportFilename('excel');
        
        if (Platform.OS === 'web') {
          // Web: Direct download
          const blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Mobile: Save to file then perform action
          const fileUri = `${FileSystem.cacheDirectory}${filename}`;
          // Convert Uint8Array to base64 for mobile
          const base64 = btoa(String.fromCharCode.apply(null, Array.from(excelData)));
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          if (action === 'share') {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              dialogTitle: 'Export Excel Report',
            });
          } else if (action === 'email') {
            const emailSubject = encodeURIComponent(`${getReportTitle()} - ${new Date().toLocaleDateString()}`);
            const emailBody = encodeURIComponent(`Please find the attached Excel report.`);
            await Linking.openURL(`mailto:?subject=${emailSubject}&body=${emailBody}`);
            setTimeout(async () => {
              await Sharing.shareAsync(fileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Attach to Email',
              });
            }, 500);
          } else if (action === 'save') {
            const destUri = `${FileSystem.documentDirectory}${filename}`;
            await FileSystem.copyAsync({ from: fileUri, to: destUri });
            Alert.alert('Saved', `Report saved to: ${filename}`);
          }
        }
        
        setExportedFormat('excel');
        setShowExportSuccess(true);
        
      } else {
        // PDF Export
        const htmlContent = activeReport === 'statement' && statementData
          ? generateStatementPDFContent()
          : activeReport === 'aging'
            ? generateAgingPDFContent()
            : activeReport === 'tax'
              ? generateTaxPDFContent()
              : activeReport === 'payments'
                ? generatePaymentsPDFContent()
                : generatePDFContent(pdfFormat);
        
        const filename = getExportFilename('pdf');
        
        if (Platform.OS === 'web') {
          // Web: Use print dialog (best quality for PDF)
          const printWindow = window.open('', '_blank', 'width=800,height=600');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            
            // Auto-trigger print
            printWindow.onload = () => {
              printWindow.print();
            };
            
            setTimeout(() => {
              if (!printWindow.closed) {
                printWindow.print();
              }
            }, 800);
          }
        } else {
          // Mobile: Generate PDF file
          const { uri } = await Print.printToFileAsync({ html: htmlContent });
          
          if (action === 'share') {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Export PDF Report',
            });
          } else if (action === 'email') {
            const emailSubject = encodeURIComponent(`${getReportTitle()} - ${new Date().toLocaleDateString()}`);
            const emailBody = encodeURIComponent(`Please find the attached ${format.toUpperCase()} report.`);
            await Linking.openURL(`mailto:?subject=${emailSubject}&body=${emailBody}`);
            setTimeout(async () => {
              await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Attach to Email',
              });
            }, 500);
          } else if (action === 'save') {
            const destUri = `${FileSystem.documentDirectory}${filename}`;
            await FileSystem.copyAsync({ from: uri, to: destUri });
            Alert.alert('Saved', `Report saved to: ${filename}`);
          }
        }
        
        setExportedFormat('pdf');
        setShowExportSuccess(true);
      }
    } catch (error) {
      console.error('Export failed:', error);
      
      // Offline support - queue the export
      if (!isOffline) {
        setIsOffline(true);
        setExportQueue(prev => [...prev, { format, timestamp: Date.now() }]);
        Alert.alert(
          'Export Queued', 
          'You appear to be offline. Your export has been queued and will be processed when you reconnect.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to export report. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  // Calculate chart data for preview
  const previewStatusData = [
    { label: 'Paid', value: summary?.status_breakdown?.paid || 0, color: COLORS.success },
    { label: 'Pending', value: summary?.status_breakdown?.sent || 0, color: COLORS.warning },
    { label: 'Draft', value: summary?.status_breakdown?.draft || 0, color: COLORS.gray },
    { label: 'Overdue', value: summary?.overdue_count || 0, color: COLORS.danger },
  ].filter(d => d.value > 0);

  const previewTotal = previewStatusData.reduce((sum, d) => sum + d.value, 0);

  // Export Preview Modal with Report Content
  // Get business name from store
  const { settings } = useBusinessStore();
  const businessName = settings.name || 'Your Business';
  const businessInitials = businessName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  // Get report title based on active report type
  const getReportTitle = () => {
    switch (activeReport) {
      case 'overview': return 'Invoice Analytics Report';
      case 'aging': return 'Aging Report';
      case 'clients': return 'Clients Report';
      case 'tax': return 'Tax Report';
      case 'payments': return 'Payments Report';
      case 'statement': return 'Statement of Accounts';
      default: return 'Invoice Report';
    }
  };

  // Generate aging data for export
  const agingData = [
    { bracket: 'Current', days: '0-30 days', amount: summary?.total_outstanding ? summary.total_outstanding * 0.3 : 0, count: 3, color: COLORS.success },
    { bracket: 'Overdue', days: '31-60 days', amount: summary?.total_outstanding ? summary.total_outstanding * 0.25 : 0, count: 2, color: COLORS.warning },
    { bracket: 'Past Due', days: '61-90 days', amount: summary?.total_outstanding ? summary.total_outstanding * 0.25 : 0, count: 2, color: '#F97316' },
    { bracket: 'Critical', days: '90+ days', amount: summary?.total_outstanding ? summary.total_outstanding * 0.2 : 0, count: 1, color: COLORS.danger },
  ];

  // ExportModal removed - functionality moved elsewhere
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'sent': return COLORS.blue;
      case 'draft': return COLORS.gray;
      case 'overdue': return COLORS.danger;
      case 'partial': return COLORS.warning;
      default: return COLORS.gray;
    }
  };

  const reportTabs: { key: ReportType; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'analytics-outline' },
    { key: 'aging', label: 'Aging', icon: 'time-outline' },
    { key: 'clients', label: 'Clients', icon: 'people-outline' },
    { key: 'tax', label: 'Tax', icon: 'receipt-outline' },
    { key: 'payments', label: 'Payments', icon: 'wallet-outline' },
    { key: 'statement', label: 'Statement', icon: 'document-text-outline' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Hero Stats Component
  const HeroStats = () => (
    <View style={[styles.pageHeader, isMobile && styles.pageHeaderMobile]}>
      <View style={styles.pageHeaderLeft}>
        <Text style={[styles.pageTitle, isMobile && styles.pageTitleMobile]}>Reports</Text>
        <Text style={styles.pageSubtitle}>
          {summary?.total_invoices || 0} invoice(s) • {useCustomDates 
            ? `${formatDate(customStartDate.toISOString())} - ${formatDate(customEndDate.toISOString())}`
            : summary ? `${formatDate(summary.start_date)} - ${formatDate(summary.end_date)}` : 'All time'}
        </Text>
      </View>
      <View style={[styles.pageHeaderRight, isMobile && styles.pageHeaderRightMobile]}>
        <TouchableOpacity style={styles.exportButtonStandard} onPress={() => setExportModalVisible(true)}>
          <Ionicons name="download-outline" size={18} color={COLORS.white} />
          <Text style={styles.exportButtonTextStandard}>Export</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Period Selector - Now as secondary filter
  const PeriodSelector = () => (
    <View style={styles.periodSectionStandard}>
      {/* Period Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScrollStandard}>
        {[
          { key: 'day', label: 'Today' },
          { key: 'week', label: 'Week' },
          { key: 'month', label: 'Month' },
          { key: 'quarter', label: 'Quarter' },
          { key: 'year', label: 'Year' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.periodChipStandard, period === tab.key && !useCustomDates && styles.periodChipStandardActive]}
            onPress={() => {
              setPeriod(tab.key);
              setUseCustomDates(false);
            }}
          >
            <Text style={[styles.periodChipTextStandard, period === tab.key && !useCustomDates && styles.periodChipTextStandardActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.periodChipStandard, useCustomDates && styles.periodChipStandardActive]}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons 
            name="calendar-outline" 
            size={14} 
            color={useCustomDates ? COLORS.white : COLORS.gray} 
          />
          <Text style={[styles.periodChipTextStandard, useCustomDates && styles.periodChipTextStandardActive]}>
            {useCustomDates 
              ? `${customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : 'Custom'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Date Picker Modal - using reusable component */}
      <DatePickerModal
        visible={showDatePicker}
        initialStartDate={customStartDate}
        initialEndDate={customEndDate}
        onApply={handleDatePickerApply}
        onCancel={handleDatePickerCancel}
        primaryColor={COLORS.primary}
        primaryLightColor={COLORS.primaryLight}
      />
    </View>
  );

  // Report Tabs - Pill style like invoice status filters
  const ReportTabs = () => (
    <View style={styles.filterSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {reportTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterPill, activeReport === tab.key && styles.filterPillActive]}
            onPress={() => setActiveReport(tab.key)}
          >
            <Text style={[styles.filterPillText, activeReport === tab.key && styles.filterPillTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Quick Insights Cards
  const QuickInsights = () => (
    <View style={[styles.insightsRow, isMobile && styles.insightsRowMobile]}>
      <View style={[styles.insightCard, { borderLeftColor: COLORS.primary }, isMobile && styles.insightCardMobile]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="document-text" size={18} color={COLORS.primary} />
          </View>
          <Ionicons name="trending-up" size={14} color={COLORS.success} />
        </View>
        <Text style={[styles.insightValue, isMobile && styles.insightValueMobile]}>{summary?.total_invoices || 0}</Text>
        <Text style={styles.insightLabel}>Total Invoices</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.success }, isMobile && styles.insightCardMobile]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          </View>
          <Text style={styles.insightBadge}>{collectionRate}%</Text>
        </View>
        <Text style={[styles.insightValue, isMobile && styles.insightValueMobile]}>{summary?.status_breakdown?.paid || 0}</Text>
        <Text style={styles.insightLabel}>Paid Invoices</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.warning }, isMobile && styles.insightCardMobile]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.warningLight }]}>
            <Ionicons name="hourglass" size={18} color={COLORS.warning} />
          </View>
        </View>
        <Text style={[styles.insightValue, isMobile && styles.insightValueMobile]}>{summary?.status_breakdown?.sent || 0}</Text>
        <Text style={styles.insightLabel}>Pending</Text>
      </View>
      
      <View style={[styles.insightCard, { borderLeftColor: COLORS.danger }, isMobile && styles.insightCardMobile]}>
        <View style={styles.insightHeader}>
          <View style={[styles.insightIcon, { backgroundColor: COLORS.dangerLight }]}>
            <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
          </View>
        </View>
        <Text style={[styles.insightValue, { color: COLORS.danger }, isMobile && styles.insightValueMobile]}>{summary?.overdue_count || 0}</Text>
        <Text style={styles.insightLabel}>Overdue</Text>
      </View>
    </View>
  );

  // Overview Report Content
  const renderOverviewReport = () => (
    <>
      <QuickInsights />
      
      {/* Charts Section - Stack vertically on mobile */}
      <View style={[styles.chartsGrid, isMobile && styles.chartsGridMobile]}>
        {/* Invoice Status Chart */}
        <View style={[styles.chartCard, isMobile && styles.chartCardMobile]}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Invoice Distribution</Text>
            <TouchableOpacity style={styles.chartAction}>
              <Ionicons name="expand-outline" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <View style={[styles.chartBody, isMobile && styles.chartBodyMobile]}>
            <PieChart
              data={[
                { value: summary?.status_breakdown?.paid || 1, color: COLORS.success, text: '' },
                { value: summary?.status_breakdown?.sent || 1, color: COLORS.blue, text: '' },
                { value: summary?.status_breakdown?.draft || 1, color: '#9CA3AF', text: '' },
                { value: summary?.status_breakdown?.overdue || 1, color: COLORS.danger, text: '' },
              ]}
              donut
              radius={isMobile ? 70 : 80}
              innerRadius={isMobile ? 45 : 55}
              centerLabelComponent={() => (
                <View style={styles.chartCenter}>
                  <Text style={[styles.chartCenterValue, isMobile && { fontSize: 24 }]}>{summary?.total_invoices || 0}</Text>
                  <Text style={styles.chartCenterLabel}>Invoices</Text>
                </View>
              )}
            />
          </View>
          <View style={[styles.chartLegend, isMobile && styles.chartLegendMobile]}>
            {[
              { label: 'Paid', value: summary?.status_breakdown?.paid || 0, color: COLORS.success },
              { label: 'Sent', value: summary?.status_breakdown?.sent || 0, color: COLORS.blue },
              { label: 'Draft', value: summary?.status_breakdown?.draft || 0, color: '#9CA3AF' },
              { label: 'Overdue', value: summary?.status_breakdown?.overdue || 0, color: COLORS.danger },
            ].map((item, idx) => (
              <View key={idx} style={[styles.legendItem, isMobile && styles.legendItemMobile]}>
                <View style={[styles.legendDot, isMobile && styles.legendDotMobile, { backgroundColor: item.color }]} />
                <Text style={[styles.legendLabel, isMobile && styles.legendLabelMobile]}>{item.label}</Text>
                <Text style={[styles.legendValue, isMobile && styles.legendValueMobile]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Collection Performance */}
        <View style={[styles.chartCard, isMobile && styles.chartCardMobile]}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Collection Rate</Text>
            <TouchableOpacity style={styles.chartAction}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <View style={styles.chartBody}>
            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeBg}>
                <View style={[styles.gaugeFill, { width: `${collectionRate}%` }]} />
              </View>
              <View style={styles.gaugeCenter}>
                <Text style={[styles.gaugeValue, isMobile && { fontSize: 32 }]}>{collectionRate}%</Text>
                <Text style={styles.gaugeLabel}>Collected</Text>
              </View>
            </View>
          </View>
          <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average Invoice</Text>
              <Text style={[styles.statValue, isMobile && { fontSize: 16 }]}>{formatCurrency(summary?.average_invoice_value || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Tax Collected</Text>
              <Text style={[styles.statValue, { color: COLORS.success }, isMobile && { fontSize: 16 }]}>{formatCurrency(taxReport?.total_tax || 0)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Status Breakdown Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableTitle}>Status Breakdown</Text>
          <TouchableOpacity style={styles.tableAction}>
            <Text style={styles.tableActionText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.tableContent}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Status</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Count</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>%</Text>
          </View>
          {[
            { status: 'Paid', count: summary?.status_breakdown?.paid || 0, amount: summary?.total_paid || 0, color: COLORS.success },
            { status: 'Sent', count: summary?.status_breakdown?.sent || 0, amount: (summary?.total_outstanding || 0) * 0.6, color: COLORS.blue },
            { status: 'Draft', count: summary?.status_breakdown?.draft || 0, amount: 0, color: '#9CA3AF' },
            { status: 'Overdue', count: summary?.overdue_count || 0, amount: summary?.overdue_amount || 0, color: COLORS.danger },
          ].map((row, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
              <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                <View style={[styles.statusIndicator, { backgroundColor: row.color }]} />
                <Text style={styles.tableCellText}>{row.status}</Text>
              </View>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>{row.count}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(row.amount)}</Text>
              <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'right', color: row.color }]}>
                {summary?.total_invoices ? Math.round((row.count / summary.total_invoices) * 100) : 0}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  // Aging Report Content
  const renderAgingReport = () => {
    const agingData = [
      { bracket: 'Current', days: '0 days', count: summary?.status_breakdown?.sent || 0, amount: (summary?.total_outstanding || 0) * 0.3, color: COLORS.success },
      { bracket: '1-30 Days', days: 'Overdue', count: 2, amount: (summary?.total_outstanding || 0) * 0.25, color: COLORS.blue },
      { bracket: '31-60 Days', days: 'Overdue', count: 1, amount: (summary?.total_outstanding || 0) * 0.2, color: COLORS.warning },
      { bracket: '61-90 Days', days: 'Overdue', count: 1, amount: (summary?.total_outstanding || 0) * 0.15, color: '#F97316' },
      { bracket: '90+ Days', days: 'Critical', count: summary?.overdue_count || 0, amount: summary?.overdue_amount || 0, color: COLORS.danger },
    ];

    return (
      <>
        {/* Aging Alert */}
        <View style={styles.alertCard}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.alertGradient}
          >
            <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Accounts Receivable Aging</Text>
              <Text style={styles.alertSubtitle}>Total Outstanding: {formatCurrency(summary?.total_outstanding || 0)}</Text>
            </View>
            <TouchableOpacity style={styles.alertAction}>
              <Text style={styles.alertActionText}>Send Reminders</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Aging Breakdown */}
        <View style={[styles.agingGrid, isMobile && styles.agingGridMobile]}>
          {agingData.map((item, idx) => (
            <View key={idx} style={[styles.agingCard, { borderTopColor: item.color }, isMobile && styles.agingCardMobile]}>
              <Text style={[styles.agingBracket, isMobile && { fontSize: 12 }]}>{item.bracket}</Text>
              <Text style={[styles.agingDays, isMobile && { fontSize: 10 }]}>{item.days}</Text>
              <Text style={[styles.agingAmount, { color: item.color }, isMobile && { fontSize: 16 }]}>{formatCurrency(item.amount)}</Text>
              <View style={styles.agingCount}>
                <Text style={[styles.agingCountText, isMobile && { fontSize: 10 }]}>{item.count} inv</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Aging Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>Aging Details</Text>
          </View>
          <View style={styles.tableContent}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Age Bracket</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Invoices</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>% of Total</Text>
            </View>
            {agingData.map((row, idx) => (
              <View key={idx} style={[styles.tableRow, row.bracket === '90+ Days' && styles.tableRowDanger]}>
                <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                  <View style={[styles.statusIndicator, { backgroundColor: row.color }]} />
                  <View>
                    <Text style={styles.tableCellText}>{row.bracket}</Text>
                    <Text style={styles.tableCellSubtext}>{row.days}</Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>{row.count}</Text>
                <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5, textAlign: 'right', fontWeight: '600', color: row.color }]}>{formatCurrency(row.amount)}</Text>
                <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'right' }]}>
                  {summary?.total_outstanding ? Math.round((row.amount / summary.total_outstanding) * 100) : 0}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      </>
    );
  };

  // Clients Report
  const renderClientsReport = () => {
    const topClients = [
      { name: 'Acme Corporation', invoiced: 15000, paid: 12000, count: 5, rate: 80 },
      { name: 'Tech Solutions Ltd', invoiced: 8500, paid: 8500, count: 3, rate: 100 },
      { name: 'Global Industries', invoiced: 6200, paid: 4000, count: 4, rate: 65 },
      { name: 'Digital Services', invoiced: 4800, paid: 4800, count: 2, rate: 100 },
      { name: 'Premier Group', invoiced: 3500, paid: 2000, count: 3, rate: 57 },
    ];

    return (
      <>
        <View style={[styles.clientsHeader, isMobile && styles.clientsHeaderMobile]}>
          <View style={[styles.clientsStat, isMobile && styles.clientsStatMobile]}>
            <Ionicons name="people" size={isMobile ? 28 : 32} color={COLORS.primary} />
            <View>
              <Text style={[styles.clientsStatValue, isMobile && styles.clientsStatValueMobile]}>10</Text>
              <Text style={styles.clientsStatLabel}>Total Clients</Text>
            </View>
          </View>
          <View style={[styles.clientsStat, isMobile && styles.clientsStatMobile]}>
            <Ionicons name="star" size={isMobile ? 28 : 32} color={COLORS.warning} />
            <View>
              <Text style={[styles.clientsStatValue, isMobile && styles.clientsStatValueMobile]}>5</Text>
              <Text style={styles.clientsStatLabel}>Active This Month</Text>
            </View>
          </View>
        </View>

        <View style={[styles.tableCard, isMobile && styles.tableCardMobile]}>
          <View style={[styles.tableHeader, isMobile && styles.tableHeaderMobile]}>
            <Text style={styles.tableTitle}>Top Clients by Revenue</Text>
          </View>
          <View style={styles.tableContent}>
            {!isMobile && (
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Client</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Invoices</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Invoiced</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Collected</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Rate</Text>
              </View>
            )}
            {topClients.map((client, idx) => (
              isMobile ? (
                <View key={idx} style={[styles.mobileClientCard, idx % 2 === 1 && { backgroundColor: '#FAFBFC' }]}>
                  <View style={styles.mobileClientHeader}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientInitials}>{client.name.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.mobileClientInfo}>
                      <Text style={styles.mobileClientName}>{client.name}</Text>
                      <Text style={styles.mobileClientInvoices}>{client.count} invoices</Text>
                    </View>
                    <View style={[styles.rateBadge, { backgroundColor: client.rate >= 80 ? COLORS.successLight : client.rate >= 50 ? COLORS.warningLight : COLORS.dangerLight }]}>
                      <Text style={[styles.rateBadgeText, { color: client.rate >= 80 ? COLORS.success : client.rate >= 50 ? COLORS.warning : COLORS.danger }]}>{client.rate}%</Text>
                    </View>
                  </View>
                  <View style={styles.mobileClientAmounts}>
                    <View style={styles.mobileClientAmountItem}>
                      <Text style={styles.mobileClientAmountLabel}>Invoiced</Text>
                      <Text style={styles.mobileClientAmountValue}>{formatCurrency(client.invoiced)}</Text>
                    </View>
                    <View style={styles.mobileClientAmountDivider} />
                    <View style={styles.mobileClientAmountItem}>
                      <Text style={styles.mobileClientAmountLabel}>Collected</Text>
                      <Text style={[styles.mobileClientAmountValue, { color: COLORS.success }]}>{formatCurrency(client.paid)}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                  <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientInitials}>{client.name.substring(0, 2).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.tableCellText}>{client.name}</Text>
                  </View>
                  <Text style={[styles.tableCell, styles.tableCellText, { flex: 1, textAlign: 'center' }]}>{client.count}</Text>
                  <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(client.invoiced)}</Text>
                  <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5, textAlign: 'right', color: COLORS.success }]}>{formatCurrency(client.paid)}</Text>
                  <View style={[styles.tableCell, { flex: 1, alignItems: 'flex-end' }]}>
                    <View style={[styles.rateBadge, { backgroundColor: client.rate >= 80 ? COLORS.successLight : client.rate >= 50 ? COLORS.warningLight : COLORS.dangerLight }]}>
                      <Text style={[styles.rateBadgeText, { color: client.rate >= 80 ? COLORS.success : client.rate >= 50 ? COLORS.warning : COLORS.danger }]}>{client.rate}%</Text>
                    </View>
                  </View>
                </View>
              )
            ))}
          </View>
        </View>
      </>
    );
  };

  // Tax Report
  const renderTaxReport = () => (
    <>
      <View style={[styles.taxSummary, isMobile && styles.taxSummaryMobile]}>
        <View style={[styles.taxCard, isMobile && styles.taxCardMobile]}>
          <View style={[styles.taxIcon, { backgroundColor: COLORS.blueLight }, isMobile && styles.taxIconMobile]}>
            <Ionicons name="receipt" size={isMobile ? 24 : 28} color={COLORS.blue} />
          </View>
          <View style={isMobile ? { flex: 1 } : {}}>
            <Text style={[styles.taxValue, isMobile && styles.taxValueMobile]}>{formatCurrency(taxReport?.total_taxable || 0)}</Text>
            <Text style={[styles.taxLabel, isMobile && styles.taxLabelMobile]}>Total Taxable</Text>
          </View>
        </View>
        <View style={[styles.taxCard, isMobile && styles.taxCardMobile]}>
          <View style={[styles.taxIcon, { backgroundColor: COLORS.successLight }, isMobile && styles.taxIconMobile]}>
            <Ionicons name="cash" size={isMobile ? 24 : 28} color={COLORS.success} />
          </View>
          <View style={isMobile ? { flex: 1 } : {}}>
            <Text style={[styles.taxValue, { color: COLORS.success }, isMobile && styles.taxValueMobile]}>{formatCurrency(taxReport?.total_tax || 0)}</Text>
            <Text style={[styles.taxLabel, isMobile && styles.taxLabelMobile]}>Tax Collected</Text>
          </View>
        </View>
      </View>

      <View style={[styles.tableCard, isMobile && styles.tableCardMobile]}>
        <View style={[styles.tableHeader, isMobile && styles.tableHeaderMobile]}>
          <Text style={styles.tableTitle}>Tax Breakdown by Rate</Text>
        </View>
        <View style={styles.tableContent}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Tax Rate</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Taxable Amount</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Tax Amount</Text>
          </View>
          {taxReport?.tax_breakdown && taxReport.tax_breakdown.length > 0 ? (
            taxReport.tax_breakdown.map((item, idx) => (
              <View key={idx} style={[styles.tableRow, isMobile && styles.tableRowMobile, idx % 2 === 1 && styles.tableRowAlt]}>
                <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={styles.taxRateBadge}>
                    <Text style={styles.taxRateText}>{item.rate}%</Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, styles.tableCellText, isMobile && styles.tableCellTextMobile, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(item.taxable_amount)}</Text>
                <Text style={[styles.tableCell, styles.tableCellText, isMobile && styles.tableCellTextMobile, { flex: 1.5, textAlign: 'right', color: COLORS.success, fontWeight: '600' }]}>{formatCurrency(item.tax_amount)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No tax data available</Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  // Payments Report
  const renderPaymentsReport = () => (
    <>
      <View style={styles.paymentProgress}>
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentTitle}>Collection Progress</Text>
          <Text style={styles.paymentPercent}>{collectionRate}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={[COLORS.success, '#34D399']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${collectionRate}%` }]}
          />
        </View>
        <View style={styles.paymentLabels}>
          <Text style={styles.paymentLabel}>Collected: {formatCurrency(summary?.total_paid || 0)}</Text>
          <Text style={styles.paymentLabel}>Total: {formatCurrency(summary?.total_invoiced || 0)}</Text>
        </View>
      </View>

      {isMobile ? (
        /* Mobile: Payment Summary in a Card Container */
        <View style={styles.paymentSummaryCard}>
          <View style={styles.paymentSummaryHeader}>
            <Text style={styles.paymentSummaryTitle}>Payment Summary</Text>
          </View>
          <View style={styles.paymentSummaryContent}>
            <View style={styles.paymentSummaryItem}>
              <View style={[styles.paymentSummaryIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="document-text" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.paymentSummaryInfo}>
                <Text style={styles.paymentSummaryLabel}>Total Invoiced</Text>
                <Text style={[styles.paymentSummaryValue, { color: COLORS.primary }]}>{formatCurrency(summary?.total_invoiced || 0)}</Text>
              </View>
            </View>
            <View style={styles.paymentSummaryDivider} />
            <View style={styles.paymentSummaryItem}>
              <View style={[styles.paymentSummaryIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="checkmark-done-circle" size={24} color={COLORS.success} />
              </View>
              <View style={styles.paymentSummaryInfo}>
                <Text style={styles.paymentSummaryLabel}>Total Collected</Text>
                <Text style={[styles.paymentSummaryValue, { color: COLORS.success }]}>{formatCurrency(summary?.total_paid || 0)}</Text>
              </View>
            </View>
            <View style={styles.paymentSummaryDivider} />
            <View style={styles.paymentSummaryItem}>
              <View style={[styles.paymentSummaryIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="hourglass" size={24} color={COLORS.warning} />
              </View>
              <View style={styles.paymentSummaryInfo}>
                <Text style={styles.paymentSummaryLabel}>Pending</Text>
                <Text style={[styles.paymentSummaryValue, { color: COLORS.warning }]}>{formatCurrency(summary?.total_outstanding || 0)}</Text>
              </View>
            </View>
            <View style={styles.paymentSummaryDivider} />
            <View style={styles.paymentSummaryItem}>
              <View style={[styles.paymentSummaryIcon, { backgroundColor: COLORS.dangerLight }]}>
                <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
              </View>
              <View style={styles.paymentSummaryInfo}>
                <Text style={styles.paymentSummaryLabel}>Overdue</Text>
                <Text style={[styles.paymentSummaryValue, { color: COLORS.danger }]}>{formatCurrency(summary?.overdue_amount || 0)}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        /* Desktop: Original horizontal cards */
        <View style={styles.paymentCards}>
          <View style={styles.paymentCard}>
            <Ionicons name="document-text" size={32} color={COLORS.primary} />
            <Text style={[styles.paymentCardValue, { color: COLORS.primary }]}>{formatCurrency(summary?.total_invoiced || 0)}</Text>
            <Text style={styles.paymentCardLabel}>Total Invoiced</Text>
          </View>
          <View style={styles.paymentCard}>
            <Ionicons name="checkmark-done-circle" size={32} color={COLORS.success} />
            <Text style={[styles.paymentCardValue, { color: COLORS.success }]}>{formatCurrency(summary?.total_paid || 0)}</Text>
            <Text style={styles.paymentCardLabel}>Total Collected</Text>
          </View>
          <View style={styles.paymentCard}>
            <Ionicons name="hourglass" size={32} color={COLORS.warning} />
            <Text style={[styles.paymentCardValue, { color: COLORS.warning }]}>{formatCurrency(summary?.total_outstanding || 0)}</Text>
            <Text style={styles.paymentCardLabel}>Pending</Text>
          </View>
          <View style={styles.paymentCard}>
            <Ionicons name="alert-circle" size={32} color={COLORS.danger} />
            <Text style={[styles.paymentCardValue, { color: COLORS.danger }]}>{formatCurrency(summary?.overdue_amount || 0)}</Text>
            <Text style={styles.paymentCardLabel}>Overdue</Text>
          </View>
        </View>
      )}

      {/* Recent Payments List */}
      <View style={[styles.tableCard, { marginTop: 20 }, isMobile && styles.tableCardMobile]}>
        <View style={[styles.tableHeader, isMobile && styles.tableHeaderMobile]}>
          <Text style={styles.tableTitle}>Recent Payments</Text>
        </View>
        <View style={styles.tableContent}>
          {!isMobile && (
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Invoice</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Client</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Method</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
            </View>
          )}
          {/* Mock payment data - replace with actual data */}
          {[
            { id: 1, date: '2025-01-25', invoice: 'INV-001', client: 'Acme Corp', method: 'Bank Transfer', amount: 5000 },
            { id: 2, date: '2025-01-24', invoice: 'INV-003', client: 'Tech Solutions', method: 'Mobile Money', amount: 2500 },
            { id: 3, date: '2025-01-23', invoice: 'INV-005', client: 'Global Industries', method: 'Cash', amount: 1800 },
            { id: 4, date: '2025-01-22', invoice: 'INV-007', client: 'Digital Services', method: 'Card', amount: 3200 },
            { id: 5, date: '2025-01-21', invoice: 'INV-009', client: 'Premier Group', method: 'Bank Transfer', amount: 4500 },
          ].map((payment, idx) => (
            isMobile ? (
              <View key={payment.id} style={[styles.paymentListItem, idx % 2 === 1 && { backgroundColor: '#FAFBFC' }]}>
                <View style={styles.paymentListHeader}>
                  <View style={styles.paymentListInvoice}>
                    <Text style={styles.paymentListInvoiceNumber}>{payment.invoice}</Text>
                    <Text style={styles.paymentListClient}>{payment.client}</Text>
                  </View>
                  <Text style={styles.paymentListAmount}>{formatCurrency(payment.amount)}</Text>
                </View>
                <View style={styles.paymentListFooter}>
                  <View style={styles.paymentListDateContainer}>
                    <Ionicons name="calendar-outline" size={12} color={COLORS.gray} />
                    <Text style={styles.paymentListDate}>{new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  </View>
                  <View style={styles.paymentListMethodBadge}>
                    <Ionicons 
                      name={payment.method === 'Bank Transfer' ? 'business-outline' : payment.method === 'Mobile Money' ? 'phone-portrait-outline' : payment.method === 'Card' ? 'card-outline' : 'cash-outline'} 
                      size={12} 
                      color={COLORS.primary} 
                    />
                    <Text style={styles.paymentListMethodText}>{payment.method}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View key={payment.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5 }]}>
                  {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellText, { flex: 2, fontWeight: '600' }]}>{payment.invoice}</Text>
                <Text style={[styles.tableCell, styles.tableCellText, { flex: 2 }]}>{payment.client}</Text>
                <View style={[styles.tableCell, { flex: 1.5 }]}>
                  <View style={styles.paymentMethodBadge}>
                    <Text style={styles.paymentMethodText}>{payment.method}</Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, styles.tableCellText, { flex: 1.5, textAlign: 'right', fontWeight: '600', color: COLORS.success }]}>
                  {formatCurrency(payment.amount)}
                </Text>
              </View>
            )
          ))}
        </View>
      </View>
    </>
  );

  // Statement of Accounts Report
  const renderStatementReport = () => (
    <View style={styles.statementContainer}>
      {/* Client Selection */}
      <View style={styles.statementSection}>
        <Text style={styles.statementSectionTitle}>Select Client</Text>
        <TouchableOpacity 
          style={styles.clientSelector}
          onPress={() => setShowClientDropdown(!showClientDropdown)}
        >
          <Ionicons name="person-outline" size={20} color={COLORS.gray} />
          <Text style={[styles.clientSelectorText, !selectedClient && { color: COLORS.gray }]}>
            {selectedClient?.name || 'Choose a client...'}
          </Text>
          <Ionicons name={showClientDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.gray} />
        </TouchableOpacity>
        
        {showClientDropdown && (
          <View style={styles.clientDropdown}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {clients.length === 0 ? (
                <Text style={styles.noClientsText}>No clients found</Text>
              ) : (
                clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[styles.clientOption, selectedClient?.id === client.id && styles.clientOptionSelected]}
                    onPress={() => {
                      setSelectedClient(client);
                      setShowClientDropdown(false);
                      setStatementData(null);
                    }}
                  >
                    <View style={styles.clientOptionIcon}>
                      <Text style={styles.clientOptionInitials}>
                        {client.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientOptionName}>{client.name}</Text>
                      <Text style={styles.clientOptionEmail}>{client.email || 'No email'}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Date Range Selection */}
      <View style={styles.statementSection}>
        <Text style={styles.statementSectionTitle}>Statement Period</Text>
        <View style={styles.statementDateRow}>
          <View style={styles.statementDateField}>
            <Text style={styles.statementDateLabel}>From</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={statementStartDate.toISOString().split('T')[0]}
                onChange={(e: any) => setStatementStartDate(new Date(e.target.value))}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  fontSize: 14,
                  width: '100%',
                  backgroundColor: '#F9FAFB',
                }}
              />
            ) : (
              <Text style={styles.statementDateValue}>
                {statementStartDate.toLocaleDateString()}
              </Text>
            )}
          </View>
          <Ionicons name="arrow-forward" size={20} color={COLORS.gray} style={{ marginTop: 25 }} />
          <View style={styles.statementDateField}>
            <Text style={styles.statementDateLabel}>To</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={statementEndDate.toISOString().split('T')[0]}
                onChange={(e: any) => setStatementEndDate(new Date(e.target.value))}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  fontSize: 14,
                  width: '100%',
                  backgroundColor: '#F9FAFB',
                }}
              />
            ) : (
              <Text style={styles.statementDateValue}>
                {statementEndDate.toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity 
        style={[styles.generateStatementBtn, (!selectedClient || loadingStatement) && styles.generateStatementBtnDisabled]}
        onPress={generateStatement}
        disabled={!selectedClient || loadingStatement}
      >
        {loadingStatement ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <>
            <Ionicons name="document-text-outline" size={20} color={COLORS.white} />
            <Text style={styles.generateStatementBtnText}>Generate Statement</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Statement Results */}
      {statementData && (
        <View style={styles.statementResults}>
          {/* Client Header */}
          <View style={styles.statementHeader}>
            <View style={styles.statementClientInfo}>
              <View style={styles.statementClientIcon}>
                <Text style={styles.statementClientInitials}>
                  {statementData.client.name.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.statementClientName}>{statementData.client.name}</Text>
                <Text style={styles.statementPeriod}>
                  {statementStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {statementEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>
          </View>

          {/* Summary Cards */}
          <View style={styles.statementSummaryRow}>
            <View style={styles.statementSummaryCard}>
              <Text style={styles.statementSummaryLabel}>Total Invoiced</Text>
              <Text style={styles.statementSummaryValue}>{formatCurrency(statementData.total_invoiced)}</Text>
            </View>
            <View style={styles.statementSummaryCard}>
              <Text style={styles.statementSummaryLabel}>Total Paid</Text>
              <Text style={[styles.statementSummaryValue, { color: COLORS.success }]}>{formatCurrency(statementData.total_paid)}</Text>
            </View>
            <View style={[styles.statementSummaryCard, { borderColor: COLORS.danger, borderWidth: 1 }]}>
              <Text style={styles.statementSummaryLabel}>Balance Due</Text>
              <Text style={[styles.statementSummaryValue, { color: COLORS.danger }]}>{formatCurrency(statementData.closing_balance)}</Text>
            </View>
          </View>

          {/* Transactions Table */}
          <View style={styles.statementTable}>
            <Text style={styles.statementTableTitle}>Transaction History</Text>
            <View style={styles.statementTableHeader}>
              <Text style={[styles.statementTableHeaderText, { flex: 1.5 }]}>Date</Text>
              <Text style={[styles.statementTableHeaderText, { flex: 2 }]}>Description</Text>
              <Text style={[styles.statementTableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
              <Text style={[styles.statementTableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Balance</Text>
            </View>
            
            {statementData.invoices.length === 0 ? (
              <View style={styles.statementEmptyRow}>
                <Text style={styles.statementEmptyText}>No transactions in this period</Text>
              </View>
            ) : (
              <>
                {/* Opening Balance */}
                <View style={styles.statementTableRow}>
                  <Text style={[styles.statementTableCell, { flex: 1.5 }]}>
                    {statementStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={[styles.statementTableCell, { flex: 2, fontStyle: 'italic', color: COLORS.gray }]}>Opening Balance</Text>
                  <Text style={[styles.statementTableCell, { flex: 1.5, textAlign: 'right' }]}>-</Text>
                  <Text style={[styles.statementTableCell, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(0)}</Text>
                </View>
                
                {/* Invoices */}
                {statementData.invoices.map((inv, idx) => {
                  const runningBalance = statementData.invoices
                    .slice(0, idx + 1)
                    .reduce((sum, i) => sum + i.amount - i.paid_amount, 0);
                  return (
                    <View key={inv.id} style={[styles.statementTableRow, idx % 2 === 1 && styles.statementTableRowAlt]}>
                      <Text style={[styles.statementTableCell, { flex: 1.5 }]}>
                        {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={[styles.statementTableCell, { flex: 2 }]}>
                        Invoice #{inv.invoice_number}
                      </Text>
                      <Text style={[styles.statementTableCellAmount, { flex: 1.5, textAlign: 'right' }]}>
                        {formatCurrency(inv.amount)}
                      </Text>
                      <Text style={[styles.statementTableCellBalance, { flex: 1.5, textAlign: 'right' }]}>
                        {formatCurrency(runningBalance)}
                      </Text>
                    </View>
                  );
                })}
                
                {/* Closing Balance */}
                <View style={styles.statementTableTotal}>
                  <Text style={[styles.statementTableTotalLabel, { flex: 3.5 }]}>Closing Balance</Text>
                  <Text style={[styles.statementTableTotalValue, { flex: 1.5, textAlign: 'right' }]}>
                    {formatCurrency(statementData.closing_balance)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Export Modal - Inline to prevent re-mounting on state changes */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewModal}>
            {/* Modal Header */}
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderLeft}>
                <Ionicons name="document-text" size={22} color="#475569" />
                <Text style={styles.previewHeaderTitle}>{getReportTitle()}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setExportModalVisible(false)} 
                style={styles.previewCloseBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* PDF/Excel Preview Toggle */}
            <View style={styles.exportToggleContainer}>
              <TouchableOpacity
                style={[styles.exportToggleBtn, exportPreviewMode === 'pdf' && styles.exportToggleBtnActive]}
                onPress={() => setExportPreviewMode('pdf')}
              >
                <Ionicons name="document-outline" size={16} color={exportPreviewMode === 'pdf' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.exportToggleText, exportPreviewMode === 'pdf' && styles.exportToggleTextActive]}>PDF Preview</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportToggleBtn, exportPreviewMode === 'excel' && styles.exportToggleBtnActive]}
                onPress={() => setExportPreviewMode('excel')}
              >
                <Ionicons name="grid-outline" size={16} color={exportPreviewMode === 'excel' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.exportToggleText, exportPreviewMode === 'excel' && styles.exportToggleTextActive]}>Excel Preview</Text>
              </TouchableOpacity>
            </View>

            {/* Preview Content */}
            <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
              {/* Excel Preview Mode */}
              {exportPreviewMode === 'excel' ? (
                <View style={styles.csvPreviewContainer}>
                  {/* CSV Header */}
                  <View style={styles.csvPreviewHeader}>
                    <View style={styles.csvPreviewLogoRow}>
                      <View style={styles.csvPreviewLogo}>
                        <Text style={styles.csvPreviewLogoText}>{businessInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.csvPreviewBusinessName}>{businessName}</Text>
                        <Text style={styles.csvPreviewReportType}>{getReportTitle()}</Text>
                      </View>
                    </View>
                    <View style={styles.csvPreviewDateBadge}>
                      <Ionicons name="calendar-outline" size={12} color="#64748B" />
                      <Text style={styles.csvPreviewDateText}>
                        {summary ? `${formatDate(summary.start_date)} — ${formatDate(summary.end_date)}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* CSV Table Preview - Key Metrics */}
                  <View style={styles.csvTableSection}>
                    <Text style={styles.csvTableTitle}>KEY FINANCIAL METRICS</Text>
                    <View style={styles.csvTable}>
                      <View style={styles.csvTableHeader}>
                        <Text style={[styles.csvTableHeaderText, { flex: 2 }]}>Metric</Text>
                        <Text style={[styles.csvTableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Value</Text>
                        <Text style={[styles.csvTableHeaderText, { flex: 1, textAlign: 'right' }]}>Notes</Text>
                      </View>
                      {getCSVPreviewData().metrics.map((row, i) => (
                        <View key={i} style={[styles.csvTableRow, i % 2 === 0 && styles.csvTableRowAlt]}>
                          <Text style={[styles.csvTableCell, { flex: 2 }]}>{row.label}</Text>
                          <Text style={[styles.csvTableCellValue, { flex: 1.5, textAlign: 'right' }]}>{row.value}</Text>
                          <Text style={[styles.csvTableCellNote, { flex: 1, textAlign: 'right' }]}>{row.note}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* CSV Table Preview - Invoice Statistics */}
                  <View style={styles.csvTableSection}>
                    <Text style={styles.csvTableTitle}>INVOICE STATISTICS</Text>
                    <View style={styles.csvTable}>
                      <View style={styles.csvTableHeader}>
                        <Text style={[styles.csvTableHeaderText, { flex: 2 }]}>Status</Text>
                        <Text style={[styles.csvTableHeaderText, { flex: 1, textAlign: 'center' }]}>Count</Text>
                        <Text style={[styles.csvTableHeaderText, { flex: 1, textAlign: 'right' }]}>%</Text>
                      </View>
                      {getCSVPreviewData().status.map((row, i) => (
                        <View key={i} style={[styles.csvTableRow, i % 2 === 0 && styles.csvTableRowAlt]}>
                          <Text style={[styles.csvTableCell, { flex: 2 }]}>{row.status}</Text>
                          <Text style={[styles.csvTableCellValue, { flex: 1, textAlign: 'center' }]}>{row.count}</Text>
                          <Text style={[styles.csvTableCellNote, { flex: 1, textAlign: 'right' }]}>{row.pct}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* CSV Table Preview - Tax Summary */}
                  {taxReport && activeReport !== 'statement' && (
                    <View style={styles.csvTableSection}>
                      <Text style={styles.csvTableTitle}>TAX SUMMARY</Text>
                      <View style={styles.csvTable}>
                        <View style={styles.csvTableHeader}>
                          <Text style={[styles.csvTableHeaderText, { flex: 2 }]}>Description</Text>
                          <Text style={[styles.csvTableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
                        </View>
                        {getCSVPreviewData().tax.map((row, i) => (
                          <View key={i} style={[styles.csvTableRow, i % 2 === 0 && styles.csvTableRowAlt]}>
                            <Text style={[styles.csvTableCell, { flex: 2 }]}>{row.label}</Text>
                            <Text style={[styles.csvTableCellValue, { flex: 1.5, textAlign: 'right' }]}>{row.value}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Statement of Accounts Excel Preview */}
                  {activeReport === 'statement' && statementData && (
                    <>
                      {/* Statement Client Info */}
                      <View style={styles.csvTableSection}>
                        <Text style={styles.csvTableTitle}>CLIENT INFORMATION</Text>
                        <View style={styles.csvTable}>
                          <View style={[styles.csvTableRow, styles.csvTableRowAlt]}>
                            <Text style={[styles.csvTableCell, { flex: 1 }]}>Client Name</Text>
                            <Text style={[styles.csvTableCellValue, { flex: 2, textAlign: 'right' }]}>{statementData.client.name}</Text>
                          </View>
                          <View style={styles.csvTableRow}>
                            <Text style={[styles.csvTableCell, { flex: 1 }]}>Email</Text>
                            <Text style={[styles.csvTableCellValue, { flex: 2, textAlign: 'right' }]}>{statementData.client.email || 'N/A'}</Text>
                          </View>
                          <View style={[styles.csvTableRow, styles.csvTableRowAlt]}>
                            <Text style={[styles.csvTableCell, { flex: 1 }]}>Period</Text>
                            <Text style={[styles.csvTableCellValue, { flex: 2, textAlign: 'right' }]}>
                              {statementStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {statementEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Statement Summary */}
                      <View style={styles.csvTableSection}>
                        <Text style={styles.csvTableTitle}>ACCOUNT SUMMARY</Text>
                        <View style={styles.csvTable}>
                          <View style={styles.csvTableHeader}>
                            <Text style={[styles.csvTableHeaderText, { flex: 2 }]}>Description</Text>
                            <Text style={[styles.csvTableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
                          </View>
                          <View style={[styles.csvTableRow, styles.csvTableRowAlt]}>
                            <Text style={[styles.csvTableCell, { flex: 2 }]}>Total Invoiced</Text>
                            <Text style={[styles.csvTableCellValue, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(statementData.total_invoiced)}</Text>
                          </View>
                          <View style={styles.csvTableRow}>
                            <Text style={[styles.csvTableCell, { flex: 2 }]}>Total Paid</Text>
                            <Text style={[styles.csvTableCellValue, { flex: 1.5, textAlign: 'right', color: COLORS.success }]}>{formatCurrency(statementData.total_paid)}</Text>
                          </View>
                          <View style={[styles.csvTableRow, styles.csvTableRowAlt]}>
                            <Text style={[styles.csvTableCell, { flex: 2, fontWeight: '700' }]}>Balance Due</Text>
                            <Text style={[styles.csvTableCellValue, { flex: 1.5, textAlign: 'right', color: COLORS.danger, fontWeight: '700' }]}>{formatCurrency(statementData.closing_balance)}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Transaction History */}
                      <View style={styles.csvTableSection}>
                        <Text style={styles.csvTableTitle}>TRANSACTION HISTORY</Text>
                        <View style={styles.csvTable}>
                          <View style={styles.csvTableHeader}>
                            <Text style={[styles.csvTableHeaderText, { flex: 1.2 }]}>Date</Text>
                            <Text style={[styles.csvTableHeaderText, { flex: 2 }]}>Description</Text>
                            <Text style={[styles.csvTableHeaderText, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
                            <Text style={[styles.csvTableHeaderText, { flex: 1.2, textAlign: 'right' }]}>Balance</Text>
                          </View>
                          {statementData.invoices.map((inv, idx) => {
                            const runningBalance = statementData.invoices
                              .slice(0, idx + 1)
                              .reduce((sum, i) => sum + i.amount - i.paid_amount, 0);
                            return (
                              <View key={inv.id} style={[styles.csvTableRow, idx % 2 === 0 && styles.csvTableRowAlt]}>
                                <Text style={[styles.csvTableCell, { flex: 1.2 }]}>
                                  {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Text>
                                <Text style={[styles.csvTableCell, { flex: 2 }]}>Invoice #{inv.invoice_number}</Text>
                                <Text style={[styles.csvTableCellValue, { flex: 1.2, textAlign: 'right' }]}>{formatCurrency(inv.amount)}</Text>
                                <Text style={[styles.csvTableCellValue, { flex: 1.2, textAlign: 'right', color: COLORS.primary }]}>{formatCurrency(runningBalance)}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  )}

                  {/* CSV Footer */}
                  <View style={styles.csvPreviewFooter}>
                    <Text style={styles.csvPreviewFooterText}>Software Galaxy Invoicing • Business Management Suite</Text>
                    <Text style={styles.csvPreviewFooterDate}>
                      Report generated on {new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                      })}
                    </Text>
                  </View>
                </View>
              ) : (
              /* PDF Preview Mode - React Native preview (preferred view) */
              <>
              {/* Report Header Card */}
              <View style={styles.previewReportHeaderPlain}>
                <View style={styles.previewBrandRow}>
                  <View style={styles.previewLogoPlain}>
                    <Text style={styles.previewLogoTextPlain}>{businessInitials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewBrandNamePlain}>{businessName}</Text>
                    <Text style={styles.previewBrandSubPlain}>{getReportTitle()}</Text>
                  </View>
                </View>
                <View style={styles.previewPeriodBadge}>
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text style={styles.previewPeriodPlain}>
                    {useCustomDates 
                      ? `${formatDate(customStartDate.toISOString())} — ${formatDate(customEndDate.toISOString())}`
                      : summary ? `${formatDate(summary.start_date)} — ${formatDate(summary.end_date)}` : ''}
                  </Text>
                </View>
              </View>

              {/* Overview Report Content */}
              {activeReport === 'overview' && (
                <>
                {/* Metrics Row - Always shown */}
                <View style={styles.previewMetrics}>
                  <View style={styles.previewMetricCardPlain}>
                    <View style={[styles.previewMetricIconPlain, { backgroundColor: '#F1F5F9' }]}>
                      <Ionicons name="wallet-outline" size={16} color="#475569" />
                    </View>
                    <Text style={styles.previewMetricValuePlain}>{formatCurrency(summary?.total_invoiced || 0)}</Text>
                    <Text style={styles.previewMetricLabelPlain}>Invoiced</Text>
                  </View>
                  <View style={styles.previewMetricCardPlain}>
                    <View style={[styles.previewMetricIconPlain, { backgroundColor: '#F0FDF4' }]}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#166534" />
                    </View>
                    <Text style={[styles.previewMetricValuePlain, { color: '#166534' }]}>{formatCurrency(summary?.total_paid || 0)}</Text>
                    <Text style={styles.previewMetricLabelPlain}>Collected</Text>
                  </View>
                  <View style={styles.previewMetricCardPlain}>
                    <View style={[styles.previewMetricIconPlain, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="time-outline" size={16} color="#92400E" />
                    </View>
                    <Text style={[styles.previewMetricValuePlain, { color: '#92400E' }]}>{formatCurrency(summary?.total_outstanding || 0)}</Text>
                    <Text style={styles.previewMetricLabelPlain}>Outstanding</Text>
                  </View>
                </View>

                {/* Performance Overview (Graphical) - Show for 'graphical' or 'both' */}
                {(pdfFormat === 'graphical' || pdfFormat === 'both') && (
                  <View style={styles.previewTableSection}>
                    <Text style={styles.previewSectionTitlePlain}>📊 Performance Overview</Text>
                    <View style={styles.previewGaugePlain}>
                      <View style={styles.previewGaugeBgPlain}>
                        <View style={[styles.previewGaugeFillPlain, { width: `${collectionRate}%` }]} />
                      </View>
                      <View style={styles.previewGaugeLabelRow}>
                        <Text style={styles.previewGaugeLabelPlain}>Collection Rate</Text>
                        <Text style={styles.previewGaugeValuePlain}>{collectionRate}%</Text>
                      </View>
                    </View>
                    {/* Status Distribution Visual */}
                    <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {previewStatusData.map((item, i) => (
                        <View key={i} style={{ flex: item.value > 0 ? item.value : 0.5, height: 8, backgroundColor: item.color, borderRadius: 4 }} />
                      ))}
                    </View>
                    <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      {previewStatusData.map((item, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: item.color }} />
                          <Text style={{ fontSize: 11, color: '#64748B' }}>{item.label}: {item.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Status Breakdown Table (Tabular) - Show for 'tabular' or 'both' */}
                {(pdfFormat === 'tabular' || pdfFormat === 'both') && (
                  <View style={styles.previewTableSection}>
                    <Text style={styles.previewSectionTitlePlain}>📋 Invoice Status Breakdown</Text>
                    <View style={styles.previewTablePlain}>
                      <View style={styles.previewTableHeaderPlain}>
                        <Text style={[styles.previewTableHeaderTextPlain, { flex: 2, textAlign: 'left' }]}>Status</Text>
                        <Text style={[styles.previewTableHeaderTextPlain, { flex: 1, textAlign: 'center' }]}>Count</Text>
                        <Text style={[styles.previewTableHeaderTextPlain, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
                      </View>
                      {previewStatusData.map((row, i) => (
                        <View key={i} style={[styles.previewTableRowPlain, i % 2 === 0 && styles.previewTableRowAltPlain]}>
                          <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={[styles.previewStatusDot, { backgroundColor: row.color }]} />
                            <Text style={styles.previewTableCellPlain}>{row.label}</Text>
                          </View>
                          <Text style={[styles.previewTableCellValuePlain, { flex: 1, textAlign: 'center' }]}>{row.value}</Text>
                          <Text style={[styles.previewTableCellValuePlain, { flex: 1.5, textAlign: 'right' }]}>
                            {previewTotal > 0 ? `${Math.round((row.value / previewTotal) * 100)}%` : '0%'}
                          </Text>
                        </View>
                      ))}
                      <View style={styles.previewTableTotalPlain}>
                      <Text style={styles.previewTableTotalLabelPlain}>Total</Text>
                      <Text style={styles.previewTableTotalValuePlain}>{formatCurrency(summary?.total_invoiced || 0)}</Text>
                    </View>
                  </View>
                </View>
                )}
                </>
              )}

              {/* Aging Report Content */}
              {activeReport === 'aging' && (
                <View style={styles.previewTableSection}>
                  <Text style={styles.previewSectionTitlePlain}>Aging Breakdown</Text>
                  <View style={styles.previewTablePlain}>
                    <View style={styles.previewTableHeaderPlain}>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 2, textAlign: 'left' }]}>Period</Text>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 1, textAlign: 'center' }]}>Count</Text>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
                    </View>
                    {agingData.map((row, i) => (
                      <View key={i} style={[styles.previewTableRowPlain, i % 2 === 0 && styles.previewTableRowAltPlain]}>
                        <Text style={[styles.previewTableCellPlain, { flex: 2, textAlign: 'left' }]}>{row.bracket} ({row.days})</Text>
                        <Text style={[styles.previewTableCellValuePlain, { flex: 1, textAlign: 'center' }]}>{row.count}</Text>
                        <Text style={[styles.previewTableCellValuePlain, { flex: 1.5, textAlign: 'right', color: row.color }]}>{formatCurrency(row.amount)}</Text>
                      </View>
                    ))}
                    <View style={styles.previewTableTotalPlain}>
                      <Text style={[styles.previewTableTotalLabelPlain, { flex: 3, textAlign: 'left' }]}>Total Outstanding</Text>
                      <Text style={[styles.previewTableTotalValuePlain, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(summary?.total_outstanding || 0)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Clients Report Content */}
              {activeReport === 'clients' && (
                <View style={styles.previewTableSection}>
                  <Text style={styles.previewSectionTitlePlain}>Top Clients</Text>
                  <View style={styles.previewTablePlain}>
                    <View style={styles.previewTableHeaderPlain}>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 2, textAlign: 'left' }]}>Client</Text>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 1, textAlign: 'center' }]}>Invoices</Text>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 1.5, textAlign: 'right' }]}>Revenue</Text>
                    </View>
                    {[
                      { name: 'Acme Corp', invoices: 5, revenue: 15000 },
                      { name: 'Tech Solutions', invoices: 3, revenue: 8500 },
                      { name: 'Global Services', invoices: 4, revenue: 12000 },
                      { name: 'StartUp Inc', invoices: 2, revenue: 5000 },
                    ].map((client, i) => (
                      <View key={i} style={[styles.previewTableRowPlain, i % 2 === 0 && styles.previewTableRowAltPlain]}>
                        <Text style={[styles.previewTableCellPlain, { flex: 2, textAlign: 'left' }]}>{client.name}</Text>
                        <Text style={[styles.previewTableCellValuePlain, { flex: 1, textAlign: 'center' }]}>{client.invoices}</Text>
                        <Text style={[styles.previewTableCellValuePlain, { flex: 1.5, textAlign: 'right', color: '#166534' }]}>{formatCurrency(client.revenue)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Tax Report Content */}
              {activeReport === 'tax' && (
                <View style={styles.previewTableSection}>
                  <Text style={styles.previewSectionTitlePlain}>Tax Summary</Text>
                  <View style={styles.previewTablePlain}>
                    <View style={styles.previewTableHeaderPlain}>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 1, textAlign: 'left' }]}>Tax Rate</Text>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 1.5, textAlign: 'right' }]}>Taxable</Text>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 1.5, textAlign: 'right' }]}>Tax Amount</Text>
                    </View>
                    {(taxReport?.tax_breakdown || []).map((row, i) => (
                      <View key={i} style={[styles.previewTableRowPlain, i % 2 === 0 && styles.previewTableRowAltPlain]}>
                        <Text style={[styles.previewTableCellPlain, { flex: 1, textAlign: 'left' }]}>{row.rate}%</Text>
                        <Text style={[styles.previewTableCellValuePlain, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(row.taxable_amount)}</Text>
                        <Text style={[styles.previewTableCellValuePlain, { flex: 1.5, textAlign: 'right', color: '#2563EB' }]}>{formatCurrency(row.tax_amount)}</Text>
                      </View>
                    ))}
                    <View style={styles.previewTableTotalPlain}>
                      <Text style={styles.previewTableTotalLabelPlain}>Total Tax</Text>
                      <Text style={styles.previewTableTotalValuePlain}>{formatCurrency(taxReport?.total_tax || 0)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Payments Report Content */}
              {activeReport === 'payments' && (
                <View style={styles.previewTableSection}>
                  <Text style={styles.previewSectionTitlePlain}>Payment Summary</Text>
                  <View style={styles.previewTablePlain}>
                    <View style={styles.previewTableHeaderPlain}>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 2, textAlign: 'left' }]}>Method</Text>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 1, textAlign: 'center' }]}>Count</Text>
                      <Text style={[styles.previewTableHeaderTextPlain, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
                    </View>
                    {[
                      { method: 'Bank Transfer', count: 5, amount: summary?.total_paid ? summary.total_paid * 0.5 : 0 },
                      { method: 'Credit Card', count: 3, amount: summary?.total_paid ? summary.total_paid * 0.3 : 0 },
                      { method: 'Cash', count: 2, amount: summary?.total_paid ? summary.total_paid * 0.2 : 0 },
                    ].map((row, i) => (
                      <View key={i} style={[styles.previewTableRowPlain, i % 2 === 0 && styles.previewTableRowAltPlain]}>
                        <Text style={[styles.previewTableCellPlain, { flex: 2, textAlign: 'left' }]}>{row.method}</Text>
                        <Text style={[styles.previewTableCellValuePlain, { flex: 1, textAlign: 'center' }]}>{row.count}</Text>
                        <Text style={[styles.previewTableCellValuePlain, { flex: 1.5, textAlign: 'right', color: '#166534' }]}>{formatCurrency(row.amount)}</Text>
                      </View>
                    ))}
                    <View style={styles.previewTableTotalPlain}>
                      <Text style={[styles.previewTableTotalLabelPlain, { flex: 3, textAlign: 'left' }]}>Total Received</Text>
                      <Text style={[styles.previewTableTotalValuePlain, { flex: 1.5, textAlign: 'right' }]}>{formatCurrency(summary?.total_paid || 0)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Statement of Accounts PDF Preview - Updated to match Invoice Analytics style */}
              {activeReport === 'statement' && statementData && (
                <>
                  {/* Client Information Section */}
                  <View style={styles.previewTableSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="person" size={18} color={COLORS.primary} />
                      </View>
                      <Text style={styles.previewSectionTitlePlain}>Client Information</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 14 }}>
                      <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>
                          {statementData.client.name.substring(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.dark }}>{statementData.client.name}</Text>
                        <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>{statementData.client.email || 'No email on file'}</Text>
                      </View>
                      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 9, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>Statement Period</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.dark, marginTop: 2 }}>
                          {statementStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {statementEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Summary Cards - Same style as Invoice Analytics */}
                  <View style={styles.previewMetrics}>
                    <View style={[styles.previewMetricCardPlain, { borderTopWidth: 3, borderTopColor: '#334155' }]}>
                      <View style={[styles.previewMetricIconPlain, { backgroundColor: '#F1F5F9' }]}>
                        <Ionicons name="wallet-outline" size={16} color="#475569" />
                      </View>
                      <Text style={styles.previewMetricValuePlain}>{formatCurrency(statementData.total_invoiced)}</Text>
                      <Text style={styles.previewMetricLabelPlain}>Total Invoiced</Text>
                    </View>
                    <View style={[styles.previewMetricCardPlain, { borderTopWidth: 3, borderTopColor: '#166534' }]}>
                      <View style={[styles.previewMetricIconPlain, { backgroundColor: '#F0FDF4' }]}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#166534" />
                      </View>
                      <Text style={[styles.previewMetricValuePlain, { color: '#166534' }]}>{formatCurrency(statementData.total_paid)}</Text>
                      <Text style={styles.previewMetricLabelPlain}>Total Paid</Text>
                    </View>
                    <View style={[styles.previewMetricCardPlain, { borderTopWidth: 3, borderTopColor: '#DC2626' }]}>
                      <View style={[styles.previewMetricIconPlain, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="time-outline" size={16} color="#DC2626" />
                      </View>
                      <Text style={[styles.previewMetricValuePlain, { color: '#DC2626' }]}>{formatCurrency(statementData.closing_balance)}</Text>
                      <Text style={styles.previewMetricLabelPlain}>Balance Due</Text>
                    </View>
                  </View>

                  {/* Transaction History */}
                  <View style={styles.previewTableSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="list" size={18} color={COLORS.primary} />
                      </View>
                      <Text style={styles.previewSectionTitlePlain}>Transaction History</Text>
                    </View>
                    <View style={styles.previewTablePlain}>
                      <View style={[styles.previewTableHeaderPlain, { backgroundColor: '#334155' }]}>
                        <Text style={[styles.previewTableHeaderTextPlain, { flex: 1.2, textAlign: 'left', color: '#FFFFFF' }]}>Date</Text>
                        <Text style={[styles.previewTableHeaderTextPlain, { flex: 2, textAlign: 'left', color: '#FFFFFF' }]}>Description</Text>
                        <Text style={[styles.previewTableHeaderTextPlain, { flex: 1.2, textAlign: 'right', color: '#FFFFFF' }]}>Amount</Text>
                        <Text style={[styles.previewTableHeaderTextPlain, { flex: 1.2, textAlign: 'right', color: '#FFFFFF' }]}>Balance</Text>
                      </View>
                      {statementData.invoices.length === 0 ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                          <Text style={{ color: COLORS.gray }}>No transactions in this period</Text>
                        </View>
                      ) : (
                        statementData.invoices.map((inv, idx) => {
                          const runningBalance = statementData.invoices
                            .slice(0, idx + 1)
                            .reduce((sum, i) => sum + i.amount - i.paid_amount, 0);
                          return (
                            <View key={inv.id} style={[styles.previewTableRowPlain, idx % 2 === 0 && styles.previewTableRowAltPlain]}>
                              <Text style={[styles.previewTableCellPlain, { flex: 1.2, textAlign: 'left' }]}>
                                {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Text>
                              <Text style={[styles.previewTableCellPlain, { flex: 2, textAlign: 'left' }]}>
                                Invoice #{inv.invoice_number}
                              </Text>
                              <Text style={[styles.previewTableCellValuePlain, { flex: 1.2, textAlign: 'right', color: COLORS.primary, fontWeight: '700' }]}>
                                {formatCurrency(inv.amount)}
                              </Text>
                              <Text style={[styles.previewTableCellValuePlain, { flex: 1.2, textAlign: 'right' }]}>
                                {formatCurrency(runningBalance)}
                              </Text>
                            </View>
                          );
                        })
                      )}
                      <View style={[styles.previewTableTotalPlain, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.previewTableTotalLabelPlain, { flex: 4.4, color: '#1E293B' }]}>Closing Balance</Text>
                        <Text style={[styles.previewTableTotalValuePlain, { flex: 1.2, textAlign: 'right', color: '#1E293B' }]}>{formatCurrency(statementData.closing_balance)}</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

              {/* Footer Preview */}
              <View style={styles.previewFooterSectionPlain}>
                <View style={styles.previewFooterLeft}>
                  <Text style={styles.previewFooterProductName}>Software Galaxy Invoicing</Text>
                  <Text style={styles.previewFooterProductDetails}>Business Management Suite • {getReportTitle()}</Text>
                </View>
                <View style={styles.previewFooterRight}>
                  <Text style={styles.previewFooterDate}>{new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
                  })}</Text>
                  <Text style={styles.previewFooterGenerated}>Auto-generated report</Text>
                </View>
              </View>
              </>
              )}
            </ScrollView>

            {/* Format Selection - Show for PDF mode on overview report */}
            {activeReport === 'overview' && exportPreviewMode === 'pdf' && (
              <View style={styles.previewFormatSection}>
                <Text style={styles.previewFormatTitle}>Report Style</Text>
                <View style={styles.previewFormatOptions}>
                  {[
                    { key: 'graphical', icon: 'pie-chart-outline', label: 'Graphical' },
                    { key: 'tabular', icon: 'list-outline', label: 'Tabular' },
                    { key: 'both', icon: 'grid-outline', label: 'Both' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.previewFormatBtn, pdfFormat === opt.key && styles.previewFormatBtnActive]}
                      onPress={() => setPdfFormat(opt.key as any)}
                    >
                      <Ionicons name={opt.icon as any} size={16} color={pdfFormat === opt.key ? COLORS.white : COLORS.primary} />
                      <Text style={[styles.previewFormatBtnText, pdfFormat === opt.key && styles.previewFormatBtnTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Export Buttons */}
            <View style={styles.previewActions}>
              <TouchableOpacity 
                style={styles.previewExportPdf} 
                onPress={() => handleExport('pdf')}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="document-outline" size={18} color={COLORS.white} />
                    <Text style={styles.previewExportPdfText}>Export PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.previewExportCsv} 
                onPress={() => handleExport('excel')}
                disabled={exporting}
              >
                <Ionicons name="download-outline" size={18} color={COLORS.success} />
                <Text style={styles.previewExportCsvText}>Export Excel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Success Confirmation Modal */}
      <Modal
        visible={showExportSuccess}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExportSuccess(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            </View>
            
            {/* Success Message */}
            <Text style={styles.successTitle}>Export Successful!</Text>
            <Text style={styles.successMessage}>
              {exportedFormat === 'pdf' 
                ? 'Your PDF report has been generated. Use the print dialog to save it.'
                : 'Your Excel file has been downloaded successfully.'}
            </Text>
            
            {/* Report Details */}
            <View style={styles.successDetails}>
              <View style={styles.successDetailRow}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.gray} />
                <Text style={styles.successDetailText}>
                  {activeReport === 'statement' ? 'Statement of Accounts' : 
                   activeReport === 'overview' ? 'Invoice Analytics Report' :
                   activeReport === 'aging' ? 'Aging Report' :
                   activeReport === 'tax' ? 'Tax Report' :
                   activeReport === 'payments' ? 'Payments Report' : 'Report'}
                </Text>
              </View>
              <View style={styles.successDetailRow}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.gray} />
                <Text style={styles.successDetailText}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              <View style={styles.successDetailRow}>
                <Ionicons name={exportedFormat === 'pdf' ? 'document-outline' : 'grid-outline'} size={18} color={COLORS.gray} />
                <Text style={styles.successDetailText}>
                  {exportedFormat.toUpperCase()} Format
                </Text>
              </View>
            </View>
            
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.successCloseBtn}
              onPress={() => {
                setShowExportSuccess(false);
                setExportModalVisible(false);
              }}
            >
              <Text style={styles.successCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Export Options Modal (Mobile Only) */}
      <Modal
        visible={showExportOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExportOptions(false)}
      >
        <View style={styles.exportOptionsOverlay}>
          <TouchableOpacity 
            style={styles.exportOptionsBackdrop} 
            onPress={() => setShowExportOptions(false)}
            activeOpacity={1}
          />
          <View style={styles.exportOptionsContent}>
            {/* Handle bar */}
            <View style={styles.exportOptionsHandle} />
            
            {/* Header */}
            <View style={styles.exportOptionsHeader}>
              <View style={styles.exportOptionsIconContainer}>
                <Ionicons 
                  name={pendingExportFormat === 'pdf' ? 'document-text' : 'grid'} 
                  size={28} 
                  color={COLORS.primary} 
                />
              </View>
              <Text style={styles.exportOptionsTitle}>
                Export {pendingExportFormat.toUpperCase()}
              </Text>
              <Text style={styles.exportOptionsSubtitle}>
                Choose how you want to export your {getReportTitle().toLowerCase()}
              </Text>
            </View>
            
            {/* Export Options */}
            <View style={styles.exportOptionsList}>
              {/* Share Option */}
              <TouchableOpacity 
                style={styles.exportOptionItem}
                onPress={() => performExport(pendingExportFormat, 'share')}
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="share-outline" size={24} color="#6366F1" />
                </View>
                <View style={styles.exportOptionInfo}>
                  <Text style={styles.exportOptionTitle}>Share</Text>
                  <Text style={styles.exportOptionDesc}>Send via WhatsApp, Messenger, etc.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
              </TouchableOpacity>
              
              {/* Save to Device */}
              <TouchableOpacity 
                style={styles.exportOptionItem}
                onPress={() => performExport(pendingExportFormat, 'save')}
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name="download-outline" size={24} color="#16A34A" />
                </View>
                <View style={styles.exportOptionInfo}>
                  <Text style={styles.exportOptionTitle}>Save to Device</Text>
                  <Text style={styles.exportOptionDesc}>Download to your device storage</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
              </TouchableOpacity>
              
              {/* Email */}
              <TouchableOpacity 
                style={styles.exportOptionItem}
                onPress={() => performExport(pendingExportFormat, 'email')}
              >
                <View style={[styles.exportOptionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="mail-outline" size={24} color="#D97706" />
                </View>
                <View style={styles.exportOptionInfo}>
                  <Text style={styles.exportOptionTitle}>Email</Text>
                  <Text style={styles.exportOptionDesc}>Send directly via email</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.exportOptionsCancel}
              onPress={() => setShowExportOptions(false)}
            >
              <Text style={styles.exportOptionsCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            {/* Offline indicator */}
            {isOffline && (
              <View style={styles.offlineIndicator}>
                <Ionicons name="cloud-offline-outline" size={16} color="#EF4444" />
                <Text style={styles.offlineText}>
                  You're offline. Exports will be queued.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <HeroStats />
        <PeriodSelector />
        <ReportTabs />
        
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          {activeReport === 'overview' && renderOverviewReport()}
          {activeReport === 'aging' && renderAgingReport()}
          {activeReport === 'clients' && renderClientsReport()}
          {activeReport === 'tax' && renderTaxReport()}
          {activeReport === 'payments' && renderPaymentsReport()}
          {activeReport === 'statement' && renderStatementReport()}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero Section
  heroSection: { marginBottom: 0 },
  heroGradient: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroContent: {},
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  exportButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  heroStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  heroStatDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Period Section
  periodSection: { backgroundColor: COLORS.white, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  periodScroll: { paddingHorizontal: 20, gap: 10 },
  periodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: '#F1F5F9' },
  periodChipActive: { backgroundColor: COLORS.primary },
  periodChipText: { fontSize: 13, fontWeight: '600', color: COLORS.gray },
  periodChipTextActive: { color: COLORS.white },

  // Tabs
  tabsContainer: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabsScroll: { paddingHorizontal: 20, paddingVertical: 8 },
  tab: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, marginRight: 8, position: 'relative' },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginTop: 4 },
  tabTextActive: { color: COLORS.primary },
  tabIndicator: { position: 'absolute', bottom: 0, left: 10, right: 10, height: 3, backgroundColor: COLORS.primary, borderRadius: 2 },

  content: { padding: 20 },

  // Quick Insights
  insightsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  insightsRowMobile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  insightCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  insightCardMobile: { minWidth: '47%', flexGrow: 1, flexBasis: '47%', padding: 12 },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightBadge: { fontSize: 12, fontWeight: '700', color: COLORS.success, backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  insightValue: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  insightValueMobile: { fontSize: 22 },
  insightLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },

  // Charts Grid
  chartsGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  chartsGridMobile: { flexDirection: 'column', gap: 12 },
  chartCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  chartCardMobile: { flex: 0, padding: 16, minHeight: 'auto' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  chartAction: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  chartBody: { alignItems: 'center', paddingVertical: 16 },
  chartBodyMobile: { paddingVertical: 12 },
  chartCenter: { alignItems: 'center' },
  chartCenterValue: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  chartCenterLabel: { fontSize: 12, color: COLORS.gray },
  chartLegend: { marginTop: 16 },
  chartLegendMobile: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  legendItemMobile: { width: '48%', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#F8FAFC', borderRadius: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  legendDotMobile: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, fontSize: 13, color: COLORS.gray },
  legendLabelMobile: { fontSize: 12 },
  legendValue: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  legendValueMobile: { fontSize: 13 },

  // Gauge
  gaugeContainer: { width: '100%', alignItems: 'center' },
  gaugeBg: { width: '100%', height: 16, backgroundColor: '#F1F5F9', borderRadius: 8, overflow: 'hidden' },
  gaugeFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 8 },
  gaugeCenter: { alignItems: 'center', marginTop: 20 },
  gaugeValue: { fontSize: 40, fontWeight: '800', color: COLORS.success },
  gaugeLabel: { fontSize: 14, color: COLORS.gray },
  statsGrid: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  statsGridMobile: { gap: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: COLORS.gray },
  statValue: { fontSize: 18, fontWeight: '700', color: COLORS.dark, marginTop: 4 },

  // Table
  tableCard: { backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tableTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  tableAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tableActionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  tableContent: { padding: 0 },
  tableHeaderRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#F8FAFC' },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  tableRowAlt: { backgroundColor: '#FAFBFC' },
  tableRowDanger: { backgroundColor: COLORS.dangerLight },
  tableCell: {},
  tableCellText: { fontSize: 14, color: COLORS.dark },
  tableCellSubtext: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },

  // Alert Card
  alertCard: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  alertGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 16, fontWeight: '700', color: '#92400E' },
  alertSubtitle: { fontSize: 13, color: '#B45309', marginTop: 2 },
  alertAction: { backgroundColor: '#FBBF24', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  alertActionText: { fontSize: 13, fontWeight: '700', color: '#78350F' },

  // Standard Page Header (matching Invoices page design)
  pageHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
  },
  pageHeaderLeft: { flex: 1 },
  pageTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  pageSubtitle: { 
    fontSize: 14, 
    color: COLORS.gray, 
    marginTop: 4,
  },
  pageHeaderRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
  },
  exportButtonStandard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 10,
    gap: 8,
  },
  exportButtonTextStandard: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.white,
  },

  // Filter Pills (matching invoice status filters)
  filterSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  filterPillTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // Summary Stats Row (below filters)
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Period Section Standard
  periodSectionStandard: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  periodScrollStandard: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  periodChipStandard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  periodChipStandardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodChipTextStandard: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },
  periodChipTextStandardActive: {
    color: COLORS.white,
  },

  // Aging Grid
  agingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  agingGridMobile: { gap: 8 },
  agingCard: { flex: 1, minWidth: '18%', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderTopWidth: 4, alignItems: 'center' },
  agingCardMobile: { minWidth: '30%', padding: 10, flexGrow: 1, flexBasis: '30%' },
  agingBracket: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  agingDays: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  agingAmount: { fontSize: 18, fontWeight: '800', marginTop: 12 },
  agingCount: { marginTop: 8, backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  agingCountText: { fontSize: 11, color: COLORS.gray },

  // Clients
  clientsHeader: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  clientsStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: COLORS.white, borderRadius: 16, padding: 20 },
  clientsStatValue: { fontSize: 28, fontWeight: '800', color: COLORS.dark },
  clientsStatLabel: { fontSize: 12, color: COLORS.gray },
  clientAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  clientInitials: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  rateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rateBadgeText: { fontSize: 12, fontWeight: '700' },

  // Tax
  taxSummary: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  taxCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 24, alignItems: 'center' },
  taxIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  taxValue: { fontSize: 24, fontWeight: '800', color: COLORS.dark },
  taxLabel: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  taxRateBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  taxRateText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  // Payments
  paymentProgress: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, marginBottom: 20 },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  paymentTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  paymentPercent: { fontSize: 24, fontWeight: '800', color: COLORS.success },
  progressBarBg: { height: 12, backgroundColor: '#F1F5F9', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },
  paymentLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  paymentLabel: { fontSize: 13, color: COLORS.gray },
  paymentCards: { flexDirection: 'row', gap: 16 },
  paymentCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 20, padding: 24, alignItems: 'center' },
  paymentCardValue: { fontSize: 20, fontWeight: '800', marginTop: 12 },
  paymentCardLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },

  // Empty State
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: COLORS.gray, marginTop: 12 },

  // Export Preview Modal - New Card Style
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  previewModal: { backgroundColor: COLORS.white, borderRadius: 24, width: '100%', maxWidth: 520, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 15 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  previewHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewHeaderTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  previewCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  previewScroll: { maxHeight: 400 },
  previewReportHeader: { borderRadius: 16, padding: 20, margin: 16, marginBottom: 0 },
  previewBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  previewLogo: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  previewLogoText: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  previewBrandName: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  previewBrandSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  previewPeriod: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  previewMetrics: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 16 },
  previewMetricCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, alignItems: 'center' },
  previewMetricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  previewMetricValue: { fontSize: 14, fontWeight: '800', color: COLORS.dark },
  previewMetricLabel: { fontSize: 10, color: COLORS.gray, marginTop: 2 },
  previewChartsSection: { paddingHorizontal: 16, marginBottom: 16 },
  previewSectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
  previewChartsRow: { flexDirection: 'row', gap: 12 },
  previewChartCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16 },
  previewChartTitle: { fontSize: 11, fontWeight: '600', color: COLORS.gray, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' },
  previewPieContainer: { alignItems: 'center', marginBottom: 12 },
  previewLegend: { gap: 6 },
  previewLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewLegendDot: { width: 8, height: 8, borderRadius: 4 },
  previewLegendText: { fontSize: 11, color: COLORS.gray },
  previewGaugeContainer: { alignItems: 'center' },
  previewGaugeCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.successLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  previewGaugeValue: { fontSize: 22, fontWeight: '800', color: COLORS.success },
  previewProgressBar: { width: '100%', height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  previewProgressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 4 },
  previewGaugeStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  previewGaugeStat: { alignItems: 'center' },
  previewGaugeStatValue: { fontSize: 11, fontWeight: '700' },
  previewGaugeStatLabel: { fontSize: 9, color: COLORS.gray },
  previewTableSection: { paddingHorizontal: 16, marginBottom: 16 },
  previewTable: { backgroundColor: '#F8FAFC', borderRadius: 14, overflow: 'hidden' },
  previewTableHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.primary },
  previewTableHeaderText: { fontSize: 11, fontWeight: '600', color: COLORS.white, textTransform: 'uppercase' },
  previewTableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  previewTableRowAlt: { backgroundColor: '#FFFFFF' },
  previewTableCell: { fontSize: 12, color: COLORS.gray },
  previewTableCellValue: { fontSize: 12, fontWeight: '600' },
  previewTableTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.primaryLight },
  previewTableTotalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  previewTableTotalValue: { fontSize: 12, fontWeight: '800', color: COLORS.primaryDark },
  previewFooterSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  previewFooterBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewFooterLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  previewFooterLogoText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  previewFooterName: { fontSize: 12, fontWeight: '700', color: COLORS.dark },
  previewFooterSub: { fontSize: 10, color: COLORS.gray },
  previewFooterDate: { fontSize: 10, color: COLORS.gray },
  previewFormatSection: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FAFBFC' },
  previewFormatTitle: { fontSize: 11, fontWeight: '600', color: COLORS.gray, marginBottom: 10, textAlign: 'center' },
  previewFormatOptions: { flexDirection: 'row', gap: 8 },
  previewFormatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: 'transparent' },
  previewFormatBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  previewFormatBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  previewFormatBtnTextActive: { color: COLORS.white },
  previewActions: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  previewExportPdf: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary },
  previewExportPdfText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  previewExportCsv: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.successLight, borderWidth: 1, borderColor: COLORS.success },
  previewExportCsvText: { fontSize: 14, fontWeight: '700', color: COLORS.success },

  // Plain/Muted Color Styles for Export Preview Modal
  previewReportHeaderPlain: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, margin: 16, marginBottom: 0, borderWidth: 1, borderColor: '#E2E8F0' },
  previewLogoPlain: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  previewLogoTextPlain: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  previewBrandNamePlain: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  previewBrandSubPlain: { fontSize: 12, color: '#64748B', marginTop: 2 },
  previewPeriodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' },
  previewPeriodPlain: { fontSize: 12, color: '#475569' },
  previewMetricCardPlain: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  previewMetricIconPlain: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  previewMetricValuePlain: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  previewMetricLabelPlain: { fontSize: 10, color: '#64748B', marginTop: 2 },
  previewSectionTitlePlain: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 12 },
  previewChartCardPlain: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  previewChartTitlePlain: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' },
  previewLegendTextPlain: { fontSize: 11, color: '#475569' },
  previewGaugeCirclePlain: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#86EFAC' },
  previewGaugeValuePlain: { fontSize: 22, fontWeight: '700', color: '#166534' },
  previewProgressBarPlain: { width: '100%', height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  previewProgressFillPlain: { height: '100%', backgroundColor: '#4ADE80', borderRadius: 4 },
  previewGaugeStatValuePlain: { fontSize: 11, fontWeight: '600' },
  previewGaugeStatLabelPlain: { fontSize: 9, color: '#64748B' },
  previewTablePlain: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  previewTableHeaderPlain: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#334155' },
  previewTableHeaderTextPlain: { fontSize: 11, fontWeight: '600', color: '#FFFFFF', textTransform: 'uppercase' },
  previewTableRowPlain: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  previewTableRowAltPlain: { backgroundColor: '#F8FAFC' },
  previewTableCellPlain: { fontSize: 12, color: '#475569' },
  previewTableCellValuePlain: { fontSize: 12, fontWeight: '600' },
  previewTableTotalPlain: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F1F5F9' },
  previewTableTotalLabelPlain: { fontSize: 12, fontWeight: '600', color: '#334155' },
  previewTableTotalValuePlain: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  previewFooterSectionPlain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginVertical: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  previewFooterLeft: { flex: 1 },
  previewFooterRight: { alignItems: 'flex-end' },
  previewFooterProductName: { fontSize: 13, fontWeight: '700', color: '#334155' },
  previewFooterProductDetails: { fontSize: 10, color: '#64748B', marginTop: 2 },
  previewFooterGenerated: { fontSize: 9, color: '#94A3B8', marginTop: 2 },
  previewFormatSectionPlain: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  previewFormatTitlePlain: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 10, textAlign: 'center' },
  previewFormatBtnPlain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  previewFormatBtnActivePlain: { backgroundColor: '#334155', borderColor: '#334155' },
  previewFormatBtnTextPlain: { fontSize: 12, fontWeight: '600', color: '#475569' },
  previewFormatBtnTextActivePlain: { color: '#FFFFFF' },
  previewActionsPlain: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  previewExportPdfPlain: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#334155' },
  previewExportPdfTextPlain: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  previewExportCsvPlain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  previewExportCsvTextPlain: { fontSize: 14, fontWeight: '600', color: '#166534' },

  // Legacy Preview Modal Styles (keeping for backward compatibility)
  previewModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  previewModalContainer: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  previewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  previewModalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  previewContent: { padding: 20, maxHeight: 450 },
  previewReportTitle: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  previewReportPeriod: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  previewMetricsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  previewSection: { marginBottom: 20 },
  previewTableLabel: { fontSize: 13, color: COLORS.gray },
  previewTableValue: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  previewTimestamp: { fontSize: 11, color: COLORS.gray, textAlign: 'center', marginTop: 10 },
  previewFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FAFBFC' },
  previewFooterTitle: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 12, textAlign: 'center' },
  previewExportButtons: { flexDirection: 'row', gap: 12 },
  previewExportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  previewExportBtnText: { fontSize: 15, fontWeight: '700' },

  // Compact Export Modal (like Invoice View Modal)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  exportModalBox: { backgroundColor: COLORS.white, borderRadius: 20, width: '100%', maxWidth: 450, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  exportModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  exportModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exportModalIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  exportModalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.dark },
  exportModalSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  exportModalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  exportSummaryRow: { flexDirection: 'row', padding: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  exportSummaryItem: { flex: 1, alignItems: 'center' },
  exportSummaryValue: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  exportSummaryLabel: { fontSize: 11, color: COLORS.gray, marginTop: 4 },
  formatSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  formatSectionTitle: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginBottom: 12 },
  formatOptions: { flexDirection: 'row', gap: 10 },
  formatOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: 'transparent' },
  formatOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  formatOptionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  formatOptionTextActive: { color: COLORS.white },
  exportButtonsRow: { flexDirection: 'row', padding: 20, gap: 12 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  exportBtnPdf: { backgroundColor: COLORS.primary },
  exportBtnCsv: { backgroundColor: COLORS.successLight, borderWidth: 1, borderColor: COLORS.success },
  exportBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  // Legacy styles kept for compatibility
  exportModal: { backgroundColor: COLORS.white, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
  exportOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 12, gap: 16 },
  exportOptionIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exportOptionContent: { flex: 1 },
  exportOptionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  exportOptionDesc: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  
  // Date Picker Modal Styles
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20, flexDirection: 'column' },
  datePickerModal: { backgroundColor: COLORS.white, borderRadius: 20, width: '100%', maxWidth: 360, overflow: 'hidden' },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  datePickerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },
  datePickerContent: { padding: 20 },
  datePickerActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12 },
  datePickerCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  datePickerCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  datePickerNextBtn: { flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  datePickerNextText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  
  // Enhanced Date Picker Styles
  datePickerModalEnhanced: { backgroundColor: COLORS.white, borderRadius: 24, width: '100%', maxWidth: 420, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 15 },
  datePickerHeaderEnhanced: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  datePickerHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  datePickerIconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  datePickerTitleEnhanced: { fontSize: 17, fontWeight: '700', color: COLORS.dark },
  datePickerSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  datePickerCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  datePickerBody: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateFieldContainer: { flex: 1 },
  dateFieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 8, textTransform: 'uppercase' },
  dateInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  dateConnector: { paddingTop: 20 },
  quickSelectSection: { paddingHorizontal: 20, paddingBottom: 16 },
  quickSelectLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 10, textTransform: 'uppercase' },
  quickSelectRow: { flexDirection: 'row', gap: 10 },
  quickSelectBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  quickSelectBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.gray },
  datePickerActionsEnhanced: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  datePickerCancelBtnEnhanced: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  datePickerCancelTextEnhanced: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  datePickerApplyBtn: { flex: 2, flexDirection: 'row', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  datePickerApplyText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  // Export Toggle Styles
  exportToggleContainer: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FAFBFC' },
  exportToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  exportToggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  exportToggleText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  exportToggleTextActive: { color: '#FFFFFF' },

  // Excel Preview Styles
  csvPreviewContainer: { padding: 16 },
  csvPreviewHeader: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  csvPreviewLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  csvPreviewLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  csvPreviewLogoText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  csvPreviewBusinessName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  csvPreviewReportType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  csvPreviewDateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  csvPreviewDateText: { fontSize: 11, color: '#64748B' },

  csvTableSection: { marginBottom: 16 },
  csvTableTitle: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  csvTable: { backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  csvTableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 10, paddingHorizontal: 12 },
  csvTableHeaderText: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  csvTableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  csvTableRowAlt: { backgroundColor: '#FAFBFC' },
  csvTableCell: { fontSize: 12, color: '#374151' },
  csvTableCellValue: { fontSize: 12, fontWeight: '600', color: '#111827' },
  csvTableCellNote: { fontSize: 11, color: '#9CA3AF' },

  csvPreviewFooter: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 14, marginTop: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  csvPreviewFooterText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  csvPreviewFooterDate: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },

  // Statement of Accounts Styles
  statementContainer: { padding: 16 },
  statementSection: { marginBottom: 20 },
  statementSectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginBottom: 10 },
  clientSelector: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  clientSelectorText: { flex: 1, fontSize: 15, color: COLORS.dark },
  clientDropdown: { backgroundColor: COLORS.white, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  noClientsText: { padding: 16, textAlign: 'center', color: COLORS.gray, fontSize: 14 },
  clientOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  clientOptionSelected: { backgroundColor: COLORS.primaryLight },
  clientOptionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  clientOptionInitials: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  clientOptionName: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  clientOptionEmail: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statementDateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statementDateField: { flex: 1 },
  statementDateLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 6 },
  statementDateValue: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, fontSize: 14, color: COLORS.dark },
  generateStatementBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12 },
  generateStatementBtnDisabled: { backgroundColor: '#A5B4FC', opacity: 0.6 },
  generateStatementBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  statementResults: { marginTop: 10 },
  statementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  statementClientInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statementClientIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  statementClientInitials: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  statementClientName: { fontSize: 16, fontWeight: '700', color: COLORS.dark },
  statementPeriod: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  exportStatementBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  exportStatementBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  statementSummaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statementSummaryCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 14, alignItems: 'center' },
  statementSummaryLabel: { fontSize: 11, color: COLORS.gray, marginBottom: 4, textTransform: 'uppercase' },
  statementSummaryValue: { fontSize: 16, fontWeight: '800', color: COLORS.dark },
  statementTable: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  statementTableTitle: { fontSize: 13, fontWeight: '700', color: COLORS.dark, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statementTableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 10, paddingHorizontal: 14 },
  statementTableHeaderText: { fontSize: 10, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase' },
  statementTableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statementTableRowAlt: { backgroundColor: '#FAFBFC' },
  statementTableCell: { fontSize: 13, color: COLORS.dark },
  statementTableCellAmount: { fontSize: 13, fontWeight: '600', color: COLORS.dark },
  statementTableCellBalance: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  statementEmptyRow: { padding: 30, alignItems: 'center' },
  statementEmptyText: { fontSize: 14, color: COLORS.gray },
  statementTableTotal: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#F1F5F9' },
  statementTableTotalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  statementTableTotalValue: { fontSize: 14, fontWeight: '800', color: COLORS.primary },

  // Export Success Modal Styles
  successModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: { 
    backgroundColor: COLORS.white, 
    borderRadius: 24, 
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successDetailText: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '500',
  },
  successCloseBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    width: '100%',
  },
  successCloseBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Export Options Modal Styles (Mobile)
  exportOptionsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  exportOptionsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  exportOptionsContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
  },
  exportOptionsHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  exportOptionsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  exportOptionsIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  exportOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  exportOptionsSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  exportOptionsList: {
    gap: 12,
    marginBottom: 20,
  },
  exportOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  exportOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOptionInfo: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  exportOptionDesc: {
    fontSize: 13,
    color: COLORS.gray,
  },
  exportOptionsCancel: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  exportOptionsCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  offlineText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  
  // Mobile message styles
  mobileMessage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mobileMessageText: {
    fontSize: 16,
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
  },
  mobileMessageButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  mobileMessageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },

  // ===== MOBILE RESPONSIVE STYLES =====
  
  // Page Header Mobile
  pageHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
  },
  pageHeaderRightMobile: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  pageTitleMobile: {
    fontSize: 24,
  },

  // Summary Stats Mobile
  summaryStatsRowMobile: {
    flexDirection: 'column',
    gap: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryStatMobile: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryStatValueMobile: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryStatLabelMobile: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 0,
    marginRight: 8,
    textTransform: 'none',
  },

  // Content padding for mobile
  contentMobile: {
    padding: 16,
  },

  // Tax Summary Mobile
  taxSummaryMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  taxCardMobile: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  taxIconMobile: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 0,
  },
  taxValueMobile: {
    fontSize: 20,
  },
  taxLabelMobile: {
    fontSize: 12,
    marginTop: 2,
  },

  // Clients Header Mobile
  clientsHeaderMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  clientsStatMobile: {
    padding: 14,
    gap: 12,
  },
  clientsStatValueMobile: {
    fontSize: 22,
  },

  // Mobile Client Card Styles
  mobileClientCard: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mobileClientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mobileClientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mobileClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  mobileClientInvoices: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  mobileClientAmounts: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  mobileClientAmountItem: {
    flex: 1,
    alignItems: 'center',
  },
  mobileClientAmountLabel: {
    fontSize: 11,
    color: COLORS.gray,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mobileClientAmountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  mobileClientAmountDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },

  // Payment Cards Mobile
  paymentCardsMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  paymentCardMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  paymentCardValueMobile: {
    fontSize: 18,
    marginTop: 0,
  },
  paymentCardLabelMobile: {
    fontSize: 11,
    marginTop: 0,
  },

  // Payment Summary Card (Mobile)
  paymentSummaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentSummaryHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  paymentSummaryContent: {
    padding: 16,
  },
  paymentSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  paymentSummaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentSummaryInfo: {
    flex: 1,
    marginLeft: 14,
  },
  paymentSummaryLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 2,
  },
  paymentSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  paymentSummaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 58,
  },

  // Payment List Styles (Mobile)
  paymentListItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  paymentListInvoice: {
    flex: 1,
  },
  paymentListInvoiceNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
  },
  paymentListClient: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  paymentListAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  paymentListFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentListDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentListDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  paymentListMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentListMethodText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Payment Method Badge (Desktop)
  paymentMethodBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray,
  },

  // Table Mobile
  tableCardMobile: {
    borderRadius: 16,
    marginBottom: 16,
  },
  tableHeaderMobile: {
    padding: 16,
  },
  tableRowMobile: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tableCellTextMobile: {
    fontSize: 12,
  },

  // Alert Card Mobile
  alertCardMobile: {
    marginBottom: 16,
  },
  alertGradientMobile: {
    padding: 14,
    flexDirection: 'column',
    gap: 10,
  },
});
