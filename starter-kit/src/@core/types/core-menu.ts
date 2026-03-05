// prettier-ignore
export interface CoreMenuItem {
  id           : string;
  title        : string;
  url?         : string;
  type         : 'section' | 'collapsible' | 'item';

  // ✅ existing
  roles?       : Array<string>;
  translate?   : string;
  icon?        : string;
  disabled?    : boolean;
  hidden?      : boolean;
  classes?     : string;
  exactMatch?  : boolean;
  externalUrl? : boolean;
  openInNewTab?: boolean;

  // ✅ ADD THESE (your custom rules)
  approvalRoles?: string[];
  teams?: string[];

  // ✅ ADD THIS (for Add/Edit keep parent active)
  activeUrls?: string[];

  // ✅ ADD THESE (if your menu system uses flags)
  active?: boolean;
  open?: boolean;

  badge?       : {
    title?    : string;
    translate?: string;
    classes? : string;
  };

  children?: CoreMenuItem[];
}

export interface CoreMenu extends CoreMenuItem {
  children?: CoreMenuItem[];
}