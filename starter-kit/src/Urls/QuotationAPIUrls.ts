// src/app/main/sales/quotation/Urls/QuotationAPIUrls.ts
export class QuotationAPIUrls {
  public static readonly CreateQuotation        = "/Quotation/Create";
  public static readonly GetAllQuotations      = "/Quotation/GetAll";
  public static readonly GetQuotationById      = "/Quotation/GetById/";       // + {id}
  public static readonly UpdateQuotationById   = "/Quotation/Update/";        // + {id}
  public static readonly DeleteQuotationById   = "/Quotation/Delete/";        // + {id}
}
