import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import ExcelJS from 'exceljs';

// Types
export interface ReportMetric {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}

export interface ChartDataItem {
  label: string;
  value: number;
  color: string;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  flex?: number;
  format?: (value: any) => string;
}

export interface TableData {
  title: string;
  columns: TableColumn[];
  rows: any[];
}

export interface ExportReportConfig {
  // Business info
  businessName: string;
  businessInitials: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  
  // Report info
  reportTitle: string;
  reportSubtitle?: string;
  dateRange: string;
  
  // Data
  metrics: ReportMetric[];
  chartData?: ChartDataItem[];
  chartTitle?: string;
  progressData?: ChartDataItem[];
  progressTitle?: string;
  tables?: TableData[];
  
  // Styling
  primaryColor?: string;
  appName?: string;
}

interface ExportReportModalProps {
  visible: boolean;
  onClose: () => void;
  config: ExportReportConfig;
  formatCurrency: (value: number) => string;
}

const COLORS = {
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  white: '#FFFFFF',
  dark: '#1E293B',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  border: '#E2E8F0',
};

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  visible,
  onClose,
  config,
  formatCurrency,
}) => {
  const [exportPreviewMode, setExportPreviewMode] = useState<'pdf' | 'excel'>('pdf');
  const [pdfFormat, setPdfFormat] = useState<'graphical' | 'tabular' | 'both'>('both');
  const [exporting, setExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<'pdf' | 'excel'>('pdf');

  const isWeb = Platform.OS === 'web';
  const primaryColor = config.primaryColor || COLORS.primary;

  // Generate PDF HTML
  const generatePDFHtml = (): string => {
    const {
      businessName,
      businessInitials,
      businessAddress,
      businessPhone,
      businessEmail,
      reportTitle,
      dateRange,
      metrics,
      chartData,
      chartTitle,
      progressData,
      progressTitle,
      tables,
      appName,
    } = config;

    const reportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
    });

    // Generate donut chart CSS
    const generateDonutGradient = (data: ChartDataItem[]) => {
      const total = data.reduce((sum, d) => sum + d.value, 0);
      if (total === 0) return '#E5E7EB 0deg 360deg';
      
      let gradient = '';
      let currentAngle = 0;
      
      data.forEach((d, i) => {
        const angle = (d.value / total) * 360;
        const endAngle = currentAngle + angle;
        gradient += `${d.color} ${currentAngle}deg ${endAngle}deg`;
        if (i < data.length - 1) gradient += ', ';
        currentAngle = endAngle;
      });
      
      return gradient;
    };

    // Generate progress bars HTML
    const generateProgressBars = (data: ChartDataItem[], title: string) => {
      const total = data.reduce((sum, d) => sum + d.value, 0);
      return `
        <div class="chart-box">
          <div class="chart-title">${title}</div>
          ${data.slice(0, 4).map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return `
              <div class="progress-item">
                <div class="progress-header">
                  <span class="progress-label">${d.label}</span>
                  <span class="progress-value">${pct}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${pct}%; background: ${d.color};"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    };

    // Generate tables HTML
    const generateTablesHtml = () => {
      if (!tables || tables.length === 0) return '';
      
      return tables.map(table => `
        <div class="section">
          <div class="section-title">${table.title}</div>
          <table class="table">
            <thead>
              <tr>
                ${table.columns.map(col => 
                  `<th class="${col.align === 'right' ? 'right' : ''}" style="flex: ${col.flex || 1};">${col.label}</th>`
                ).join('')}
              </tr>
            </thead>
            <tbody>
              ${table.rows.slice(0, 10).map((row, i) => `
                <tr>
                  ${table.columns.map(col => {
                    const value = row[col.key];
                    const formatted = col.format ? col.format(value) : value;
                    return `<td class="${col.align === 'right' ? 'right bold' : ''}">${formatted}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('');
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reportTitle} - ${businessName}</title>
        <style>
          @page { size: A4; margin: 15mm 15mm 25mm 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; background: #FFFFFF; line-height: 1.5; font-size: 12px; }
          
          .header { background: linear-gradient(135deg, #334155 0%, #1E293B 100%); padding: 24px 28px; color: white; border-radius: 8px; margin-bottom: 16px; }
          .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
          .brand { display: flex; align-items: center; gap: 14px; }
          .brand-logo { width: 44px; height: 44px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: white; border: 2px solid rgba(255,255,255,0.2); }
          .brand-name { font-size: 18px; font-weight: 700; color: white; }
          .brand-sub { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }
          .brand-address { font-size: 10px; color: rgba(255,255,255,0.6); margin-top: 4px; line-height: 1.4; }
          .badge { background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; color: white; letter-spacing: 0.5px; }
          .date-info { font-size: 12px; color: rgba(255,255,255,0.8); }
          
          .content { padding: 0; padding-bottom: 80px; }
          
          .metrics { display: flex; gap: 14px; margin-bottom: 20px; }
          .metric { flex: 1; background: #F8FAFC; border-radius: 10px; padding: 16px; border: 1px solid #E2E8F0; }
          .metric-value { font-size: 18px; font-weight: 700; color: #1E293B; }
          .metric-value.success { color: #166534; }
          .metric-value.warning { color: #92400E; }
          .metric-label { font-size: 10px; color: #64748B; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          
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
          
          .section { background: #FFF; border-radius: 10px; border: 1px solid #E5E7EB; overflow: hidden; margin-bottom: 20px; page-break-inside: avoid; }
          .section-title { font-size: 13px; font-weight: 600; color: #1E293B; padding: 14px 18px; background: #F8FAFC; border-bottom: 1px solid #E5E7EB; }
          .table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .table th { background: #334155; padding: 12px 18px; text-align: left; font-size: 10px; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
          .table th.right { text-align: right; }
          .table td { padding: 12px 18px; border-bottom: 1px solid #F3F4F6; }
          .table tr:nth-child(odd) { background: #FFFFFF; }
          .table tr:nth-child(even) { background: #F8FAFC; }
          .table .right { text-align: right; }
          .table .bold { font-weight: 600; }
          
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          
          .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #F8FAFC; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; font-size: 10px; }
          .footer-brand { display: flex; align-items: center; gap: 12px; }
          .footer-logo { width: 32px; height: 32px; background: #334155; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 700; }
          .footer-name { font-size: 13px; font-weight: 600; color: #1E293B; }
          .footer-tagline { font-size: 10px; color: #64748B; }
          .footer-date { font-size: 11px; color: #64748B; text-align: right; }
          .footer-page { font-size: 10px; color: #94A3B8; margin-top: 2px; }
          
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
            .footer { position: fixed; bottom: 0; left: 15mm; right: 15mm; } 
            .content { padding-bottom: 100px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-top">
            <div class="brand">
              <div class="brand-logo">${businessInitials}</div>
              <div>
                <div class="brand-name">${businessName}</div>
                <div class="brand-sub">${reportTitle}</div>
                ${businessAddress || businessPhone || businessEmail ? `
                  <div class="brand-address">
                    ${businessAddress ? businessAddress + '<br>' : ''}
                    ${businessPhone || ''}${businessPhone && businessEmail ? ' • ' : ''}${businessEmail || ''}
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="badge">${reportTitle}</div>
          </div>
          <div class="date-info">📅 ${dateRange}</div>
        </div>
        
        <div class="content">
          <div class="metrics">
            ${metrics.map(m => `
              <div class="metric">
                <div class="metric-value${m.color === 'success' ? ' success' : m.color === 'warning' ? ' warning' : ''}">${m.value}</div>
                <div class="metric-label">${m.label}</div>
              </div>
            `).join('')}
          </div>
          
          ${(pdfFormat === 'graphical' || pdfFormat === 'both') && (chartData || progressData) ? `
          <div class="charts-row">
            ${chartData && chartData.length > 0 ? `
            <div class="chart-box">
              <div class="chart-title">${chartTitle || 'Distribution'}</div>
              <div class="chart-content">
                <div class="donut" style="background: conic-gradient(${generateDonutGradient(chartData)});">
                  <div class="donut-center">${chartData.reduce((sum, d) => sum + d.value, 0)}</div>
                </div>
                <div class="legend">
                  ${chartData.slice(0, 5).map(d => `
                    <div class="legend-item">
                      <div class="legend-dot" style="background: ${d.color};"></div>
                      <span class="legend-label">${d.label}</span>
                      <span class="legend-value">${typeof d.value === 'number' && d.value > 100 ? formatCurrency(d.value) : d.value}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
            ` : ''}
            ${progressData && progressData.length > 0 ? generateProgressBars(progressData, progressTitle || 'Performance') : ''}
          </div>
          ` : ''}
          
          ${(pdfFormat === 'tabular' || pdfFormat === 'both') ? generateTablesHtml() : ''}
        </div>
        
        <div class="footer">
          <div class="footer-brand">
            <div class="footer-logo">SG</div>
            <div>
              <div class="footer-name">Software Galaxy ${appName || 'Suite'}</div>
              <div class="footer-tagline">Business Management Suite</div>
            </div>
          </div>
          <div>
            <div class="footer-date">${reportDate}</div>
            <div class="footer-page">Auto-generated report</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Generate professional Excel using ExcelJS
  const generateExcel = async (): Promise<Uint8Array> => {
    const {
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      reportTitle,
      dateRange,
      metrics,
      tables,
      appName,
    } = config;

    const reportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = appName || 'Software Galaxy';
    workbook.created = new Date();

    // Style definitions
    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor.replace('#', 'FF') } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: primaryColor.replace('#', 'FF') } },
        bottom: { style: 'thin', color: { argb: primaryColor.replace('#', 'FF') } },
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

    // Create main worksheet
    const ws = workbook.addWorksheet(reportTitle);
    
    // Determine column count based on tables or default to 4
    const colCount = tables && tables.length > 0 
      ? Math.max(...tables.map(t => t.columns.length), 4)
      : 4;

    // Title row
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getCell('A1');
    titleCell.value = reportTitle.toUpperCase();
    titleCell.style = headerStyle;
    titleCell.style.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).height = 35;

    // Business info rows
    ws.getCell('A3').value = 'Business:';
    ws.getCell('A3').font = { bold: true };
    ws.getCell('B3').value = businessName;
    
    ws.getCell('A4').value = 'Report Period:';
    ws.getCell('A4').font = { bold: true };
    ws.getCell('B4').value = dateRange;
    
    ws.getCell('A5').value = 'Generated:';
    ws.getCell('A5').font = { bold: true };
    ws.getCell('B5').value = reportDate;
    
    if (businessAddress) {
      ws.getCell('A6').value = 'Address:';
      ws.getCell('A6').font = { bold: true };
      ws.getCell('B6').value = businessAddress;
    }

    // Key Metrics Section
    let currentRow = 8;
    ws.mergeCells(currentRow, 1, currentRow, colCount);
    ws.getCell(`A${currentRow}`).value = 'KEY METRICS';
    ws.getCell(`A${currentRow}`).style = sectionHeaderStyle;
    ws.getRow(currentRow).height = 25;
    currentRow++;

    // Metrics table header
    ws.getCell(`A${currentRow}`).value = 'Metric';
    ws.getCell(`A${currentRow}`).style = tableHeaderStyle;
    ws.getCell(`B${currentRow}`).value = 'Value';
    ws.getCell(`B${currentRow}`).style = tableHeaderStyle;
    ws.getRow(currentRow).height = 22;
    currentRow++;

    // Metrics data
    metrics.forEach((metric, idx) => {
      const row = ws.getRow(currentRow);
      row.getCell(1).value = metric.label;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = String(metric.value);
      row.getCell(2).alignment = { horizontal: 'right' };
      
      // Alternate row colors
      if (idx % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      }
      currentRow++;
    });

    currentRow += 2;

    // Tables
    if (tables && tables.length > 0) {
      tables.forEach((table) => {
        // Table title
        ws.mergeCells(currentRow, 1, currentRow, colCount);
        ws.getCell(`A${currentRow}`).value = table.title.toUpperCase();
        ws.getCell(`A${currentRow}`).style = sectionHeaderStyle;
        ws.getRow(currentRow).height = 25;
        currentRow++;

        // Table headers
        table.columns.forEach((col, colIdx) => {
          const cell = ws.getCell(currentRow, colIdx + 1);
          cell.value = col.label;
          cell.style = tableHeaderStyle;
          if (col.align === 'right') {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
        });
        ws.getRow(currentRow).height = 22;
        currentRow++;

        // Table data rows
        table.rows.forEach((rowData, rowIdx) => {
          const row = ws.getRow(currentRow);
          table.columns.forEach((col, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            let value = rowData[col.key];
            
            // Apply column format if provided
            if (col.format && typeof value === 'number') {
              value = col.format(value);
            }
            
            cell.value = value;
            
            if (col.align === 'right') {
              cell.alignment = { horizontal: 'right' };
            }
          });

          // Alternate row colors
          if (rowIdx % 2 === 0) {
            row.eachCell((cell) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });
          }
          currentRow++;
        });

        currentRow += 2;
      });
    }

    // Set column widths
    const defaultWidths = [20, 18, 15, 18, 15, 15];
    ws.columns = defaultWidths.slice(0, colCount).map(width => ({ width }));

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return new Uint8Array(buffer as ArrayBuffer);
  };

  // Generate CSV content (fallback for basic export)
  const generateCSV = (): string => {
    const { businessName, reportTitle, dateRange, metrics, tables } = config;
    
    let csv = `${businessName}\n`;
    csv += `${reportTitle}\n`;
    csv += `Period: ${dateRange}\n`;
    csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    // Metrics
    csv += `KEY METRICS\n`;
    metrics.forEach(m => {
      csv += `${m.label},${m.value}\n`;
    });
    csv += '\n';
    
    // Tables
    if (tables) {
      tables.forEach(table => {
        csv += `${table.title}\n`;
        csv += table.columns.map(c => c.label).join(',') + '\n';
        table.rows.forEach(row => {
          csv += table.columns.map(c => {
            const val = row[c.key];
            return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
          }).join(',') + '\n';
        });
        csv += '\n';
      });
    }
    
    return csv;
  };

  // Handle export
  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      if (format === 'excel') {
        // Generate professional Excel file
        const excelData = await generateExcel();
        
        if (isWeb) {
          // Web: Download as .xlsx file
          const blob = new Blob([excelData], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${config.reportTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
          
          setExportedFormat('excel');
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        } else {
          // Mobile: Save and share Excel file
          const filename = `${config.reportTitle.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
          const filePath = `${FileSystem.cacheDirectory}${filename}`;
          
          // Convert Uint8Array to base64
          const base64 = btoa(
            String.fromCharCode.apply(null, Array.from(excelData))
          );
          
          await FileSystem.writeAsStringAsync(filePath, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: `Export ${config.reportTitle}`,
          });
          
          setExportedFormat('excel');
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        }
        onClose();
      } else {
        const htmlContent = generatePDFHtml();
        
        if (isWeb) {
          const printWindow = window.open('', '_blank', 'width=800,height=600');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.onload = () => printWindow.print();
            setTimeout(() => {
              if (!printWindow.closed) printWindow.print();
            }, 800);
          }
        } else {
          const { uri } = await Print.printToFileAsync({ html: htmlContent });
          await Sharing.shareAsync(uri, { 
            mimeType: 'application/pdf',
            dialogTitle: `Export ${config.reportTitle}`,
          });
        }
        
        onClose();
        setExportedFormat('pdf');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Unable to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalBox}>
            {/* Header */}
            <View style={styles.exportModalHeader}>
              <View style={styles.exportModalHeaderLeft}>
                <View style={[styles.exportModalIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="analytics" size={24} color={primaryColor} />
                </View>
                <View>
                  <Text style={styles.exportModalTitle}>{config.reportTitle}</Text>
                  <Text style={styles.exportModalSubtitle}>Export your report data</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.exportModalClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Preview Toggle */}
            <View style={styles.previewToggleRow}>
              <TouchableOpacity 
                style={[styles.previewToggleBtnBase, exportPreviewMode === 'pdf' && styles.previewToggleBtnActive]}
                onPress={() => setExportPreviewMode('pdf')}
              >
                <Ionicons name="document-outline" size={16} color={exportPreviewMode === 'pdf' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.previewToggleText, exportPreviewMode === 'pdf' && styles.previewToggleTextActive]}>PDF Preview</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.previewToggleBtnBase, exportPreviewMode === 'excel' && styles.previewToggleBtnActive]}
                onPress={() => setExportPreviewMode('excel')}
              >
                <Ionicons name="grid-outline" size={16} color={exportPreviewMode === 'excel' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.previewToggleText, exportPreviewMode === 'excel' && styles.previewToggleTextActive]}>Excel Preview</Text>
              </TouchableOpacity>
            </View>

            {/* Preview Content */}
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {exportPreviewMode === 'excel' ? (
                <View style={styles.csvPreviewContainer}>
                  <View style={styles.csvPreviewHeader}>
                    <View style={styles.csvPreviewLogoRow}>
                      <View style={styles.csvPreviewLogo}>
                        <Text style={styles.csvPreviewLogoText}>{config.businessInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.csvPreviewBusinessName}>{config.businessName}</Text>
                        <Text style={styles.csvPreviewReportType}>{config.reportTitle}</Text>
                      </View>
                    </View>
                    <View style={styles.csvPreviewDateBadge}>
                      <Ionicons name="calendar-outline" size={12} color="#64748B" />
                      <Text style={styles.csvPreviewDateText}>{config.dateRange}</Text>
                    </View>
                  </View>

                  <View style={styles.csvTableSection}>
                    <Text style={styles.csvTableTitle}>KEY METRICS</Text>
                    <View style={styles.csvTable}>
                      <View style={styles.csvTableHeader}>
                        <Text style={[styles.csvTableHeaderText, { flex: 2 }]}>Metric</Text>
                        <Text style={[styles.csvTableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Value</Text>
                      </View>
                      {config.metrics.map((m, i) => (
                        <View key={i} style={[styles.csvTableRow, i % 2 === 0 && styles.csvTableRowAlt]}>
                          <Text style={[styles.csvTableCell, { flex: 2 }]}>{m.label}</Text>
                          <Text style={[styles.csvTableCellValue, { flex: 1.5, textAlign: 'right' }]}>{m.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.previewReportHeader}>
                    <View style={styles.previewBrandRow}>
                      <View style={styles.previewLogo}>
                        <Text style={styles.previewLogoText}>{config.businessInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewBrandName}>{config.businessName}</Text>
                        <Text style={styles.previewBrandSub}>{config.reportTitle}</Text>
                      </View>
                    </View>
                    <View style={styles.previewPeriodBadge}>
                      <Ionicons name="calendar-outline" size={14} color="#64748B" />
                      <Text style={styles.previewPeriodText}>{config.dateRange}</Text>
                    </View>
                  </View>

                  <View style={styles.previewMetrics}>
                    {config.metrics.slice(0, 3).map((m, i) => (
                      <View key={i} style={styles.previewMetricCard}>
                        <View style={[styles.previewMetricIcon, { backgroundColor: m.color === 'success' ? COLORS.successLight : m.color === 'warning' ? COLORS.warningLight : COLORS.lightGray }]}>
                          <Ionicons name={(m.icon as any) || 'stats-chart-outline'} size={16} color={m.color === 'success' ? COLORS.success : m.color === 'warning' ? COLORS.warning : COLORS.dark} />
                        </View>
                        <Text style={[styles.previewMetricValue, { color: m.color === 'success' ? COLORS.success : m.color === 'warning' ? COLORS.warning : COLORS.dark }]}>{m.value}</Text>
                        <Text style={styles.previewMetricLabel}>{m.label}</Text>
                      </View>
                    ))}
                  </View>

                  {(pdfFormat === 'graphical' || pdfFormat === 'both') && config.progressData && (
                    <View style={styles.previewTableSection}>
                      <Text style={styles.previewSectionTitle}>📊 {config.progressTitle || 'Performance'}</Text>
                      {config.progressData.slice(0, 4).map((d, i) => {
                        const total = config.progressData!.reduce((sum, x) => sum + x.value, 0);
                        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                        return (
                          <View key={i} style={{ marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{d.label}</Text>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: '#1E293B' }}>{pct}%</Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 }}>
                              <View style={{ width: `${pct}%`, height: 6, backgroundColor: d.color, borderRadius: 3 }} />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {(pdfFormat === 'tabular' || pdfFormat === 'both') && config.tables && config.tables[0] && (
                    <View style={styles.previewTableSection}>
                      <Text style={styles.previewSectionTitle}>📋 {config.tables[0].title}</Text>
                      <View style={styles.previewTable}>
                        <View style={styles.previewTableHeader}>
                          {config.tables[0].columns.map((col, i) => (
                            <Text key={i} style={[styles.previewTableHeaderText, { flex: col.flex || 1, textAlign: col.align || 'left' }]}>{col.label}</Text>
                          ))}
                        </View>
                        {config.tables[0].rows.slice(0, 5).map((row, i) => (
                          <View key={i} style={[styles.previewTableRow, i % 2 === 0 && styles.previewTableRowAlt]}>
                            {config.tables![0].columns.map((col, j) => {
                              const val = row[col.key];
                              const formatted = col.format ? col.format(val) : val;
                              return (
                                <Text key={j} style={[styles.previewTableCell, { flex: col.flex || 1, textAlign: col.align || 'left' }]} numberOfLines={1}>{formatted}</Text>
                              );
                            })}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Report Style Selector */}
            <View style={styles.performanceSection}>
              <Text style={styles.reportStyleLabel}>Report Style</Text>
              <View style={styles.formatOptions}>
                <TouchableOpacity 
                  style={[styles.formatOption, pdfFormat === 'graphical' && styles.formatOptionActive]}
                  onPress={() => setPdfFormat('graphical')}
                >
                  <Ionicons name="pie-chart" size={18} color={pdfFormat === 'graphical' ? COLORS.white : primaryColor} />
                  <Text style={[styles.formatOptionText, pdfFormat === 'graphical' && styles.formatOptionTextActive]}>Graphical</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.formatOption, pdfFormat === 'tabular' && styles.formatOptionActive]}
                  onPress={() => setPdfFormat('tabular')}
                >
                  <Ionicons name="list" size={18} color={pdfFormat === 'tabular' ? COLORS.white : primaryColor} />
                  <Text style={[styles.formatOptionText, pdfFormat === 'tabular' && styles.formatOptionTextActive]}>Tabular</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.formatOption, pdfFormat === 'both' && styles.formatOptionActive]}
                  onPress={() => setPdfFormat('both')}
                >
                  <Ionicons name="grid" size={18} color={pdfFormat === 'both' ? COLORS.white : primaryColor} />
                  <Text style={[styles.formatOptionText, pdfFormat === 'both' && styles.formatOptionTextActive]}>Both</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Export Buttons */}
            <View style={styles.exportButtonsRow}>
              <TouchableOpacity 
                style={[styles.exportBtn, styles.exportBtnPdf]} 
                onPress={() => handleExport('pdf')}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="document" size={18} color={COLORS.white} />
                    <Text style={styles.exportBtnText}>Export PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.exportBtn, styles.exportBtnExcel]} 
                onPress={() => handleExport('excel')}
                disabled={exporting}
              >
                <Ionicons name="download-outline" size={18} color={COLORS.white} />
                <Text style={styles.exportBtnText}>Export Excel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Toast */}
      {showSuccess && (
        <View style={styles.successToast}>
          <View style={styles.successToastContent}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.successToastText}>
              {exportedFormat === 'pdf' ? 'PDF' : 'Excel'} exported successfully!
            </Text>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportModalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  exportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exportModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  exportModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  exportModalSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  exportModalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewToggleRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: '#FAFBFC',
  },
  previewToggleBtnBase: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewToggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  previewToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  previewToggleTextActive: {
    color: COLORS.white,
  },
  csvPreviewContainer: {
    backgroundColor: COLORS.white,
    padding: 12,
  },
  csvPreviewHeader: {
    backgroundColor: '#334155',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  csvPreviewLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  csvPreviewLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  csvPreviewLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  csvPreviewBusinessName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  csvPreviewReportType: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  csvPreviewDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  csvPreviewDateText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  csvTableSection: {
    marginBottom: 16,
  },
  csvTableTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  csvTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  csvTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  csvTableHeaderText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  csvTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  csvTableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  csvTableCell: {
    fontSize: 10,
    color: '#475569',
  },
  csvTableCellValue: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.dark,
  },
  previewReportHeader: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  previewBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  previewLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLogoText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  previewBrandName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  previewBrandSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  previewPeriodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  previewPeriodText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  previewMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  previewMetricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  previewMetricLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 2,
  },
  previewTableSection: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  previewSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  previewTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  previewTableHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  previewTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  previewTableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  previewTableCell: {
    fontSize: 11,
    color: '#475569',
  },
  performanceSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  reportStyleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 10,
  },
  formatOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  formatOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formatOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  formatOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  formatOptionTextActive: {
    color: COLORS.white,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 0,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exportBtnPdf: {
    backgroundColor: COLORS.primary,
  },
  exportBtnExcel: {
    backgroundColor: COLORS.success,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  successToast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  successToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  successToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
});

export default ExportReportModal;
