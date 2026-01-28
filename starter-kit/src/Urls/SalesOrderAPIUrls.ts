export class SalesOrderApiUrls {
  public static readonly CreateSO = "/SalesOrder/insert";
  public static readonly GetAllSO = "/SalesOrder/getAll";
  public static readonly GetSOById = "/SalesOrder/get/"; 
  public static readonly UpdateSO = "/SalesOrder/update";
  public static readonly DeleteSO = "/SalesOrder/Delete/";
   public static readonly GetByQuatitonDetails = "/SalesOrder/GetByQuatitonDetails/";
  public static readonly previewAllocation = "/SalesOrder/preview-allocation";
    public static readonly GetSOByStatus = "/SalesOrder/GetByStatus/"; 
  static ApproveSO(id: number, approvedBy = 1) {
    return `/SalesOrder/approve/${id}?approvedBy=${approvedBy}`;
  }
  static RejectSO(id: number) {
    return `/SalesOrder/reject/${id}`;
  }

    public static readonly Drafts = "/SalesOrder/drafts";
  public static readonly  GetOpenSOByCustomer = '/SalesOrder/customer-open/'
}