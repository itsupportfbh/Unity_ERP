// src/app/main/sales/delivery-order/Urls/DeliveryOrderAPIUrls.ts
export class DeliveryOrderAPIUrls {
  public static readonly Create      = "/DeliveryOrder/Create";

  public static readonly GetAll      = "/DeliveryOrder/GetAll";
  public static readonly GetById     = "/DeliveryOrder/GetById/";   // + {id}
  public static readonly GetLines    = "/DeliveryOrder/GetLines/";  // + {id}

  public static readonly UpdateHeader= "/DeliveryOrder/Update/";    // + {id}/Header

  public static readonly AddLine     = "/DeliveryOrder/AddLine";
  public static readonly RemoveLine  = "/DeliveryOrder/RemoveLine/"; // + {lineId}

  public static readonly Submit      = "/DeliveryOrder/Submit/";    // + {id}
  public static readonly Approve     = "/DeliveryOrder/Approve/";   // + {id}
  public static readonly Reject      = "/DeliveryOrder/Reject/";    // + {id}
  public static readonly Post        = "/DeliveryOrder/Post/";      // + {id}

  public static readonly Delete      = "/DeliveryOrder/Delete/";    // + {id}
  public static readonly GetSoSnapshot= "/DeliveryOrder/SoSnapshot/"; 
}
