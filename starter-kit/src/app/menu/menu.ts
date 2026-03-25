
import { CoreMenu } from '@core/types';

export const ALL_MENU: CoreMenu[] = [
  { id: 'home', title: 'Dashboard', type: 'item', icon: 'home', url: '/home' },

  // ================= MASTER =================
  {
    id: 'master',
    title: 'Master',
    type: 'collapsible',
    icon: 'settings',
    // approvalRoles: ['Admin', 'Super Admin'],
    children: [
      { id: 'approval-level', title: 'Approval Level', type: 'item', icon: 'circle', url: '/master/approval-level' },
      { id: 'bank', title: 'Bank', type: 'item', icon: 'circle', url: '/master/bank-list' },
      { id: 'bin', title: 'Bin', type: 'item', icon: 'circle', url: '/master/bin' },
      { id: 'catagory', title: 'Catagory', type: 'item', icon: 'circle', url: '/master/catagory' },
      { id: 'cities', title: 'Cities', type: 'item', icon: 'circle', url: '/master/cities' },
      { id: 'company', title: 'Company', type: 'item', icon: 'circle', url: '/master/companyList' },
      { id: 'costingmethod', title: 'Costing Method', type: 'item', icon: 'circle', url: '/master/coastingmethod' },
      { id: 'countries', title: 'Countries', type: 'item', icon: 'circle', url: '/master/countries' },
      { id: 'currency', title: 'Currency', type: 'item', icon: 'circle', url: '/master/currency' },
      { id: 'customergroups', title: 'Customer Groups', type: 'item', icon: 'circle', url: '/master/customergroups' },
      { id: 'department', title: 'Department', type: 'item', icon: 'circle', url: '/master/department' },
      { id: 'driver', title: 'Driver', type: 'item', icon: 'circle', url: '/master/driver' },
      { id: 'flagissue', title: 'FlagIssue', type: 'item', icon: 'circle', url: '/master/flagIssue' },
      { id: 'incoterms', title: 'Incoterms', type: 'item', icon: 'circle', url: '/master/incoterms' },
      { id: 'itemType', title: 'ItemType', type: 'item', icon: 'circle', url: '/master/itemType' },
      { id: 'location', title: 'Outlet', type: 'item', icon: 'circle', url: '/master/location' },
      { id: 'itemSet', title: 'Package', type: 'item', icon: 'circle', url: '/master/itemSet' },
      { id: 'paymentTerms', title: 'PaymentTerms', type: 'item', icon: 'circle', url: '/master/paymentTerms' },
      { id: 'recurring', title: 'Recurring', type: 'item', icon: 'circle', url: '/master/recurring' },
      { id: 'service', title: 'Services', type: 'item', icon: 'circle', url: '/master/service' },
      { id: 'states', title: 'States', type: 'item', icon: 'circle', url: '/master/states' },
      { id: 'stockissue', title: 'StockIssue', type: 'item', icon: 'circle', url: '/master/stockIssue' },
      { id: 'strategy', title: 'Frequency', type: 'item', icon: 'circle', url: '/master/strategy' },
      { id: 'suppliergroups', title: 'Supplier Groups', type: 'item', icon: 'circle', url: '/master/suppliergroups' },
      { id: 'taxcode', title: 'Taxcode', type: 'item', icon: 'circle', url: '/master/taxcode' },
      { id: 'uom', title: 'UOM', type: 'item', icon: 'circle', url: '/master/uom' },
      { id: 'uomconversion', title: 'UOM Conversion', type: 'item', icon: 'circle', url: '/master/uomconversion' },
      { id: 'vehicle', title: 'Vehicle', type: 'item', icon: 'circle', url: '/master/vehicle' },
      { id: 'warehouse', title: 'Warehouse', type: 'item', icon: 'circle', url: '/master/warehouse' }
    ]
  },

  // ================= BUSINESS PARTNERS =================
  {
    id: 'businesspartners',
    title: 'Business Partners',
    type: 'collapsible',
    icon: 'user',
    children: [
      {
        id: 'bp-customer',
        title: 'Customer',
        type: 'item',
        icon: 'circle',
        url: '/Businesspartners/customermaster',
        activeUrls: [
          '/Businesspartners/customermaster',
          '/Businesspartners/Create-customer-master',
          '/Businesspartners/Create-customer-master/' // safe
        ]
      },
      { id: 'bp-supplier', title: 'Supplier', type: 'item', icon: 'circle', url: '/Businesspartners/supplier' },

      { id: 'bp-customer-create', title: 'Customer Create', type: 'item', icon: 'circle', url: '/Businesspartners/Create-customer-master', hidden: true },

      { id: 'users', title: 'Users', type: 'item', icon: 'circle', url: '/admin/users' }
    ]
  },

  // ================= SALES =================
  {
    id: 'sales',
    title: 'Sales',
    type: 'collapsible',
    icon: 'shopping-cart',
    // approvalRoles: ['Super Admin'],
    children: [
      {
        id: 'qt-list',
        title: 'Quotation',
        type: 'item',
        icon: 'circle',
        url: '/Sales/Quotation-list',
        activeUrls: ['/Sales/Quotation-list', '/Sales/Quotation-create', '/Sales/Edit-quotation']
      },
      { id: 'qt-create', title: 'Quotation Create', type: 'item', icon: 'circle', url: '/Sales/Quotation-create', hidden: true },
      { id: 'qt-edit', title: 'Quotation Edit', type: 'item', icon: 'circle', url: '/Sales/Edit-quotation', hidden: true },

      {
        id: 'so-list',
        title: 'Sales Order',
        type: 'item',
        icon: 'circle',
        url: '/Sales/Sales-Order-list',
        activeUrls: ['/Sales/Sales-Order-list', '/Sales/Sales-Order-create', '/Sales/Sales-Order-edit']
      },
      { id: 'so-create', title: 'Sales Order Create', type: 'item', icon: 'circle', url: '/Sales/Sales-Order-create', hidden: true },
      { id: 'so-edit', title: 'Sales Order Edit', type: 'item', icon: 'circle', url: '/Sales/Sales-Order-edit', hidden: true },

      {
        id: 'sales-pp-list',
        title: 'Picking & Packing',
        type: 'item',
        icon: 'circle',
        url: '/Sales/Picking-packing-list',
        activeUrls: ['/Sales/Picking-packing-list', '/Sales/Picking-packing-create', '/Sales/Picking-packing-edit']
      },
      { id: 'sales-pp-create', title: 'Picking & Packing Create', type: 'item', icon: 'circle', url: '/Sales/Picking-packing-create', hidden: true },
      { id: 'sales-pp-edit', title: 'Picking & Packing Edit', type: 'item', icon: 'circle', url: '/Sales/Picking-packing-edit', hidden: true },

      {
        id: 'do-list2',
        title: 'Delivery Order',
        type: 'item',
        icon: 'circle',
        url: '/Sales/Delivery-order-list',
        activeUrls: ['/Sales/Delivery-order-list', '/Sales/Delivery-order-create', '/Sales/Delivery-order-edit']
      },
      { id: 'do-create', title: 'Delivery Order Create', type: 'item', icon: 'circle', url: '/Sales/Delivery-order-create', hidden: true },
      { id: 'do-edit', title: 'Delivery Order Edit', type: 'item', icon: 'circle', url: '/Sales/Delivery-order-edit', hidden: true },

      {
        id: 'si-list',
        title: 'Sales Invoice',
        type: 'item',
        icon: 'circle',
        url: '/Sales/Sales-Invoice-list',
        activeUrls: ['/Sales/Sales-Invoice-list', '/Sales/sales-Invoice-create', '/Sales/sales-invoice/edit']
      },
      { id: 'si-create', title: 'Sales Invoice Create', type: 'item', icon: 'circle', url: '/Sales/sales-Invoice-create', hidden: true },
      { id: 'si-edit', title: 'Sales Invoice Edit', type: 'item', icon: 'circle', url: '/Sales/sales-invoice/edit', hidden: true },

      {
        id: 'cn-list',
        title: 'Credit Note',
        type: 'item',
        icon: 'circle',
        url: '/Sales/Return-credit-list',
        activeUrls: ['/Sales/Return-credit-list', '/Sales/Return-credit-create', '/Sales/Return-credit-edit']
      },
      { id: 'cn-create', title: 'Credit Note Create', type: 'item', icon: 'circle', url: '/Sales/Return-credit-create', hidden: true },
      { id: 'cn-edit', title: 'Credit Note Edit', type: 'item', icon: 'circle', url: '/Sales/Return-credit-edit', hidden: true },

      { id: 'sales-report', title: 'Report', type: 'item', icon: 'circle', url: '/Sales/Reports-create' }
    ]
  },

  // ================= PURCHASE =================
  {
    id: 'purchase',
    title: 'Purchase',
    type: 'collapsible',
    icon: 'file',
    // approvalRoles: ['Super Admin'],
    children: [
      {
        id: 'pr-list',
        title: 'Purchase Request',
        type: 'item',
        icon: 'circle',
        url: '/purchase/list-PurchaseRequest',
        activeUrls: ['/purchase/list-PurchaseRequest', '/purchase/Create-PurchaseRequest', '/purchase/Edit-PurchaseRequest']
      },
      { id: 'pr-create', title: 'PR Create', type: 'item', icon: 'circle', url: '/purchase/Create-PurchaseRequest', hidden: true },
      { id: 'pr-edit', title: 'PR Edit', type: 'item', icon: 'circle', url: '/purchase/Edit-PurchaseRequest', hidden: true },

      {
        id: 'po-list',
        title: 'Purchase Order',
        type: 'item',
        icon: 'circle',
        url: '/purchase/list-purchaseorder',
        activeUrls: ['/purchase/list-purchaseorder', '/purchase/create-purchaseorder', '/purchase/edit-purchaseorder']
      },
      { id: 'po-create', title: 'PO Create', type: 'item', icon: 'circle', url: '/purchase/create-purchaseorder', hidden: true },
      { id: 'po-edit', title: 'PO Edit', type: 'item', icon: 'circle', url: '/purchase/edit-purchaseorder', hidden: true },

      {
        id: 'grn-list',
        title: 'Goods Receipt Note',
        type: 'item',
        icon: 'circle',
        url: '/purchase/list-Purchasegoodreceipt',
        activeUrls: ['/purchase/list-Purchasegoodreceipt', '/purchase/createpurchasegoodreceipt', '/purchase/edit-purchasegoodreceipt']
      },
      { id: 'grn-create', title: 'GRN Create', type: 'item', icon: 'circle', url: '/purchase/createpurchasegoodreceipt', hidden: true },
      { id: 'grn-edit', title: 'GRN Edit', type: 'item', icon: 'circle', url: '/purchase/edit-purchasegoodreceipt', hidden: true },

      {
        id: 'pin-list',
        title: 'Supplier Invoice',
        type: 'item',
        icon: 'circle',
        url: '/purchase/list-SupplierInvoice',
        activeUrls: ['/purchase/list-SupplierInvoice', '/purchase/Create-SupplierInvoice', '/purchase/Edit-SupplierInvoice']
      },
      { id: 'pin-create', title: 'PIN Create', type: 'item', icon: 'circle', url: '/purchase/Create-SupplierInvoice', hidden: true },
      { id: 'pin-edit', title: 'PIN Edit', type: 'item', icon: 'circle', url: '/purchase/Edit-SupplierInvoice', hidden: true },

      {
        id: 'dn-list',
        title: 'Debit Note(Purchase Return)',
        type: 'item',
        icon: 'circle',
        url: '/purchase/list-debitnote',
        activeUrls: ['/purchase/list-debitnote', '/purchase/create-debitnote', '/purchase/edit-debitnote']
      },
      { id: 'dn-create', title: 'Debit Note Create', type: 'item', icon: 'circle', url: '/purchase/create-debitnote', hidden: true },
      { id: 'dn-edit', title: 'Debit Note Edit', type: 'item', icon: 'circle', url: '/purchase/edit-debitnote', hidden: true },

      { id: 'rfq', title: 'RFQ', type: 'item', icon: 'circle', url: '/purchase/rfq' },
      { id: 'mobilereceiving', title: 'Mobile Receiving', type: 'item', icon: 'circle', url: '/purchase/mobilereceiving' }
    ]
  },

  // ================= INVENTORY =================
  {
    id: 'inventory',
    title: 'Inventory',
    type: 'collapsible',
    icon: 'file',
    // approvalRoles: ['Super Admin'],
    children: [
      {
        id: 'im-list',
        title: 'Item Master',
        type: 'item',
        icon: 'circle',
        url: '/Inventory/List-itemmaster',
        activeUrls: ['/Inventory/List-itemmaster', '/Inventory/Create-itemmaster', '/Inventory/Edit-itemmaster']
      },
      { id: 'im-create', title: 'Item Master Create', type: 'item', icon: 'circle', url: '/Inventory/Create-itemmaster', hidden: true },
      { id: 'im-edit', title: 'Item Master Edit', type: 'item', icon: 'circle', url: '/Inventory/Edit-itemmaster', hidden: true },

      {
        id: 'inv-internal',
        title: 'Internal',
        type: 'collapsible',
        icon: 'corner-down-right',
        children: [
        {
  id: 'mr-list',
  title: 'Material Request',
  type: 'item',
  icon: 'circle',   // ✅ change icon
  url: '/Inventory/list-material-requisition',
  classes: 'inv-sub3',
  activeUrls: [
    '/Inventory/list-material-requisition',
    '/Inventory/create-material-requisition',
    '/Inventory/edit-material-requisition'
  ]
},
          { id: 'mr-create', title: 'Material Request Create', type: 'item', icon: 'circle', url: '/Inventory/create-material-requisition', hidden: true },
          { id: 'mr-edit', title: 'Material Request Edit', type: 'item', icon: 'circle', url: '/Inventory/edit-material-requisition', hidden: true },

         {
  id: 'list-stock-transfer-receipt',
  title: 'Stock Transfer Request',
  type: 'item',
  icon: 'circle',   // ✅ change icon
  url: '/Inventory/list-stock-transfer-receipt',
  classes: 'inv-sub3',
  activeUrls: [
    '/Inventory/list-stock-transfer-receipt',
    '/Inventory/create-stock-transfer-request',
    '/Inventory/edit-stock-transfer-request'
  ]
},
          { id: 'strq-create', title: 'Stock Transfer Request Create', type: 'item', icon: 'circle', url: '/Inventory/create-stock-transfer-request', hidden: true },
          { id: 'strq-edit', title: 'Stock Transfer Request Edit', type: 'item', icon: 'circle', url: '/Inventory/edit-stock-transfer-request', hidden: true }
        ]
      },

      {
        id: 'stocktake-list',
        title: 'Stock Take',
        type: 'item',
        icon: 'circle',
        url: '/Inventory/list-stocktake',
        activeUrls: ['/Inventory/list-stocktake', '/Inventory/create-stocktake', '/Inventory/edit-stocktake']
      },
      { id: 'stocktake-create', title: 'Stock Take Create', type: 'item', icon: 'circle', url: '/Inventory/create-stocktake', hidden: true },
      { id: 'stocktake-edit', title: 'Stock Take Edit', type: 'item', icon: 'circle', url: '/Inventory/edit-stocktake', hidden: true },

      {
        id: 'reorder-list',
        title: 'Stock Reorder Planning',
        type: 'item',
        icon: 'circle',
        url: '/Inventory/list-stockreorderplanning',
        activeUrls: [
          '/Inventory/list-stockreorderplanning',
          '/Inventory/create-stockreorderplanning',
          '/Inventory/edit-stockreorderplanning'
        ]
      },
      { id: 'reorder-create', title: 'Stock Reorder Planning Create', type: 'item', icon: 'circle', url: '/Inventory/create-stockreorderplanning', hidden: true },
      { id: 'reorder-edit', title: 'Stock Reorder Planning Edit', type: 'item', icon: 'circle', url: '/Inventory/edit-stockreorderplanning', hidden: true },

      { id: 'stockcogs', title: 'Stock COGS', type: 'item', icon: 'circle', url: '/Inventory/stockcogs' },
      { id: 'stock-history', title: 'Stock History', type: 'item', icon: 'circle', url: '/Inventory/stock-history' }
    ]
  },

  // ================= FINANCIAL =================
  {
    id: 'financial',
    title: 'Financial',
    type: 'collapsible',
    icon: 'dollar-sign',
    // approvalRoles: ['Super Admin'],
    children: [
      { id: 'ledger', title: 'General Ledger', type: 'item', icon: 'circle', url: '/financial/ledger' },
      { id: 'coa', title: 'Chart of Account', type: 'item', icon: 'circle', url: '/financial/ChartOfAccount' },

      {
        id: 'journal',
        title: 'Journal',
        type: 'item',
        icon: 'circle',
        url: '/financial/journal',
        activeUrls: ['/financial/journal', '/financial/create-journal']
      },
      { id: 'journal-create', title: 'Journal Create', type: 'item', icon: 'circle', url: '/financial/create-journal', hidden: true },

      { id: 'ar', title: 'Accounts Receivable', type: 'item', icon: 'circle', url: '/financial/AR' },
      { id: 'ap', title: 'Accounts Payable', type: 'item', icon: 'circle', url: '/financial/AccountPayable' },

      { id: 'tax', title: 'Tax & Gst', type: 'item', icon: 'circle', url: '/financial/tax-gst' },
      { id: 'period', title: 'Period-close', type: 'item', icon: 'circle', url: '/financial/Period-close' },

      { id: 'tb', title: 'Trail Balance', type: 'item', icon: 'circle', url: '/financial/report' },
      { id: 'reports', title: 'Reports', type: 'item', icon: 'circle', url: '/financial/finance-report' },

      { id: 'aging', title: 'Aging', type: 'item', icon: 'circle', url: '/financial/aging', hidden: true },
      { id: 'daybook', title: 'Daybook', type: 'item', icon: 'circle', url: '/financial/daybook', hidden: true },
      { id: 'pl', title: 'Profit & Loss', type: 'item', icon: 'circle', url: '/financial/profitloss', hidden: true },
      { id: 'bs', title: 'Balance Sheet', type: 'item', icon: 'circle', url: '/financial/balance-sheet', hidden: true }
    ]
  },

  // ================= RECIPE =================
  {
    id: 'recipe',
    title: 'Recipe',
    type: 'collapsible',
    icon: 'shopping-cart',
    // approvalRoles: ['Super Admin'],
    children: [
      {
        id: 'recipe-list',
        title: 'Recipe Master',
        type: 'item',
        icon: 'circle',
        url: '/Recipe/recipelist',
        activeUrls: ['/Recipe/recipelist', '/Recipe/recipecreate', '/Recipe/recipeedit']
      },
      { id: 'recipe-create', title: 'Recipe Create', type: 'item', icon: 'circle', url: '/Recipe/recipecreate', hidden: true },
      { id: 'recipe-edit', title: 'Recipe Edit', type: 'item', icon: 'circle', url: '/Recipe/recipeedit', hidden: true },

      {
        id: 'pp-list',
        title: 'Production Planning',
        type: 'item',
        icon: 'circle',
        url: '/Recipe/productionplanninglist',
        activeUrls: ['/Recipe/productionplanninglist', '/Recipe/productionplanningcreate', '/Recipe/productionplanningedit']
      },
      { id: 'pp-create', title: 'Production Planning Create', type: 'item', icon: 'circle', url: '/Recipe/productionplanningcreate', hidden: true },
      { id: 'pp-edit', title: 'Production Planning Edit', type: 'item', icon: 'circle', url: '/Recipe/productionplanningedit', hidden: true },

      {
        id: 'bp-list',
        title: 'Batch Production',
        type: 'item',
        icon: 'circle',
        url: '/Recipe/batchproductionlist',
        activeUrls: ['/Recipe/batchproductionlist', '/Recipe/batchproductioncreate', '/Recipe/batchproductionedit']
      },
      { id: 'bp-create', title: 'Batch Production Create', type: 'item', icon: 'circle', url: '/Recipe/batchproductioncreate', hidden: true },
      { id: 'bp-edit', title: 'Batch Production Edit', type: 'item', icon: 'circle', url: '/Recipe/batchproductionedit', hidden: true }
    ]
  },
{
  id: 'department-menu-access',
  title: 'Department Menu Access',
  type: 'item',
  icon: 'circle',
  url: '/department-menu-access',
  approvalRoles: ['Admin', 'Super Admin']
}
]; export const menu: CoreMenu[] = ALL_MENU;;