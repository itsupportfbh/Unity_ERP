// src/app/Urls/DebitNoteApiUrls.ts
export class DebitNoteApiUrls {
  public static readonly CreateDebitNote     = "/SupplierDebitNote/Create";
  public static readonly GetAllDebitNote    = "/SupplierDebitNote/GetAll";
  public static readonly GetDebitNoteById   = "/SupplierDebitNote/GetById/";       // + id
  public static readonly UpdateDebitNote    = "/SupplierDebitNote/Update/";        // + id
  public static readonly DeleteDebitNote    = "/SupplierDebitNote/Delete/";        // + id

  // 🔹 NEW → matches [HttpGet("GetDebitNoteSource/{id}")]
  public static readonly GetDebitNoteSource = "/SupplierDebitNote/GetDebitNoteSource/"; // + id (PIN or source id)
    public static readonly MarkDebitNote    = '/SupplierDebitNote/MarkDebitNote/'; 
    public static readonly getSupplierAdvancesBySupplier = '/finance/ap/supplier-advances/'
}
