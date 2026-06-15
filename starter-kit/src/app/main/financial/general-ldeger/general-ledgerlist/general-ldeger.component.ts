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
  debitBase: number;
  creditBase: number;
  balanceBase: number;
  isControl: boolean;
  isActive?: boolean;
  baseCurrency: string;
}

interface CoaNode extends CoaFlat {
  ownOpening: number;
  ownDebit: number;
  ownCredit: number;
  ownBalance: number;
  ownDebitBase: number;
  ownCreditBase: number;

  totalOpening: number;
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;
  totalDebitBase: number;
  totalCreditBase: number;
  totalBalanceBase: number;

  // ✅ These are the DISPLAY values shown in the table
  // They are set in rebuildDisplayRows() based on baseCurrency
  openingBalance: number;
  debit: number;
  credit: number;
  balance: number;
  debitBase: number;
  creditBase: number;
  balanceBase: number;

  // ✅ Final single-column display values (base currency resolved)
  displayDebit: number;
  displayCredit: number;
  displayBalance: number;

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

  // ✅ BaseCurrency resolved from API — drives column header + which value to show
  baseCurrency: string = 'SGD';

  // ✅ true = base currency differs from transaction currency (FxRate applied values used)
  // false = same currency, use raw debit/credit/balance
  get useBaseValues(): boolean {
    // DebitBase/CreditBase/BalanceBase have FxRate applied.
    // If BaseCurrency is SGD and transactions are in foreign currency → use Base columns.
    // If BaseCurrency matches transaction currency (e.g., INR only) → use raw columns.
    // Since we always compute both, we decide per baseCurrency:
    //   SGD → use debitBase (FxRate-converted to SGD)
    //   INR → use debit (raw, already in INR, FxRate=1 for domestic)
    // Adjust this logic if your app has different rules.
    return this.baseCurrency.toUpperCase() === 'SGD';
  }

  roots: CoaNode[] = [];
  displayRows: CoaNode[] = [];

  constructor(private service: GeneralLedgerService) { }

  ngOnInit(): void {
    this.load();
  }

  private calcBalance(opening: number, debit: number, credit: number): number {
    return opening + credit - debit;
  }

  load(): void {
    this.isLoading = true;

    this.service.GetGeneralLedger().subscribe({
      next: (res: any) => {
        const raw = res?.data ?? res ?? [];

        // ✅ Pick baseCurrency from first row returned by SQL
        if (raw?.length) {
          const firstRow = raw[0];
          this.baseCurrency =
            firstRow.baseCurrency ??
            firstRow.BaseCurrency ??
            'SGD';
        }

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
            debitBase:   Number(x.debitBase   ?? x.DebitBase   ?? 0),
            creditBase:  Number(x.creditBase  ?? x.CreditBase  ?? 0),
            balanceBase: Number(x.balanceBase ?? x.BalanceBase ?? 0),
            isControl,
            isActive: x.isActive ?? true,
            baseCurrency: String(x.baseCurrency ?? x.BaseCurrency ?? 'SGD')
          };
        });

        const flatActive = flat.filter(r => !!r.isActive);
        const nodesById   = new Map<number, CoaNode>();
        const nodesByCode = new Map<number, CoaNode>();

        // ✅ CREATE NODES
        flatActive.forEach(f => {
          const node: CoaNode = {
            ...f,
            ownOpening:   f.openingBalance,
            ownDebit:     f.debit,
            ownCredit:    f.credit,
            ownBalance:   f.balance,
            ownDebitBase:  f.debitBase,
            ownCreditBase: f.creditBase,

            totalOpening:    0,
            totalDebit:      0,
            totalCredit:     0,
            totalBalance:    0,
            totalDebitBase:  0,
            totalCreditBase: 0,
            totalBalanceBase:0,

            openingBalance: 0,
            debit:    0,
            credit:   0,
            balance:  0,
            debitBase:   0,
            creditBase:  0,
            balanceBase: 0,

            // ✅ Single display values — computed in rebuildDisplayRows
            displayDebit:   0,
            displayCredit:  0,
            displayBalance: 0,

            children: [],
            hasChildren: false,
            $$expanded: false,
            level: 0,
            parent: null
          };

          nodesById.set(node.id, node);
          nodesByCode.set(node.headCode, node);
        });

        // ✅ BUILD TREE
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
              roots.push(node);
            }
          }
        });

        // ✅ SORT & SET LEVEL
        const sortAndSetLevel = (list: CoaNode[], level: number) => {
          list.sort((a, b) => a.headCode - b.headCode);
          list.forEach(n => {
            n.level = level;
            n.hasChildren = !!(n.children && n.children.length);
            if (n.hasChildren) sortAndSetLevel(n.children, level + 1);
          });
        };
        sortAndSetLevel(roots, 0);

        // ✅ COMPUTE TOTALS
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

  // ✅ RECURSIVE TOTALS — accumulates both raw and base values
  private computeTotals(node: CoaNode): {
    opening: number;
    debit: number;
    credit: number;
    debitBase: number;
    creditBase: number;
  } {
    let opening    = node.ownOpening    ?? 0;
    let debit      = node.ownDebit      ?? 0;
    let credit     = node.ownCredit     ?? 0;
    let debitBase  = node.ownDebitBase  ?? 0;
    let creditBase = node.ownCreditBase ?? 0;

    if (node.children && node.children.length) {
      node.children.forEach(ch => {
        const t = this.computeTotals(ch);
        opening    += t.opening;
        debit      += t.debit;
        credit     += t.credit;
        debitBase  += t.debitBase;
        creditBase += t.creditBase;
      });
    }

    node.totalOpening     = opening;
    node.totalDebit       = debit;
    node.totalCredit      = credit;
    node.totalBalance     = Math.abs(this.calcBalance(opening, debit, credit));
    node.totalDebitBase   = debitBase;
    node.totalCreditBase  = creditBase;
    node.totalBalanceBase = Math.abs(debitBase - creditBase);

    return { opening, debit, credit, debitBase, creditBase };
  }

  // ✅ FLATTEN TREE + resolve display values based on baseCurrency
  private rebuildDisplayRows(): void {
    const output: CoaNode[] = [];

    const visit = (node: CoaNode) => {
      const hasChildren = !!(node.children && node.children.length);
      let o = 0, d = 0, c = 0, db = 0, cb = 0;

      if (hasChildren) {
        const hasOwn =
          (node.ownOpening ?? 0) !== 0 ||
          (node.ownDebit   ?? 0) !== 0 ||
          (node.ownCredit  ?? 0) !== 0;

        if (node.$$expanded) {
          if (hasOwn) {
            o  = node.ownOpening    ?? 0;
            d  = node.ownDebit      ?? 0;
            c  = node.ownCredit     ?? 0;
            db = node.ownDebitBase  ?? 0;
            cb = node.ownCreditBase ?? 0;
          } else {
            o = 0; d = 0; c = 0; db = 0; cb = 0;
          }
        } else {
          // COLLAPSED → show totals
          o  = node.totalOpening    ?? 0;
          d  = node.totalDebit      ?? 0;
          c  = node.totalCredit     ?? 0;
          db = node.totalDebitBase  ?? 0;
          cb = node.totalCreditBase ?? 0;
        }
      } else {
        // LEAF
        o  = node.ownOpening    ?? 0;
        d  = node.ownDebit      ?? 0;
        c  = node.ownCredit     ?? 0;
        db = node.ownDebitBase  ?? 0;
        cb = node.ownCreditBase ?? 0;
      }

      node.openingBalance = o;
      node.debit          = d;
      node.credit         = c;
      node.balance        = Math.abs(this.calcBalance(o, d, c));
      node.debitBase      = db;
      node.creditBase     = cb;
      node.balanceBase    = Math.abs(db - cb);

      // ✅ KEY LOGIC: Pick which column to show as the single display value
      // If baseCurrency = 'SGD' (or any currency needing FxRate conversion) → use Base
      // If baseCurrency = 'INR' (same as transaction currency, FxRate=1) → use raw
      if (this.useBaseValues) {
        node.displayDebit   = db;
        node.displayCredit  = cb;
        node.displayBalance = Math.abs(db - cb);
      } else {
        node.displayDebit   = d;
        node.displayCredit  = c;
        node.displayBalance = Math.abs(this.calcBalance(o, d, c));
      }

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

  toggleRow(row: CoaNode): void {
    const hasChildren = !!(row.children && row.children.length);
    if (!hasChildren) return;

    row.$$expanded = !row.$$expanded;
    this.rebuildDisplayRows();
    this.isExpanded = this.displayRows?.some((r: any) => r.$$expanded) || false;
  }

  filterUpdate(): void {
    this.rebuildDisplayRows();
  }

  private errMsg(err: any): string {
    return err?.error?.message || err?.message || 'Try again';
  }
}
