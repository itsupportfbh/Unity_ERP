import { CoreMenu } from '@core/types';

export const menu: any[] = [
  // Dashboard (all)
  {
    id: 'home',
    title: 'Dashboard',
    translate: 'MENU.HOME',
    type: 'item',
    icon: 'home',
    url: '/home'
  },

  // Master (Admin / Super Admin)
  {
    id: 'master',
    title: 'Master',
    type: 'collapsible',
    icon: 'settings',
    approvalRoles: ['Admin', 'Super Admin'],
    children: [
      { id: 'approval-level', title: 'Approval Level', type: 'item', icon: 'circle', url: '/master/approval-level', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'countries', title: 'Countries', type: 'item', icon: 'circle', url: '/master/countries', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'states', title: 'States', type: 'item', icon: 'circle', url: '/master/states', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'cities', title: 'Cities', type: 'item', icon: 'circle', url: '/master/cities', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'location', title: 'Location', type: 'item', icon: 'circle', url: '/master/location', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'currency', title: 'Currency', type: 'item', icon: 'circle', url: '/master/currency', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'uom', title: 'UOM', type: 'item', icon: 'circle', url: '/master/uom', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'incoterms', title: 'Incoterms', type: 'item', icon: 'circle', url: '/master/incoterms', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'flagissue', title: 'FlagIssue', type: 'item', icon: 'circle', url: '/master/flagIssue', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'paymentTerms', title: 'PaymentTerms', type: 'item', icon: 'circle', url: '/master/paymentTerms', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'service', title: 'Services', type: 'item', icon: 'circle', url: '/master/service', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'customergroups', title: 'Customer Groups', type: 'item', icon: 'circle', url: '/master/customergroups', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'suppliergroups', title: 'Supplier Groups', type: 'item', icon: 'circle', url: '/master/suppliergroups', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'department', title: 'Department', type: 'item', icon: 'circle', url: '/master/department', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'items', title: 'Item', type: 'item', icon: 'circle', url: '/master/items', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'warehouse', title: 'Warehouse', type: 'item', icon: 'circle', url: '/master/warehouse', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'recurring', title: 'Recurring', type: 'item', icon: 'circle', url: '/master/recurring', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'taxcode', title: 'Taxcode', type: 'item', icon: 'circle', url: '/master/taxcode', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'catagory', title: 'Catagory', type: 'item', icon: 'circle', url: '/master/catagory', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'costingmethod', title: 'Costing Method', type: 'item', icon: 'circle', url: '/master/coastingmethod', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'strategy', title: 'Frequency', type: 'item', icon: 'circle', url: '/master/strategy', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'stockissue', title: 'StockIssue', type: 'item', icon: 'circle', url: '/master/stockIssue', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'bin', title: 'Bin', type: 'item', icon: 'circle', url: '/master/bin', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'driver', title: 'Driver', type: 'item', icon: 'circle', url: '/master/driver', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'vehicle', title: 'Vehicle', type: 'item', icon: 'circle', url: '/master/vehicle', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'bank', title: 'Bank', type: 'item', icon: 'circle', url: '/master/bank-list', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'itemType', title: 'ItemType', type: 'item', icon: 'circle', url: '/master/itemType', approvalRoles: ['Admin', 'Super Admin'] },
      { id: 'itemSet', title: 'ItemSet', type: 'item', icon: 'circle', url: '/master/itemSet', approvalRoles: ['Admin', 'Super Admin'] },

    ]
  },

  // Purchase (Purchase Team OR Super Admin)
  {
    id: 'purchase',
    title: 'Purchase',
    translate: 'MENU.PURCHASE.TITLE',
    type: 'collapsible',
    icon: 'file',
    teams: ['Purchase Team'],
    approvalRoles: ['Super Admin'],
    children: [
      { id: 'PR', title: 'Purchase Request', type: 'item', icon: 'circle', url: '/purchase/list-PurchaseRequest', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'rfq', title: 'RFQ', type: 'item', icon: 'circle', url: '/purchase/rfq', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'PO', title: 'Purchase Order', type: 'item', icon: 'circle', url: '/purchase/list-purchaseorder', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'mobilereceiving', title: 'Mobile Receiving', type: 'item', icon: 'circle', url: '/purchase/mobilereceiving', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'GRN', title: 'Goods Receipt Note', type: 'item', icon: 'circle', url: '/purchase/list-Purchasegoodreceipt', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'SupplierInvoice', title: 'Supplier Invoice', type: 'item', icon: 'circle', url: '/purchase/list-SupplierInvoice', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'DebitNote', title: 'Debit Note', type: 'item', icon: 'circle', url: '/purchase/list-debitnote', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] }
    ]
  },

  // Inventory (Purchase Team OR Super Admin)
  {
    id: 'inventory',
    title: 'Inventory',
    translate: 'MENU.INVENTORY.TITLE',
    type: 'collapsible',
    icon: 'file',
    teams: ['Purchase Team'],
    approvalRoles: ['Super Admin'],
    children: [
      { id: 'ItemMaster', title: 'Item Master', type: 'item', icon: 'circle', url: '/Inventory/List-itemmaster', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
              { id: 'material-requisition', title: 'Material-Requisition', type: 'item', icon: 'circle', url: '/Inventory/list-material-requisition', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'StackOverview', title: 'Stock-Overview', type: 'item', icon: 'circle', url: '/Inventory/list-stackoverview', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'StackTransfer', title: 'Stock-Transfer', type: 'item', icon: 'circle', url: '/Inventory/list-stocktransfer', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'StockTake', title: 'Stock-Take', type: 'item', icon: 'circle', url: '/Inventory/list-stocktake', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] },
      { id: 'StockReorderPlanning', title: 'Stock-Reorder-Planning', type: 'item', icon: 'circle', url: '/Inventory/list-stockreorderplanning', teams: ['Purchase Team'], approvalRoles: ['Super Admin'] }
    ]
  },

  // Sales (Sales Team OR Super Admin)
  {
    id: 'sales',
    title: 'Sales',
    translate: 'MENU.SALES.TITLE',
    type: 'collapsible',
    icon: 'shopping-cart',
    teams: ['Sales Team'],
    approvalRoles: ['Super Admin'],
    children: [
      { id: 'Quotation', title: 'Quotation', type: 'item', icon: 'circle', url: '/Sales/Quotation-list', teams: ['Sales Team'], approvalRoles: ['Super Admin'] },
      { id: 'SalesOrder', title: 'Sales Order', type: 'item', icon: 'circle', url: '/Sales/Sales-Order-list', teams: ['Sales Team'], approvalRoles: ['Super Admin'] },
      { id: 'Picking', title: 'Picking & Packing', type: 'item', icon: 'circle', url: '/Sales/Picking-packing-list', teams: ['Sales Team'], approvalRoles: ['Super Admin'] },
      { id: 'DeliveryOrder', title: 'Delivery Order', type: 'item', icon: 'circle', url: '/Sales/Delivery-order-list', teams: ['Sales Team'], approvalRoles: ['Super Admin'] },
      { id: 'SalesInvoice', title: 'Sales Invoice', type: 'item', icon: 'circle', url: '/Sales/Sales-Invoice-list', teams: ['Sales Team'], approvalRoles: ['Super Admin'] },
      { id: 'ReturnCredit', title: 'Credit Note', type: 'item', icon: 'circle', url: '/Sales/Return-credit-list', teams: ['Sales Team'], approvalRoles: ['Super Admin'] },
      { id: 'Report', title: 'Report', type: 'item', icon: 'circle', url: '/Sales/Reports-create', teams: ['Sales Team'], approvalRoles: ['Super Admin'] }
    ]
  },
    {
    id: 'recipe',
    title: 'Recipe',
    translate: 'MENU.RECIPE.TITLE',
    type: 'collapsible',
    icon: 'shopping-cart',
  //  teams: ['Sales Team'],
   // approvalRoles: ['Super Admin'],
    children: [
      { id: 'recipe', title: 'Recipe Master', type: 'item', icon: 'circle', url: '/Recipe/recipelist',  approvalRoles: ['Super Admin'] },
       { id: 'recipe', title: 'Production Planning', type: 'item', icon: 'circle', url: '/Recipe/productionplanninglist',  approvalRoles: ['Super Admin'] },
     
    ]
  },

  // Financial (Finance Team OR Super Admin)
  {
    id: 'financial',
    title: 'Financial',
    translate: 'MENU.FINANCIAL.TITLE',
    type: 'collapsible',
    icon: 'dollar-sign',
    teams: ['Finance Team'],
    approvalRoles: ['Super Admin'],
    children: [
      { id: 'ledger', title: 'General Ledger', type: 'item', icon: 'circle', url: '/financial/ledger', teams: ['Finance Team'], approvalRoles: ['Super Admin'] },
      { id: 'ChartofAccount', title: 'Chart of Account', type: 'item', icon: 'circle', url: '/financial/ChartOfAccount', teams: ['Finance Team'], approvalRoles: ['Super Admin'] },
      { id: 'journal', title: 'Journal', type: 'item', icon: 'circle', url: '/financial/journal', teams: ['Finance Team'], approvalRoles: ['Super Admin'] },
      { id: 'AR', title: 'Accounts Receivable', type: 'item', icon: 'circle', url: '/financial/AR', teams: ['Finance Team'], approvalRoles: ['Super Admin'] },
      { id: 'AccountPayable', title: 'Accounts Payable', type: 'item', icon: 'circle', url: '/financial/AccountPayable', teams: ['Finance Team'], approvalRoles: ['Super Admin'] },
      { id: 'tax-gst', title: 'Tax & Gst', type: 'item', icon: 'circle', url: '/financial/tax-gst', teams: ['Finance Team'], approvalRoles: ['Super Admin'] },
      { id: 'Period-close', title: 'Period-close', type: 'item', icon: 'circle', url: '/financial/Period-close', teams: ['Finance Team'], approvalRoles: ['Super Admin'] },
      { id: 'invoice-email', title: 'Invoice Email', type: 'item', icon: 'circle', url: '/financial/Invoice-email', teams: ['Finance Team'], approvalRoles: ['Super Admin'] },
      { id: 'report', title: 'Trail Balance', type: 'item', icon: 'circle', url: '/financial/report', teams: ['Finance Team'], approvalRoles: ['Super Admin'] },
      { id: 'finance-report', title: 'Reports', type: 'item', icon: 'circle', url: '/financial/finance-report', teams: ['Finance Team'], approvalRoles: ['Super Admin'] }
    ]
  },

  // Business Partners (Admin / Super Admin)
  {
  id: 'businesspartners',
  title: 'Business Partners',
  translate: 'MENU.BUSINESSPARTNERS.TITLE',
  type: 'collapsible',
  icon: 'user',

  // show parent if any child is allowed (your filter will remove empty collapsible anyway)
  teams: ['Purchase Team', 'Sales Team'],
  approvalRoles: ['Admin', 'Super Admin'],

  children: [
    // ✅ Supplier => Purchase Team (and Super Admin can see)
    {
      id: 'supplier',
      title: 'Supplier',
      type: 'item',
      icon: 'circle',
      url: '/Businesspartners/supplier',
      teams: ['Purchase Team'],
      approvalRoles: ['Super Admin']
    },

    // ✅ Customer => Sales Team (and Super Admin can see)
    {
      id: 'customermaster',
      title: 'Customer',
      type: 'item',
      icon: 'circle',
      url: '/Businesspartners/customermaster',
      teams: ['Sales Team'],
      approvalRoles: ['Super Admin']
    },

    // ✅ Users => only Super Admin (change if you want Admin also)
    {
      id: 'users',
      title: 'Users',
      type: 'item',
      icon: 'circle',
      url: '/admin/users',
      approvalRoles: ['Super Admin']
    }
  ]
}

];
