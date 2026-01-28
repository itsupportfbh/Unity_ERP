// ap-api-urls.ts

export enum AccountsPayableAPIUrls {
  GetAllInvoices = 'AccountsPayable/GetAll',
  GetBySupplier  = 'AccountsPayable/GetBySupplier/',  // + {id}
  PayInvoice     = 'AccountsPayable/Pay'
}

export enum SupplierPaymentAPIUrls {
  GetAll        = 'SupplierPayment/GetAll',
  GetBySupplier = 'SupplierPayment/GetBySupplier/',   // + {id}
  Create        = 'SupplierPayment/Create'
}

export enum SupplierAPIUrls {
  GetAll = 'Suppliers/GetAll'   // adjust to your actual endpoint
}
