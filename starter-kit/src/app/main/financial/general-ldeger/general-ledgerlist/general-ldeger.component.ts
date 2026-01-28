import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { DatatableComponent } from '@swimlane/ngx-datatable';
import Swal from 'sweetalert2';
import { GeneralLedgerService } from '../general-ledger-service/general-ledger.service';

interface CoaFlat {
  id: number;
  headCode: number;
  headName: string;
  parentHead: number;

  headType: string;
  rootHeadType: string;

  openingBalance: number;
  debit: number;
  credit: number;
  balance: number;

  isControl: boolean;
  isActive?: boolean;
}

interface CoaNode extends CoaFlat {
  // OWN values coming from API (this head only)
  ownOpening: number;
  ownDebit: number;
  ownCredit: number;
  ownBalance: number;


  // TOTALS (own + all descendants)
  totalOpening: number;
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;

  // DISPLAY values for the table (depends on expanded/collapsed)
  openingBalance: number;
  debit: number;
  credit: number;
  balance: number;

  children: CoaNode[];
  hasChildren: boolean;
  $$expanded: boolean;
  level: number;
  parent?: CoaNode | null;
}

@Component({
  selector: 'app-general-ldeger',
  templateUrl: './general-ldeger.component.html',
  styleUrls: ['./general-ldeger.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GeneralLdegerComponent implements OnInit {

  @ViewChild('table') table: DatatableComponent | undefined;
isExpanded: boolean = false;
  headervalue = 'General Ledger';
  selectedOption = 10;
  searchValue = '';
  isLoading = false;

  roots: CoaNode[] = [];
  displayRows: CoaNode[] = [];

  constructor(private service: GeneralLedgerService) { }

  ngOnInit(): void {
    this.load();
  }

  // balance = opening + credit - debit
  private calcBalance(opening: number, debit: number, credit: number): number {
    return opening + credit - debit;
  }

  // ================= LOAD DATA FROM API =================
  load(): void {
    this.isLoading = true;

    this.service.GetGeneralLedger().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];

        const flat: CoaFlat[] = (raw || []).map((x: any) => {
          const headName = String(x.headName ?? '').trim();

          const isControl =
            !!x.isControl ||
            headName === 'Accounts Payable' ||
            headName.startsWith('Accounts Receivable');

          return {
            id: Number(x.headId ?? 0),
            headCode: Number(x.headCode ?? 0),
            headName,
            parentHead: x.parentHead == null ? 0 : Number(x.parentHead),

            headType: String(x.headType ?? ''),
            rootHeadType: String(x.rootHeadType ?? ''),

            openingBalance: Number(x.openingBalance ?? 0),
            debit: Number(x.debit ?? 0),
            credit: Number(x.credit ?? 0),
            balance: Number(x.balance ?? 0),

            isControl,
            isActive: x.isActive ?? true
          };
        });

        const flatActive = flat.filter(r => !!r.isActive);

        const nodesById = new Map<number, CoaNode>();
        const nodesByCode = new Map<number, CoaNode>();

        // ---------- CREATE NODES ----------
        flatActive.forEach(f => {
          const node: CoaNode = {
            ...f,

            // own values from API
            ownOpening: f.openingBalance,
            ownDebit:   f.debit,
            ownCredit:  f.credit,
            ownBalance: f.balance,

            // totals (filled by computeTotals)
            totalOpening: 0,
            totalDebit:   0,
            totalCredit:  0,
            totalBalance: 0,

            // display values (filled in rebuildDisplayRows)
            openingBalance: 0,
            debit: 0,
            credit: 0,
            balance: 0,

            children: [],
            hasChildren: false,
            $$expanded: false,
            level: 0,
            parent: null
          };

          nodesById.set(node.id, node);
          nodesByCode.set(node.headCode, node);
        });

        // ---------- BUILD TREE (ParentHead = parent HeadCode) ----------
        const roots: CoaNode[] = [];

        nodesById.forEach(node => {
          const p = node.parentHead ?? 0;
          if (!p) {
            roots.push(node);
          } else {
            const parent = nodesByCode.get(p);
            if (parent) {
              node.parent = parent;
              parent.children.push(node);
            } else {
              // parent missing → treat as root (safety)
              roots.push(node);
            }
          }
        });

        // ---------- SORT & SET LEVEL / HASCHILDREN ----------
        const sortAndSetLevel = (list: CoaNode[], level: number) => {
          list.sort((a, b) => a.headCode - b.headCode);
          list.forEach(n => {
            n.level = level;
            n.hasChildren = !!(n.children && n.children.length);
            if (n.hasChildren) {
              sortAndSetLevel(n.children, level + 1);
            }
          });
        };
        sortAndSetLevel(roots, 0);

        // ---------- COMPUTE TOTALS (own + all descendants) ----------
        roots.forEach(r => this.computeTotals(r));

        this.roots = roots;
        this.roots.forEach(r => (r.$$expanded = false));
        this.rebuildDisplayRows();

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: this.errMsg(err),
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // ===== RECURSIVE: totals = own + all descendants =====
  private computeTotals(node: CoaNode): { opening: number; debit: number; credit: number } {
    let opening = node.ownOpening ?? 0;
    let debit   = node.ownDebit   ?? 0;
    let credit  = node.ownCredit  ?? 0;

    if (node.children && node.children.length) {
      node.children.forEach(ch => {
        const t = this.computeTotals(ch);
        opening += t.opening;
        debit   += t.debit;
        credit  += t.credit;
      });
    }

    node.totalOpening = opening;
    node.totalDebit   = debit;
    node.totalCredit  = credit;
    node.totalBalance = Math.abs(this.calcBalance(opening, debit, credit));

    return { opening, debit, credit };
  }

  // ================= FLATTEN TREE & APPLY DISPLAY RULES =================
  private rebuildDisplayRows(): void {
    const output: CoaNode[] = [];

    const visit = (node: CoaNode) => {
      const hasChildren = !!(node.children && node.children.length);
      let o = 0, d = 0, c = 0;

      if (hasChildren) {
        const hasOwn =
          (node.ownOpening ?? 0) !== 0 ||
          (node.ownDebit   ?? 0) !== 0 ||
          (node.ownCredit  ?? 0) !== 0;

        if (node.$$expanded) {
          // EXPANDED
          if (hasOwn) {
            // show only own movement
            o = node.ownOpening ?? 0;
            d = node.ownDebit   ?? 0;
            c = node.ownCredit  ?? 0;
          } else {
            // pure grouping – no own value
            o = 0; d = 0; c = 0;
          }
        } else {
          // COLLAPSED → show totals (own + all descendants)
          o = node.totalOpening ?? 0;
          d = node.totalDebit   ?? 0;
          c = node.totalCredit  ?? 0;
        }
      } else {
        // LEAF → always own values
        o = node.ownOpening ?? 0;
        d = node.ownDebit   ?? 0;
        c = node.ownCredit  ?? 0;
      }

      node.openingBalance = o;
      node.debit = d;
      node.credit = c;
      node.balance = Math.abs(this.calcBalance(o, d, c));

      output.push(node);

      if (hasChildren && node.$$expanded) {
        node.children.forEach(ch => visit(ch));
      }
    };

    this.roots.forEach(r => visit(r));

    const term = (this.searchValue || '').toLowerCase();
    this.displayRows = term
      ? output.filter(n =>
          n.headName.toLowerCase().includes(term) ||
          String(n.headCode).includes(term)
        )
      : output;
  }

  // ===== EXPAND / COLLAPSE =====
toggleRow(row: CoaNode): void {
  const hasChildren = !!(row.children && row.children.length);
  if (!hasChildren) return;

  // expand/collapse
  row.$$expanded = !row.$$expanded;

  // rebuild rows (your existing logic)
  this.rebuildDisplayRows();

  // ✅ scrollbar ON only if any parent expanded
  this.isExpanded = this.displayRows?.some((r: any) => r.$$expanded) || false;
}
  filterUpdate(): void {
    this.rebuildDisplayRows();
  }

  private errMsg(err: any): string {
    return err?.error?.message || err?.message || 'Try again';
  }
}
