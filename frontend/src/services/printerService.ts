import { Platform, Alert } from 'react-native';
import { useBusinessStore } from '../store/businessStore';

// Printer types supported
export type PrinterType = 'network' | 'bluetooth' | 'usb';

export interface PrinterConfig {
  type: PrinterType;
  name: string;
  address: string; // IP:Port for network, MAC for bluetooth, device path for USB
  paperWidth: 58 | 80; // mm
  enabled: boolean;
}

export interface ReceiptData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxId?: string;
  
  receiptNumber: string;
  date: string;
  time: string;
  cashier: string;
  
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    discount?: number;
  }[];
  
  subtotal: number;
  taxTotal: number;
  discount: number;
  grandTotal: number;
  
  paymentMethod: string;
  amountPaid: number;
  change: number;
  
  customerName?: string;
  customerPhone?: string;
  
  footer?: string;
  barcode?: string;
}

// ESC/POS Commands for thermal printers
const ESC = '\x1B';
const GS = '\x1D';

const COMMANDS = {
  // Initialize printer
  INIT: ESC + '@',
  
  // Text alignment
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  
  // Text formatting
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DOUBLE_HEIGHT_ON: ESC + '!' + '\x10',
  DOUBLE_WIDTH_ON: ESC + '!' + '\x20',
  DOUBLE_ON: ESC + '!' + '\x30',
  NORMAL: ESC + '!' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  
  // Font size
  FONT_A: ESC + 'M' + '\x00',
  FONT_B: ESC + 'M' + '\x01',
  
  // Line spacing
  LINE_SPACING_DEFAULT: ESC + '2',
  LINE_SPACING_TIGHT: ESC + '3' + '\x10',
  
  // Cut paper
  CUT_PARTIAL: GS + 'V' + '\x01',
  CUT_FULL: GS + 'V' + '\x00',
  
  // Feed
  FEED_LINE: '\n',
  FEED_PAPER: ESC + 'd' + '\x05',
  
  // Cash drawer
  OPEN_DRAWER: ESC + 'p' + '\x00' + '\x19' + '\xFA',
};

class PrinterService {
  private config: PrinterConfig | null = null;
  private socket: WebSocket | null = null;
  
  // Set printer configuration
  setConfig(config: PrinterConfig) {
    this.config = config;
  }
  
  getConfig(): PrinterConfig | null {
    return this.config;
  }
  
  // Format currency
  private formatMoney(amount: number, currency: string = 'KES'): string {
    return `${currency} ${amount.toFixed(2)}`;
  }
  
  // Pad string for alignment
  private padRight(str: string, length: number): string {
    return str.padEnd(length).substring(0, length);
  }
  
  private padLeft(str: string, length: number): string {
    return str.padStart(length).substring(0, length);
  }
  
  // Create line with left and right aligned text
  private createLine(left: string, right: string, width: number = 32): string {
    const rightLen = right.length;
    const leftLen = width - rightLen - 1;
    return this.padRight(left, leftLen) + ' ' + right;
  }
  
  // Create separator line
  private createSeparator(width: number = 32, char: string = '-'): string {
    return char.repeat(width);
  }
  
  // Generate receipt content (ESC/POS format)
  generateReceiptContent(data: ReceiptData, currency: string = 'KES'): string {
    const width = this.config?.paperWidth === 80 ? 48 : 32;
    let content = '';
    
    // Initialize printer
    content += COMMANDS.INIT;
    
    // Header - Business info
    content += COMMANDS.ALIGN_CENTER;
    content += COMMANDS.DOUBLE_ON;
    content += data.businessName + '\n';
    content += COMMANDS.NORMAL;
    
    if (data.businessAddress) {
      content += data.businessAddress + '\n';
    }
    if (data.businessPhone) {
      content += 'Tel: ' + data.businessPhone + '\n';
    }
    if (data.taxId) {
      content += 'Tax ID: ' + data.taxId + '\n';
    }
    
    content += '\n';
    content += this.createSeparator(width, '=') + '\n';
    
    // Receipt info
    content += COMMANDS.ALIGN_LEFT;
    content += this.createLine('Receipt #:', data.receiptNumber, width) + '\n';
    content += this.createLine('Date:', data.date, width) + '\n';
    content += this.createLine('Time:', data.time, width) + '\n';
    content += this.createLine('Cashier:', data.cashier, width) + '\n';
    
    if (data.customerName) {
      content += this.createLine('Customer:', data.customerName, width) + '\n';
    }
    
    content += this.createSeparator(width) + '\n';
    
    // Items header
    content += COMMANDS.BOLD_ON;
    content += this.createLine('ITEM', 'TOTAL', width) + '\n';
    content += COMMANDS.BOLD_OFF;
    content += this.createSeparator(width) + '\n';
    
    // Items
    for (const item of data.items) {
      const itemName = item.name.length > width - 12 
        ? item.name.substring(0, width - 15) + '...'
        : item.name;
      content += itemName + '\n';
      
      const qtyPrice = `  ${item.quantity} x ${this.formatMoney(item.unitPrice, currency)}`;
      const itemTotal = this.formatMoney(item.total, currency);
      content += this.createLine(qtyPrice, itemTotal, width) + '\n';
      
      if (item.discount && item.discount > 0) {
        content += this.createLine('  Discount:', '-' + this.formatMoney(item.discount, currency), width) + '\n';
      }
    }
    
    content += this.createSeparator(width) + '\n';
    
    // Totals
    content += this.createLine('Subtotal:', this.formatMoney(data.subtotal, currency), width) + '\n';
    
    if (data.taxTotal > 0) {
      content += this.createLine('Tax:', this.formatMoney(data.taxTotal, currency), width) + '\n';
    }
    
    if (data.discount > 0) {
      content += this.createLine('Discount:', '-' + this.formatMoney(data.discount, currency), width) + '\n';
    }
    
    content += this.createSeparator(width) + '\n';
    
    content += COMMANDS.DOUBLE_ON;
    content += this.createLine('TOTAL:', this.formatMoney(data.grandTotal, currency), width) + '\n';
    content += COMMANDS.NORMAL;
    
    content += this.createSeparator(width) + '\n';
    
    // Payment
    content += this.createLine('Payment:', data.paymentMethod.toUpperCase(), width) + '\n';
    content += this.createLine('Amount Paid:', this.formatMoney(data.amountPaid, currency), width) + '\n';
    
    if (data.change > 0) {
      content += COMMANDS.BOLD_ON;
      content += this.createLine('Change:', this.formatMoney(data.change, currency), width) + '\n';
      content += COMMANDS.BOLD_OFF;
    }
    
    content += '\n';
    
    // Footer
    content += COMMANDS.ALIGN_CENTER;
    if (data.footer) {
      content += data.footer + '\n';
    } else {
      content += 'Thank you for shopping with us!' + '\n';
      content += 'Please come again' + '\n';
    }
    
    content += '\n';
    content += COMMANDS.FEED_PAPER;
    content += COMMANDS.CUT_PARTIAL;
    
    return content;
  }
  
  // Print via network (TCP/IP)
  async printNetwork(content: string): Promise<boolean> {
    if (!this.config || this.config.type !== 'network') {
      throw new Error('Network printer not configured');
    }
    
    // For web platform, we need to use a print server or web socket proxy
    if (Platform.OS === 'web') {
      return this.printViaWebPreview(content);
    }
    
    // For native platforms, use TCP socket
    // This would require a native module like react-native-tcp-socket
    console.log('Native network printing not implemented yet');
    return false;
  }
  
  // Print via web - opens print preview
  private printViaWebPreview(content: string): boolean {
    // Convert ESC/POS to HTML for web printing
    const htmlContent = this.escposToHtml(content);
    
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0 auto;
              padding: 5mm;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .double { font-size: 18px; font-weight: bold; }
            .separator { border-bottom: 1px dashed #000; margin: 5px 0; }
            pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <pre>${htmlContent}</pre>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      return true;
    }
    return false;
  }
  
  // Convert ESC/POS commands to HTML (simplified)
  private escposToHtml(content: string): string {
    // Remove ESC/POS commands for HTML display
    let html = content
      .replace(/\x1B./g, '') // Remove ESC commands
      .replace(/\x1D./g, '') // Remove GS commands
      .replace(/[\x00-\x1F]/g, (char) => {
        if (char === '\n') return '\n';
        return '';
      });
    
    return html;
  }
  
  // Test printer connection
  async testConnection(): Promise<boolean> {
    if (!this.config) {
      Alert.alert('Error', 'Printer not configured');
      return false;
    }
    
    try {
      const testContent = 
        COMMANDS.INIT +
        COMMANDS.ALIGN_CENTER +
        COMMANDS.DOUBLE_ON +
        'PRINTER TEST\n' +
        COMMANDS.NORMAL +
        '\n' +
        'If you can read this,\n' +
        'printer is working!\n' +
        '\n' +
        new Date().toLocaleString() + '\n' +
        '\n' +
        COMMANDS.FEED_PAPER +
        COMMANDS.CUT_PARTIAL;
      
      if (this.config.type === 'network') {
        return await this.printNetwork(testContent);
      }
      
      // Other printer types would be handled here
      Alert.alert('Info', 'Only network printers are currently supported');
      return false;
      
    } catch (error) {
      console.error('Printer test failed:', error);
      return false;
    }
  }
  
  // Print receipt
  async printReceipt(data: ReceiptData, currency: string = 'KES'): Promise<boolean> {
    if (!this.config?.enabled) {
      console.log('Printer not enabled');
      return false;
    }
    
    try {
      const content = this.generateReceiptContent(data, currency);
      
      if (this.config.type === 'network') {
        return await this.printNetwork(content);
      }
      
      // Fallback to web preview
      return this.printViaWebPreview(content);
      
    } catch (error) {
      console.error('Print receipt failed:', error);
      Alert.alert('Print Error', 'Failed to print receipt. Please try again.');
      return false;
    }
  }
  
  // Open cash drawer
  async openCashDrawer(): Promise<boolean> {
    if (!this.config?.enabled) {
      return false;
    }
    
    try {
      const content = COMMANDS.INIT + COMMANDS.OPEN_DRAWER;
      
      if (this.config.type === 'network') {
        return await this.printNetwork(content);
      }
      
      return false;
    } catch (error) {
      console.error('Open drawer failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const printerService = new PrinterService();
export default printerService;
