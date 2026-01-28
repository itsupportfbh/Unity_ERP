import {
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import Swal from 'sweetalert2';

import { ChartofaccountService } from '../chartofaccount.service';
import { CoreSidebarService } from '@core/components/core-sidebar/core-sidebar.service';

/** Raw shape from API */
interface CoaFlat {
  id: number;
  headCode: number;
  headName: string;
  openingBalance: number;
  balance: number;
  parentHead?: number | null;
  isActive?: boolean;
}

/** Tree node used in UI */
interface CoaNode extends CoaFlat {
  level: number;           // 0 = root, 1 = child, 2 = grand-child...
  children: CoaNode[];
  hasChildren: boolean;
  expanded: boolean;
}

@Component({
  selector: 'app-chartofaccount',
  templateUrl: './chartofaccount.component.html',
  styleUrls: ['./chartofaccount.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ChartofaccountComponent implements OnInit {

  @ViewChild('table') table: any;

  headervalue = 'Chart of Accounts';
  selectedOption = 10;
  searchValue = '';
  isLoading = false;

  selectedCoaId: number | null = null;

  /** Root nodes (Asset, Liabilities, Equity, Income, Expense) */
  roots: CoaNode[] = [];

  /** All nodes flat – handy for search */
  allNodes: CoaNode[] = [];

  /** Bound to ngx-datatable */
  displayRows: CoaNode[] = [];

  constructor(
    private service: ChartofaccountService,
    private _coreSidebarService: CoreSidebarService
  ) { }

  ngOnInit(): void {
    this.load();
  }

  // ============================================================
  // LOAD + BUILD TREE
  // ============================================================
 load(): void {
  this.isLoading = true;

  this.service.getAllChartOfAccount().subscribe({
    next: (res: any) => {
      const flat: CoaFlat[] = (res.data || []).map((x: any) => ({
        id: Number(x.id),
        headCode: Number(x.headCode ?? 0),
        headName: String(x.headName ?? ''),
        openingBalance: Number(x.openingBalance ?? 0),
        balance: Number(x.balance ?? 0),
        // NOTE: this is *parent head code* from DB
        parentHead: x.parentHead == null ? 0 : Number(x.parentHead),
        isActive: x.isActive ?? true
      }));

      const flatActive = flat.filter(r => !!r.isActive);

      // ===== 1) build node maps =====
      const byId = new Map<number, CoaNode>();
      const byCode = new Map<number, CoaNode>();   // key by headCode

      flatActive.forEach(f => {
        const node: CoaNode = {
          ...f,
          level: 0,
          children: [],
          hasChildren: false,
          expanded: false
        };
        byId.set(node.id, node);
        byCode.set(node.headCode, node);          // 👈 key is HeadCode
      });

      // ===== 2) wire parent / children using headCode =====
      const roots: CoaNode[] = [];

      byCode.forEach(node => {
        const pCode = Number(node.parentHead || 0); // parent HEAD CODE
        if (!pCode) {
          // ROOT (Assets, Liabilities, Equity, Income…)
          roots.push(node);
        } else {
          const parent = byCode.get(pCode);        // find by HEAD CODE
          if (parent) {
            parent.children.push(node);
            parent.hasChildren = true;
          } else {
            // parent not found → treat as root
            roots.push(node);
          }
        }
      });

      // ===== 3) assign levels from roots =====
      const setLevel = (n: CoaNode, level: number) => {
        n.level = level;
        n.children.forEach(child => setLevel(child, level + 1));
      };
      roots.forEach(r => setLevel(r, 0));

      // ===== 4) sort tree by headCode =====
      const sortRecursively = (n: CoaNode) => {
        n.children.sort((a, b) => a.headCode - b.headCode);
        n.children.forEach(sortRecursively);
      };
      roots.sort((a, b) => a.headCode - b.headCode);
      roots.forEach(sortRecursively);

      this.roots = roots;
      this.allNodes = Array.from(byId.values());

      // initial visible rows – only roots (collapsed)
      this.rebuildVisibleRows();
      this.isLoading = false;
    },
    error: (err) => {
      this.isLoading = false;
      Swal.fire({
        icon: 'error',
        title: 'Failed to load Chart of Accounts',
        text: this.errMsg(err),
        confirmButtonColor: '#d33'
      });
    }
  });
}


  // ============================================================
  // EXPAND / COLLAPSE
  // ============================================================
  toggleNode(node: CoaNode): void {
    if (!node.hasChildren) { return; }
    node.expanded = !node.expanded;
    this.rebuildVisibleRows();
  }

  /** Build displayRows from roots based on expanded flags */
  private rebuildVisibleRows(): void {
    const rows: CoaNode[] = [];

    const addNode = (n: CoaNode) => {
      rows.push(n);
      if (n.expanded) {
        n.children.forEach(addNode);
      }
    };

    this.roots.forEach(addNode);
    this.displayRows = rows;
  }

  // ============================================================
  // SEARCH
  // ============================================================
  filterUpdate(): void {
    const term = (this.searchValue || '').toLowerCase().trim();

    if (!term) {
      // clear search → show tree again
      this.rebuildVisibleRows();
      return;
    }

    const contains = (v?: string | number) =>
      (v ?? '').toString().toLowerCase().includes(term);

    // flat search result (no tree expand)
    this.displayRows = this.allNodes
      .filter(n =>
        contains(n.headCode) ||
        contains(n.headName) ||
        contains(n.openingBalance) ||
        contains(n.balance)
      )
      .sort((a, b) => a.headCode - b.headCode);
  }

  // ============================================================
  // EDIT / DELETE
  // ============================================================
  edit(id: number): void {
    this.selectedCoaId = id;
    this._coreSidebarService
      .getSidebarRegistry('app-chartofaccountcreate')
      .toggleOpen();
  }

  onChildSaved(): void {
    this.load();
    this.selectedCoaId = null;
  }

  confirmDeleteCoa(id: number): void {
    Swal.fire({
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this item?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      buttonsStyling: false,
      customClass: {
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-primary ml-2'
      }
    }).then(r => {
      if (r.isConfirmed) {
        this.deleteCoa(id);
      }
    });
  }

  private deleteCoa(id: number): void {
    this.service.deleteChartOfAccount(id).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Chart of Account deleted successfully.',
          confirmButtonColor: '#3085d6'
        });
        this.load();
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: this.errMsg(err) || 'Failed to delete Chart of Account.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private errMsg(err: any): string {
    return err?.error?.message || err?.message || 'Please try again.';
  }

  toggleSidebar(name: string): void {
    this._coreSidebarService.getSidebarRegistry(name).toggleOpen();
  }
}
