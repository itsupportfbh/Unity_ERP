export class PurchaseAPIUrls {
  public static readonly CreatePurchaseRequest = "/PurchaseRequest/CreatePurchaseRequest";
  public static readonly GetAllPurchaseRequests = "/PurchaseRequest/GetPurchaseRequest";
  public static readonly GetPurchaseRequestById = "/PurchaseRequest/GetPurchaseRequestById/"; 
  public static readonly GetAvailablePurchaseRequests = "/PurchaseRequest/GetAvailablePurchaseRequests/"; 
  public static readonly UpdatePurchaseRequest = "/PurchaseRequest/UpdatePurchaseRequestById/";
  public static readonly DeletePurchaseRequest = "/PurchaseRequest/DeletePurchaseRequestById/";
}

export class PurchaseDraftAPIUrls {
  public static readonly CreatePurchaseRequestDraft = "/PurchaseRequestTemp/CreatePurchaseRequestTemp";
  public static readonly GetAllPurchaseRequestsDraft = "/PurchaseRequestTemp/GetPurchaseRequestTemp";
  public static readonly GetPurchaseRequestDraftById = "/PurchaseRequestTemp/GetPurchaseRequestTempById/"; 
  public static readonly UpdatePurchaseRequestDraft = "/PurchaseRequestTemp/UpdatePurchaseRequestTempById/";
  public static readonly DeletePurchaseRequestDraft = "/PurchaseRequestTemp/DeletePurchaseRequestTempById/";
  public static readonly PromotePurchaseRequestTempById="/PurchaseRequestTemp/PromotePurchaseRequestTempById/"
}
