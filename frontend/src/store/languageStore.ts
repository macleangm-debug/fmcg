import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Available languages
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

// Common UI translations
export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Dashboard
    dashboard: 'Dashboard',
    overview: 'Overview',
    sales: 'Sales',
    orders: 'Orders',
    customers: 'Customers',
    products: 'Products',
    reports: 'Reports',
    settings: 'Settings',
    
    // Common actions
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    
    // Auth
    login: 'Sign In',
    logout: 'Sign Out',
    register: 'Sign Up',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    
    // Messages
    loading: 'Loading...',
    noData: 'No data available',
    error: 'An error occurred',
    success: 'Success!',
    
    // Sidebar sections
    menu: 'Menu',
    catalog: 'Catalog',
    insights: 'Insights',
    general: 'General',
    linkedApps: 'Linked Apps',
    availableApps: 'Available Apps',
    
    // Referral
    referAndEarn: 'Refer & Earn',
    getYourLink: 'Get Your Link',
    
    // Language
    language: 'Language',
    selectLanguage: 'Select Language',
  },
  sw: {
    // Dashboard
    dashboard: 'Dashibodi',
    overview: 'Muhtasari',
    sales: 'Mauzo',
    orders: 'Maagizo',
    customers: 'Wateja',
    products: 'Bidhaa',
    reports: 'Ripoti',
    settings: 'Mipangilio',
    
    // Common actions
    save: 'Hifadhi',
    cancel: 'Ghairi',
    delete: 'Futa',
    edit: 'Hariri',
    add: 'Ongeza',
    search: 'Tafuta',
    filter: 'Chuja',
    export: 'Hamisha',
    import: 'Ingiza',
    
    // Auth
    login: 'Ingia',
    logout: 'Toka',
    register: 'Jisajili',
    email: 'Barua pepe',
    password: 'Nenosiri',
    forgotPassword: 'Umesahau Nenosiri?',
    
    // Messages
    loading: 'Inapakia...',
    noData: 'Hakuna data',
    error: 'Hitilafu imetokea',
    success: 'Imefanikiwa!',
    
    // Sidebar sections
    menu: 'Menyu',
    catalog: 'Katalogi',
    insights: 'Maarifa',
    general: 'Jumla',
    linkedApps: 'Programu Zilizounganishwa',
    availableApps: 'Programu Zinazopatikana',
    
    // Referral
    referAndEarn: 'Alika & Pata',
    getYourLink: 'Pata Link Yako',
    
    // Language
    language: 'Lugha',
    selectLanguage: 'Chagua Lugha',
  },
  fr: {
    // Dashboard
    dashboard: 'Tableau de Bord',
    overview: 'Aperçu',
    sales: 'Ventes',
    orders: 'Commandes',
    customers: 'Clients',
    products: 'Produits',
    reports: 'Rapports',
    settings: 'Paramètres',
    
    // Common actions
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    add: 'Ajouter',
    search: 'Rechercher',
    filter: 'Filtrer',
    export: 'Exporter',
    import: 'Importer',
    
    // Auth
    login: 'Se Connecter',
    logout: 'Se Déconnecter',
    register: "S'inscrire",
    email: 'Email',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié?',
    
    // Messages
    loading: 'Chargement...',
    noData: 'Aucune donnée disponible',
    error: 'Une erreur est survenue',
    success: 'Succès!',
    
    // Sidebar sections
    menu: 'Menu',
    catalog: 'Catalogue',
    insights: 'Analyses',
    general: 'Général',
    linkedApps: 'Applications Liées',
    availableApps: 'Applications Disponibles',
    
    // Referral
    referAndEarn: 'Parrainez & Gagnez',
    getYourLink: 'Obtenir Votre Lien',
    
    // Language
    language: 'Langue',
    selectLanguage: 'Sélectionner la Langue',
  },
  ar: {
    // Dashboard
    dashboard: 'لوحة التحكم',
    overview: 'نظرة عامة',
    sales: 'المبيعات',
    orders: 'الطلبات',
    customers: 'العملاء',
    products: 'المنتجات',
    reports: 'التقارير',
    settings: 'الإعدادات',
    
    // Common actions
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    import: 'استيراد',
    
    // Auth
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    register: 'إنشاء حساب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    
    // Messages
    loading: 'جاري التحميل...',
    noData: 'لا توجد بيانات',
    error: 'حدث خطأ',
    success: 'تم بنجاح!',
    
    // Sidebar sections
    menu: 'القائمة',
    catalog: 'الكتالوج',
    insights: 'الرؤى',
    general: 'عام',
    linkedApps: 'التطبيقات المرتبطة',
    availableApps: 'التطبيقات المتاحة',
    
    // Referral
    referAndEarn: 'أحِل واربح',
    getYourLink: 'احصل على رابطك',
    
    // Language
    language: 'اللغة',
    selectLanguage: 'اختر اللغة',
  },
  pt: {
    // Dashboard
    dashboard: 'Painel',
    overview: 'Visão Geral',
    sales: 'Vendas',
    orders: 'Pedidos',
    customers: 'Clientes',
    products: 'Produtos',
    reports: 'Relatórios',
    settings: 'Configurações',
    
    // Common actions
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    edit: 'Editar',
    add: 'Adicionar',
    search: 'Pesquisar',
    filter: 'Filtrar',
    export: 'Exportar',
    import: 'Importar',
    
    // Auth
    login: 'Entrar',
    logout: 'Sair',
    register: 'Cadastrar',
    email: 'Email',
    password: 'Senha',
    forgotPassword: 'Esqueceu a Senha?',
    
    // Messages
    loading: 'Carregando...',
    noData: 'Nenhum dado disponível',
    error: 'Ocorreu um erro',
    success: 'Sucesso!',
    
    // Sidebar sections
    menu: 'Menu',
    catalog: 'Catálogo',
    insights: 'Insights',
    general: 'Geral',
    linkedApps: 'Apps Conectados',
    availableApps: 'Apps Disponíveis',
    
    // Referral
    referAndEarn: 'Indique & Ganhe',
    getYourLink: 'Obter Seu Link',
    
    // Language
    language: 'Idioma',
    selectLanguage: 'Selecionar Idioma',
  },
};

interface LanguageState {
  currentLanguage: LanguageCode;
  isRTL: boolean;
  setLanguage: (code: LanguageCode) => void;
  t: (key: string) => string;
  detectBrowserLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      currentLanguage: 'en',
      isRTL: false,

      setLanguage: (code: LanguageCode) => {
        const language = LANGUAGES.find((l) => l.code === code);
        set({
          currentLanguage: code,
          isRTL: language?.rtl || false,
        });
      },

      t: (key: string): string => {
        const { currentLanguage } = get();
        const translations = TRANSLATIONS[currentLanguage];
        return translations[key] || TRANSLATIONS.en[key] || key;
      },

      detectBrowserLanguage: () => {
        if (typeof navigator !== 'undefined' && navigator.language) {
          const browserLang = navigator.language.split('-')[0];
          const supported = LANGUAGES.find((l) => l.code === browserLang);
          if (supported) {
            get().setLanguage(supported.code);
          }
        }
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentLanguage: state.currentLanguage,
        isRTL: state.isRTL,
      }),
    }
  )
);

// Hook to get translated text
export const useTranslation = () => {
  const { t, currentLanguage, isRTL } = useLanguageStore();
  return { t, currentLanguage, isRTL };
};

// Get language info
export const getLanguageInfo = (code: LanguageCode) => {
  return LANGUAGES.find((l) => l.code === code);
};
