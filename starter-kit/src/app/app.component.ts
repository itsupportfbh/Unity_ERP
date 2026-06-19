import { Component, Inject, OnDestroy, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import * as Waves from 'node-waves';

import { CoreMenuService } from '@core/components/core-menu/core-menu.service';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';
import { CoreConfigService } from '@core/services/config.service';
import { CoreLoadingScreenService } from '@core/services/loading-screen.service';
import { CoreTranslationService } from '@core/services/translation.service';

import { menu } from 'app/menu/menu';
import { locale as menuEnglish } from 'app/menu/i18n/en';
import { locale as menuFrench } from 'app/menu/i18n/fr';
import { locale as menuGerman } from 'app/menu/i18n/de';
import { locale as menuPortuguese } from 'app/menu/i18n/pt';
import { LanguageAdminService } from 'app/main/language-admin/language-admin.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  coreConfig: any;
  menu: any;
  defaultLanguage: 'en'; // This language will be used as a fallback when a translation isn't found in the current language
  appLanguage: 'en'; // Set application default language i.e fr

  // Private
  private _unsubscribeAll: Subject<any>;
  private _autoTranslateObserver: MutationObserver;
  private _autoTranslateTimer: any;
  private _originalTextNodes = new WeakMap<Node, string>();
  private _originalAttrs = new WeakMap<Element, Record<string, string>>();

  /**
   * Constructor
   *
   * @param {DOCUMENT} document
   * @param {Title} _title
   * @param {Renderer2} _renderer
   * @param {ElementRef} _elementRef
   * @param {CoreConfigService} _coreConfigService
   * @param {CoreSidebarService} _coreSidebarService
   * @param {CoreLoadingScreenService} _coreLoadingScreenService
   * @param {CoreMenuService} _coreMenuService
   * @param {CoreTranslationService} _coreTranslationService
   * @param {TranslateService} _translateService
   */
  constructor(
    @Inject(DOCUMENT) private document: any,
    private _title: Title,
    private _renderer: Renderer2,
    private _elementRef: ElementRef,
    public _coreConfigService: CoreConfigService,
    private _coreSidebarService: CoreSidebarService,
    private _coreLoadingScreenService: CoreLoadingScreenService,
    private _coreMenuService: CoreMenuService,
    private _coreTranslationService: CoreTranslationService,
    private _translateService: TranslateService,
    private _languageAdminService: LanguageAdminService
  ) {
    // Get the application main menu
    this.menu = menu;

    // Register the menu to the menu service
    this._coreMenuService.register('main', this.menu);

    // Set the main menu as our current menu
    this._coreMenuService.setCurrentMenu('main');

    // Add languages to the translation service
    this._translateService.addLangs(['en', 'zh', 'ms', 'ta']);

    // This language will be used as a fallback when a translation isn't found in the current language
    this._translateService.setDefaultLang('en');

    // Set the translations for the menu
    this._coreTranslationService.translate(menuEnglish, menuFrench, menuGerman, menuPortuguese);
    this.setBuiltInErpTranslations();

    // Set the private defaults
    this._unsubscribeAll = new Subject();
  }

  // Lifecycle hooks
  // -----------------------------------------------------------------------------------------------------

  /**
   * On init
   */
  ngOnInit(): void {
    // Init wave effect (Ripple effect)
    Waves.init();

    // Subscribe to config changes
    this._coreConfigService.config.pipe(takeUntil(this._unsubscribeAll)).subscribe(config => {
      this.coreConfig = config;

      // Set application default language.

      // Change application language? Read the ngxTranslate Fix

      // ? Use app-config.ts file to set default language
      const appLanguage = this.coreConfig.app.appLanguage || 'en';
      this.loadRuntimeTranslations(appLanguage);

      // ? OR
      // ? User the current browser lang if available, if undefined use 'en'
      // const browserLang = this._translateService.getBrowserLang();
      // this._translateService.use(browserLang.match(/en|fr|de|pt/) ? browserLang : 'en');

      /**
       * ! Fix : ngxTranslate
       * ----------------------------------------------------------------------------------------------------
       */

      /**
       *
       * Using different language than the default ('en') one i.e French?
       * In this case, you may find the issue where application is not properly translated when your app is initialized.
       *
       * It's due to ngxTranslate module and below is a fix for that.
       * Eventually we will move to the multi language implementation over to the Angular's core language service.
       *
       **/

      // Set the default language to 'en' and then back to 'fr'.

      setTimeout(() => {
        this._translateService.setDefaultLang('en');
        this._translateService.setDefaultLang(appLanguage);
      });

      /**
       * !Fix: ngxTranslate
       * ----------------------------------------------------------------------------------------------------
       */

      // Layout
      //--------

      // Remove default classes first
      this._elementRef.nativeElement.classList.remove(
        'vertical-layout',
        'vertical-menu-modern',
        'horizontal-layout',
        'horizontal-menu'
      );
      // Add class based on config options
      if (this.coreConfig.layout.type === 'vertical') {
        this._elementRef.nativeElement.classList.add('vertical-layout', 'vertical-menu-modern');
      } else if (this.coreConfig.layout.type === 'horizontal') {
        this._elementRef.nativeElement.classList.add('horizontal-layout', 'horizontal-menu');
      }

      // Navbar
      //--------

      // Remove default classes first
      this._elementRef.nativeElement.classList.remove(
        'navbar-floating',
        'navbar-static',
        'navbar-sticky',
        'navbar-hidden'
      );

      // Add class based on config options
      if (this.coreConfig.layout.navbar.type === 'navbar-static-top') {
        this._elementRef.nativeElement.classList.add('navbar-static');
      } else if (this.coreConfig.layout.navbar.type === 'fixed-top') {
        this._elementRef.nativeElement.classList.add('navbar-sticky');
      } else if (this.coreConfig.layout.navbar.type === 'floating-nav') {
        this._elementRef.nativeElement.classList.add('navbar-floating');
      } else {
        this._elementRef.nativeElement.classList.add('navbar-hidden');
      }

      // Footer
      //--------

      // Remove default classes first
      this._elementRef.nativeElement.classList.remove('footer-fixed', 'footer-static', 'footer-hidden');

      // Add class based on config options
      if (this.coreConfig.layout.footer.type === 'footer-sticky') {
        this._elementRef.nativeElement.classList.add('footer-fixed');
      } else if (this.coreConfig.layout.footer.type === 'footer-static') {
        this._elementRef.nativeElement.classList.add('footer-static');
      } else {
        this._elementRef.nativeElement.classList.add('footer-hidden');
      }

      // Blank layout
      if (
        this.coreConfig.layout.menu.hidden &&
        this.coreConfig.layout.navbar.hidden &&
        this.coreConfig.layout.footer.hidden
      ) {
        this._elementRef.nativeElement.classList.add('blank-page');
        // ! Fix: Transition issue while coming from blank page
        this._renderer.setAttribute(
          this._elementRef.nativeElement.getElementsByClassName('app-content')[0],
          'style',
          'transition:none'
        );
      } else {
        this._elementRef.nativeElement.classList.remove('blank-page');
        // ! Fix: Transition issue while coming from blank page
        setTimeout(() => {
          this._renderer.setAttribute(
            this._elementRef.nativeElement.getElementsByClassName('app-content')[0],
            'style',
            'transition:300ms ease all'
          );
        }, 0);
        // If navbar hidden
        if (this.coreConfig.layout.navbar.hidden) {
          this._elementRef.nativeElement.classList.add('navbar-hidden');
        }
        // Menu (Vertical menu hidden)
        if (this.coreConfig.layout.menu.hidden) {
          this._renderer.setAttribute(this._elementRef.nativeElement, 'data-col', '1-column');
        } else {
          this._renderer.removeAttribute(this._elementRef.nativeElement, 'data-col');
        }
        // Footer
        if (this.coreConfig.layout.footer.hidden) {
          this._elementRef.nativeElement.classList.add('footer-hidden');
        }
      }

      // Skin Class (Adding to body as it requires highest priority)
      if (this.coreConfig.layout.skin !== '' && this.coreConfig.layout.skin !== undefined) {
        this.document.body.classList.remove('default-layout', 'bordered-layout', 'dark-layout', 'semi-dark-layout');
        this.document.body.classList.add(this.coreConfig.layout.skin + '-layout');
      }
    });

    // Set the application page title
    this._title.setTitle(this.coreConfig.app.appTitle);

    this._translateService.onLangChange.pipe(takeUntil(this._unsubscribeAll)).subscribe(() => this.scheduleAutoTranslate());
    this.startAutoTranslateObserver();
    this.scheduleAutoTranslate();
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    if (this._autoTranslateObserver) {
      this._autoTranslateObserver.disconnect();
    }
    if (this._autoTranslateTimer) {
      clearTimeout(this._autoTranslateTimer);
    }

    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }

  // Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Toggle sidebar open
   *
   * @param key
   */
  toggleSidebar(key): void {
    this._coreSidebarService.getSidebarRegistry(key).toggleOpen();
  }

  private loadRuntimeTranslations(language: string): void {
    this._languageAdminService.getDictionary(language).subscribe({
      next: dictionary => {
        this._translateService.setTranslation(language, this.expandDictionary(dictionary), true);
        this._translateService.use(language);
        this.scheduleAutoTranslate();
      },
      error: () => {
        this._translateService.use(language);
        this.scheduleAutoTranslate();
      }
    });
  }

  private startAutoTranslateObserver(): void {
    if (this._autoTranslateObserver || !this.document?.body) return;

    this._autoTranslateObserver = new MutationObserver(() => this.scheduleAutoTranslate());
    this._autoTranslateObserver.observe(this.document.body, {
      childList: true,
      subtree: true
    });
  }

  private scheduleAutoTranslate(): void {
    if (this._autoTranslateTimer) {
      clearTimeout(this._autoTranslateTimer);
    }

    this._autoTranslateTimer = setTimeout(() => this.translateHardcodedText(), 0);
  }

  private translateHardcodedText(): void {
    const root = this.document?.body;
    if (!root || !this._translateService.currentLang) return;

    this.translateTextNodes(root);
    this.translateElementAttributes(root);
  }

  private translateTextNodes(root: HTMLElement): void {
    const walker = this.document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: Node) => {
        const parent = node.parentElement;
        const text = node.textContent || '';
        if (!parent || !text.trim()) return NodeFilter.FILTER_REJECT;
        if (this.shouldSkipTextAutoTranslate(parent)) return NodeFilter.FILTER_REJECT;
        if (/[\d{}]/.test(text.trim())) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes: Node[] = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(node => {
      const original = this._originalTextNodes.get(node) || (node.textContent || '').trim();
      this._originalTextNodes.set(node, original);
      const translated = this._translateService.instant(original);
      if (translated && translated !== original) {
        const current = node.textContent || '';
        if (current.trim() !== translated) {
          const leading = current.match(/^\s*/)?.[0] || '';
          const trailing = current.match(/\s*$/)?.[0] || '';
          node.textContent = `${leading}${translated}${trailing}`;
        }
      } else if (this._translateService.currentLang === 'en' && (node.textContent || '').trim() !== original) {
        node.textContent = node.textContent?.replace(node.textContent.trim(), original) || original;
      }
    });
  }

  private translateElementAttributes(root: HTMLElement): void {
    const attrs = ['placeholder', 'title', 'aria-label'];
    const elements = root.querySelectorAll(attrs.map(attr => `[${attr}]`).join(','));

    elements.forEach((element: Element) => {
      if (this.shouldSkipAttributeAutoTranslate(element)) return;

      const originals = this._originalAttrs.get(element) || {};
      attrs.forEach(attr => {
        const value = element.getAttribute(attr);
        if (!value || /[\d{}]/.test(value.trim())) return;

        const original = originals[attr] || value.trim();
        originals[attr] = original;
        const translated = this._translateService.instant(original);
        const nextValue = translated && translated !== original ? translated : original;
        if (value !== nextValue) {
          element.setAttribute(attr, nextValue);
        }
      });
      this._originalAttrs.set(element, originals);
    });
  }

  private shouldSkipTextAutoTranslate(element: Element): boolean {
    const tagName = element.tagName;
    return ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION'].includes(tagName)
      || element.closest('[data-no-auto-translate]') !== null;
  }

  private shouldSkipAttributeAutoTranslate(element: Element): boolean {
    return ['SCRIPT', 'STYLE'].includes(element.tagName)
      || element.closest('[data-no-auto-translate]') !== null;
  }

  private setBuiltInErpTranslations(): void {
    const zh = {
      'Dashboard': '仪表板',
      'Smart Search': '智能搜索',
      'WhatsApp Timeline': 'WhatsApp 时间线',
      'Template Admin': '模板管理',
      'Language Admin': '语言管理',
      'Logistics': '物流',
      'Report Builder': '报表生成器',
      'Master': '主数据',
      'Purchase': '采购',
      'Sales': '销售',
      'Inventory': '库存',
      'Financial': '财务',
      'Business Partners': '业务伙伴',
      'Recipe': '配方',
      'Purchase Request': '采购申请',
      'Purchase Order': '采购订单',
      'Goods Receipt Note': '收货单',
      'Supplier Invoice': '供应商发票',
      'RFQ': '询价',
      'Supplier Scorecard': '供应商评分卡',
      'Mobile Receiving': '移动收货',
      'Customer': '客户',
      'Supplier': '供应商',
      'Users': '用户',
      'Quotation': '报价',
      'Sales Order': '销售订单',
      'Delivery Order': '送货单',
      'Sales Invoice': '销售发票',
      'Reports': '报表',
      'Light Mode': '浅色模式',
      'Dark Mode': '深色模式',
      'Profile': '个人资料',
      'Edit password': '修改密码',
      'Logout': '退出'
    };

    const ms = {
      'Dashboard': 'Papan Pemuka',
      'Smart Search': 'Carian Pintar',
      'WhatsApp Timeline': 'Garis Masa WhatsApp',
      'Template Admin': 'Admin Templat',
      'Language Admin': 'Admin Bahasa',
      'Logistics': 'Logistik',
      'Report Builder': 'Pembina Laporan',
      'Master': 'Induk',
      'Purchase': 'Pembelian',
      'Sales': 'Jualan',
      'Inventory': 'Inventori',
      'Financial': 'Kewangan',
      'Business Partners': 'Rakan Niaga',
      'Recipe': 'Resipi',
      'Purchase Request': 'Permintaan Pembelian',
      'Purchase Order': 'Pesanan Pembelian',
      'Goods Receipt Note': 'Nota Penerimaan Barang',
      'Supplier Invoice': 'Invois Pembekal',
      'RFQ': 'RFQ',
      'Supplier Scorecard': 'Kad Skor Pembekal',
      'Mobile Receiving': 'Penerimaan Mudah Alih',
      'Customer': 'Pelanggan',
      'Supplier': 'Pembekal',
      'Users': 'Pengguna',
      'Quotation': 'Sebut Harga',
      'Sales Order': 'Pesanan Jualan',
      'Delivery Order': 'Pesanan Penghantaran',
      'Sales Invoice': 'Invois Jualan',
      'Reports': 'Laporan',
      'Light Mode': 'Mod Cerah',
      'Dark Mode': 'Mod Gelap',
      'Profile': 'Profil',
      'Edit password': 'Tukar kata laluan',
      'Logout': 'Log keluar'
    };

    const ta = {
      'Dashboard': 'டாஷ்போர்டு',
      'Smart Search': 'ஸ்மார்ட் தேடல்',
      'WhatsApp Timeline': 'WhatsApp வரலாறு',
      'Template Admin': 'டெம்ப்ளேட் நிர்வாகம்',
      'Language Admin': 'மொழி நிர்வாகம்',
      'Logistics': 'லாஜிஸ்டிக்ஸ்',
      'Report Builder': 'ரிப்போர்ட் பில்டர்',
      'Master': 'மாஸ்டர்',
      'Purchase': 'கொள்முதல்',
      'Sales': 'விற்பனை',
      'Inventory': 'இன்வென்டரி',
      'Financial': 'நிதி',
      'Business Partners': 'வணிக கூட்டாளர்கள்',
      'Recipe': 'ரெசிபி',
      'Purchase Request': 'கொள்முதல் கோரிக்கை',
      'Purchase Order': 'கொள்முதல் ஆர்டர்',
      'Goods Receipt Note': 'பொருள் பெறல் குறிப்பு',
      'Supplier Invoice': 'சப்ளையர் இன்வாய்ஸ்',
      'RFQ': 'RFQ',
      'Supplier Scorecard': 'சப்ளையர் ஸ்கோர்கார்டு',
      'Mobile Receiving': 'மொபைல் பெறல்',
      'Customer': 'வாடிக்கையாளர்',
      'Supplier': 'சப்ளையர்',
      'Users': 'பயனர்கள்',
      'Quotation': 'கோட்டேஷன்',
      'Sales Order': 'விற்பனை ஆர்டர்',
      'Delivery Order': 'டெலிவரி ஆர்டர்',
      'Sales Invoice': 'விற்பனை இன்வாய்ஸ்',
      'Reports': 'ரிப்போர்ட்கள்',
      'Light Mode': 'லைட் மோடு',
      'Dark Mode': 'டார்க் மோடு',
      'Profile': 'ப்ரொஃபைல்',
      'Edit password': 'கடவுச்சொல் மாற்று',
      'Logout': 'வெளியேறு'
    };

    Object.assign(zh, {
      'PR List': '采购申请列表',
      'Purchase Request management': '采购申请管理',
      'Alerts': '提醒',
      'Shortage Alerts': '缺货提醒',
      'Refresh': '刷新',
      'Mark all read': '全部标为已读',
      'No new alerts.': '没有新提醒。',
      'Acknowledge': '确认',
      'Add': '新增',
      'Drafts': '草稿',
      'Show': '显示',
      'entries': '条记录',
      'Search...': '搜索...',
      'PR No': '采购申请号',
      'Requester': '申请人',
      'Department': '部门',
      'Delivery Date': '交货日期',
      'Status': '状态',
      'Action': '操作',
      'Draft': '草稿',
      'Pending': '待处理',
      'Approved': '已批准',
      'Rejected': '已拒绝',
      'Unknown': '未知',
      'View Details': '查看详情',
      'Edit': '编辑',
      'Delete': '删除',
      'Disabled': '已禁用',
      'Period locked': '期间已锁定',
      'Create PR': '创建采购申请',
      'No purchase requests found.': '未找到采购申请。',
      'PR Lines': '采购申请明细',
      'Item Name': '物料名称',
      'Location': '地点',
      'Qty': '数量',
      'Close': '关闭',
      'Save': '保存',
      'Cancel': '取消',
      'Submit': '提交',
      'Update': '更新',
      'Supplier': '供应商',
      'Invoice Date': '发票日期',
      'Amount': '金额',
      'Tax': '税',
      'Lines': '明细',
      'Totals': '合计',
      'Sub-total': '小计',
      'Discount': '折扣',
      'Overseas': '海外',
      'Local': '本地',
      'Search Department...': '搜索部门...',
      'Search Item...': '搜索物料...',
      'Search UOM...': '搜索单位...',
      'Search Outlet...': '搜索门店...'
    });

    Object.assign(ms, {
      'PR List': 'Senarai PR',
      'Purchase Request management': 'Pengurusan Permintaan Pembelian',
      'Alerts': 'Amaran',
      'Shortage Alerts': 'Amaran Kekurangan',
      'Refresh': 'Segar semula',
      'Mark all read': 'Tanda semua dibaca',
      'No new alerts.': 'Tiada amaran baru.',
      'Acknowledge': 'Akui',
      'Add': 'Tambah',
      'Drafts': 'Draf',
      'Show': 'Papar',
      'entries': 'rekod',
      'Search...': 'Cari...',
      'PR No': 'No PR',
      'Requester': 'Pemohon',
      'Department': 'Jabatan',
      'Delivery Date': 'Tarikh Penghantaran',
      'Status': 'Status',
      'Action': 'Tindakan',
      'Draft': 'Draf',
      'Pending': 'Menunggu',
      'Approved': 'Diluluskan',
      'Rejected': 'Ditolak',
      'Unknown': 'Tidak diketahui',
      'View Details': 'Lihat Butiran',
      'Edit': 'Edit',
      'Delete': 'Padam',
      'Disabled': 'Dilumpuhkan',
      'Period locked': 'Tempoh dikunci',
      'Create PR': 'Cipta PR',
      'No purchase requests found.': 'Tiada permintaan pembelian ditemui.',
      'PR Lines': 'Baris PR',
      'Item Name': 'Nama Item',
      'Location': 'Lokasi',
      'Qty': 'Kuantiti',
      'Close': 'Tutup',
      'Save': 'Simpan',
      'Cancel': 'Batal',
      'Submit': 'Hantar',
      'Update': 'Kemas kini',
      'Supplier': 'Pembekal',
      'Invoice Date': 'Tarikh Invois',
      'Amount': 'Amaun',
      'Tax': 'Cukai',
      'Lines': 'Baris',
      'Totals': 'Jumlah',
      'Sub-total': 'Subjumlah',
      'Discount': 'Diskaun',
      'Overseas': 'Luar negara',
      'Local': 'Tempatan',
      'Search Department...': 'Cari jabatan...',
      'Search Item...': 'Cari item...',
      'Search UOM...': 'Cari UOM...',
      'Search Outlet...': 'Cari outlet...'
    });

    Object.assign(ta, {
      'PR List': 'PR பட்டியல்',
      'Purchase Request management': 'கொள்முதல் கோரிக்கை நிர்வாகம்',
      'Alerts': 'எச்சரிக்கைகள்',
      'Shortage Alerts': 'பற்றாக்குறை எச்சரிக்கைகள்',
      'Refresh': 'புதுப்பி',
      'Mark all read': 'அனைத்தையும் படித்ததாக குறி',
      'No new alerts.': 'புதிய எச்சரிக்கைகள் இல்லை.',
      'Acknowledge': 'ஒப்புக்கொள்',
      'Add': 'சேர்',
      'Drafts': 'வரைவுகள்',
      'Show': 'காட்டு',
      'entries': 'பதிவுகள்',
      'Search...': 'தேடு...',
      'PR No': 'PR எண்',
      'Requester': 'கோருபவர்',
      'Department': 'துறை',
      'Delivery Date': 'டெலிவரி தேதி',
      'Status': 'நிலை',
      'Action': 'செயல்',
      'Draft': 'வரைவு',
      'Pending': 'நிலுவை',
      'Approved': 'அங்கீகரிக்கப்பட்டது',
      'Rejected': 'நிராகரிக்கப்பட்டது',
      'Unknown': 'தெரியாதது',
      'View Details': 'விவரங்கள் காண்க',
      'Edit': 'திருத்து',
      'Delete': 'நீக்கு',
      'Disabled': 'முடக்கப்பட்டது',
      'Period locked': 'காலம் பூட்டப்பட்டுள்ளது',
      'Create PR': 'PR உருவாக்கு',
      'No purchase requests found.': 'கொள்முதல் கோரிக்கைகள் இல்லை.',
      'PR Lines': 'PR வரிகள்',
      'Item Name': 'பொருள் பெயர்',
      'Location': 'இடம்',
      'Qty': 'அளவு',
      'Close': 'மூடு',
      'Save': 'சேமி',
      'Cancel': 'ரத்து',
      'Submit': 'சமர்ப்பி',
      'Update': 'புதுப்பி',
      'Supplier': 'சப்ளையர்',
      'Invoice Date': 'இன்வாய்ஸ் தேதி',
      'Amount': 'தொகை',
      'Tax': 'வரி',
      'Lines': 'வரிகள்',
      'Totals': 'மொத்தங்கள்',
      'Sub-total': 'துணை மொத்தம்',
      'Discount': 'தள்ளுபடி',
      'Overseas': 'வெளிநாட்டு',
      'Local': 'உள்ளூர்',
      'Search Department...': 'துறையை தேடு...',
      'Search Item...': 'பொருளை தேடு...',
      'Search UOM...': 'UOM தேடு...',
      'Search Outlet...': 'அவுட்லெட் தேடு...'
    });

    this._translateService.setTranslation('zh', zh, true);
    this._translateService.setTranslation('ms', ms, true);
    this._translateService.setTranslation('ta', ta, true);
  }

  private expandDictionary(flat: Record<string, string>): any {
    const output = {};
    Object.keys(flat || {}).forEach(key => {
      const parts = key.split('.');
      let cursor = output;
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          cursor[part] = flat[key];
        } else {
          cursor[part] = cursor[part] || {};
          cursor = cursor[part];
        }
      });
    });
    return output;
  }
}
