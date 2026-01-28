// src/app/Urls/SalesInvoiceAPIUrls.ts

export class SalesInvoiceAPIUrls {
  static readonly List        = '/salesinvoice/List';
  static readonly Get         = '/salesinvoice/';            // + {id}
  static readonly SourceLines = '/salesinvoice/SourceLines'; // ?sourceType=1&sourceId=#
  static readonly Create      = '/salesinvoice/Create';
  static readonly Delete      = '/salesinvoice/Delete/';     // + {id}

  // Edit endpoints
  static readonly UpdateHeader = '/salesinvoice/UpdateHeader/'; // + {id}
  static readonly AddLine      = '/salesinvoice/AddLine/';      // + {siId}
  static readonly UpdateLine   = '/salesinvoice/UpdateLine/';   // + {lineId}
  static readonly RemoveLine   = '/salesinvoice/RemoveLine/';   // + {lineId}
}
