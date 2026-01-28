import {
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ChartofaccountService } from 'app/main/financial/chartofaccount/chartofaccount.service';
import { DepartmentService } from 'app/main/master/department/department.service';
import { ItemsService } from 'app/main/master/items/items.service';
import { LocationService } from 'app/main/master/location/location.service';
import { UomService } from 'app/main/master/uom/uom.service';
import { PurchaseService } from '../../purchase.service';
import { PrDraftService } from '../pr-draft.service';
import { CitiesService } from 'app/main/master/cities/cities.service';
import { CountriesService } from 'app/main/master/countries/countries.service';

@Component({
  selector: 'app-create-purchase-request',
  templateUrl: './create-purchase-request.component.html',
  styleUrls: ['./create-purchase-request.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CreatePurchaseRequestComponent implements OnInit, OnDestroy {
  prStep = 0;
  prSteps = ['Header', 'Lines', 'Review'];
  hover = false;

  // New Item modal
  showNewItemModal = false;
  @ViewChild('itemSearchInput') itemSearchInput!: ElementRef<HTMLInputElement>;

  // Header model MUST be initialized (do NOT set to null)
  prHeader: any = {
    id: 0,
    requester: '',
    departmentID: 0,
    neededBy: null,
    description: '',
    multiLoc: false,
    oversea: false
  };

  // New Item form model
  newItem = {
    itemName: '',
    itemCode: '',
    uomId: null as number | null,
    budgetLineId: null as number | null
  };

  // Add Location form model
  newLocation: {
    name?: string;
    contactNumber?: string;
    latitude?: string;
    longitude?: string;
    countryId?: number | null;
    stateId?: number | null;
    cityId?: number | null;
  } = {};

  countries: any[] = [];
  StateList: any[] = [];
  CityList: any[] = [];

  prLines: any[] = [];
  purchaseRequests: any[] = [];
  departments: any[] = [];
  filteredDepartments: any[] = [];

  accountHeads: any[] = [];
  parentHeadList: any[] = [];
  itemsList: any[] = [];
  uomList: any[] = [];
  locationList: any[] = [];

  dropdownOpen = false;
  searchText = '';
  minDate = '';
  showModal = false;
  isItemSelected = false;

  modalLine: any = {
    itemSearch: '',
    itemCode: '',
    qty: null,
    uomSearch: '',
    uom: '',
    locationSearch: '',
    location: '',
    budget: '',
    remarks: '',
    filteredItems: [] as any[],
    filteredUoms: [] as any[],
    filteredLocations: [] as any[],
    dropdownOpen: false,
    uomDropdownOpen: false,
    locationDropdownOpen: false,
    isDraft: true
  };

  draftIndex: number | null = null;
  editingIndex: number | null = null;

  userId: string;
  prid: number | null = null;
  isEditMode = false;

  // Draft handling (server)
  private tempDraftId: number | null = null;
  private suppressAutosave = false;

  // Add Location modal visibility
  showAddLocationModal = false;

  // Department name resolution helpers
  private departmentsLoaded = false;
  private headerLoaded = false;
  private pendingDeptId: number | null = null;
  private pendingDeptName: string | null = null;

  private captureHandler!: (e: MouseEvent) => void;
  private readonly RETURN_URL = '/purchase/Create-PurchaseRequest';

  // Anchors for scrolling
  @ViewChild('topOfWizard') topOfWizard!: ElementRef<HTMLDivElement>;
  @ViewChild('bottomOfWizard') bottomOfWizard!: ElementRef<HTMLDivElement>;

  // Baseline signature for unsaved detection
  private initialSignature = '';

  constructor(
    private purchaseService: PurchaseService,
    private router: Router,
    private route: ActivatedRoute,
    private deptService: DepartmentService,
    private itemService: ItemsService, // used for getAllItem()
    private chartOfAccountService: ChartofaccountService,
    private uomService: UomService,
    private locationService: LocationService,
    private eRef: ElementRef,
    private zone: NgZone,
    private draft: PrDraftService,
    private itemsService: ItemsService, // used for createItem()
    private _cityService: CitiesService,
    private _countriesService: CountriesService
  ) {
    debugger
    this.userId = localStorage.getItem('id') || 'System';
  }

  // ---------------- Lifecycle ----------------

  ngOnInit(): void {
    this.clearDraft();            // <- reset to defaults (not null)
    this.setMinDate();
    this.getAllCountries();
    this.applyRequesterDefault();
    this.applyDepartmentFromTeams();
    this.loadDepartments();
    this.loadCatalogs();
    this.loadRequests();

    // Edit PR via :id
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      this.prid = idStr ? +idStr : null;
      if (this.prid) {
        this.isEditMode = true;
        this.draft.clear();
        this.purchaseService.GetPurchaseById(this.prid).subscribe((res: any) => {
          if (res?.data) {
            this.editRequest(res);
            this.prStep = 0;
            this.updateBaseline();
          }
        });
      }
    });

    // Opened from a Draft via ?draftId=...
    this.route.queryParamMap.subscribe(pm => {
      const draftIdStr = pm.get('draftId');
      if (draftIdStr) {
        this.tempDraftId = +draftIdStr;
        this.loadDraftById(this.tempDraftId);
      } else {
        // Restore local (client) draft if any
        const d = this.draft.load();
        if (d) {
          this.prHeader = { ...this.prHeader, ...(d.prHeader || {}) };
          this.prLines = d.prLines || [];
          this.searchText = d.departmentName ?? '';
          this.prStep = typeof d.step === 'number' ? d.step : 0;
          this.headerLoaded = true;
          this.resolveDepartmentName();
          this.updateBaseline();
        } else {
          this.updateBaseline();
        }
      }
    });

    // Global capture click for closing dropdowns
    this.captureHandler = (ev: MouseEvent) => this.onGlobalClickCapture(ev);
    document.addEventListener('click', this.captureHandler, { capture: true });
  }

  ngOnDestroy(): void {
    if (this.captureHandler) {
      document.removeEventListener('click', this.captureHandler, { capture: true } as any);
    }
  }
private getLoginUsername(): string {
  // ✅ your localStorage is separate keys, so get directly
  return (localStorage.getItem('username') || '').trim();
}

private getLoginTeams(): string[] {
  const raw = localStorage.getItem('teams'); // ex: ["Purchase Team"]
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(x => (x || '').toString()) : [];
  } catch {
    return [];
  }
}

/** ✅ Auto fill Requester from localStorage username */
private applyRequesterDefault(): void {
  const uname = this.getLoginUsername();
  if (!uname) return;

  if (!this.prHeader) this.prHeader = {};
  if (!this.prHeader.requester || this.prHeader.requester.toString().trim() === '') {
    this.prHeader.requester = uname;
  }
}

/**
 * ✅ Auto bind Department by Team name
 * Example: "Purchase Team" -> picks department that contains "Purchase"
 */
private applyDepartmentFromTeams(): void {
  // already selected by user -> don't override
  if ((this.searchText || '').trim()) return;

  const raw = localStorage.getItem('teams'); // "[\"Purchase Team\"]"
  if (!raw) return;

  let teamsArr: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    teamsArr = Array.isArray(parsed) ? parsed.map(x => (x || '').toString()) : [];
  } catch {
    teamsArr = [];
  }

  const deptName = (teamsArr[0] || '').trim();
  if (!deptName) return;

  // ✅ show department name in input
  this.searchText = deptName;

  // OPTIONAL: keep departmentID as 0 (since teams is department)
  if (!this.prHeader) this.prHeader = {};
  if (!this.prHeader.departmentID) this.prHeader.departmentID = 0;
}
private applyDepartmentFromTeamsAndSetId(): void {
  const raw = localStorage.getItem('teams'); // '["Purchase Team"]'
  if (!raw) return;

  let teams: string[] = [];
  try { teams = JSON.parse(raw) || []; } catch { teams = []; }

  const deptText = (teams[0] || '').trim();
  if (!deptText) return;

  // ✅ show in input
  if (!this.searchText || !this.searchText.trim()) {
    this.searchText = deptText;
  }

  // ✅ if master departments loaded, set departmentID
  if (Array.isArray(this.departments) && this.departments.length) {
    const t = deptText.toLowerCase();

    // Try exact / contains match
    const match = this.departments.find((d: any) => {
      const name = (d.departmentName || d.DepartmentName || '').toString().toLowerCase();
      return name === t || name.includes(t) || t.includes(name);
    });

    if (match) {
      const id = this.toNum(match?.id ?? match?.Id ?? match?.departmentID ?? match?.DepartmentID);
      if (id > 0) this.prHeader.departmentID = id;
    }
  }
}

  // ---------------- New Item modal open/close ----------------

  openNewItemModal() {
    this.showNewItemModal = true;
  }

  closeNewItemModal() {
    this.showNewItemModal = false;
    this.resetNewItemForm();
  }

  resetNewItemForm() {
    this.newItem = {
      itemName: '',
      itemCode: '',
      uomId: null,
      budgetLineId: null
    };
  }

  // ---------------- Draft load ----------------

  private loadDraftById(id: number) {
    this.draft.getById(id).subscribe((res: any) => {
      const d = res?.data;
      if (!d) return;

      this.tempDraftId = d.id ?? id;

      // Fill header (not a real PR)
      this.prHeader = {
        id: 0,
        requester: d.requester || '',
        departmentID: this.toNum(d.departmentID),
        neededBy: d.deliveryDate ? String(d.deliveryDate).split('T')[0] : null,
        description: d.description || '',
        multiLoc: !!d.multiLoc,
        oversea: !!d.oversea
      };

      if (d.departmentName) {
        this.searchText = d.departmentName;
        this.pendingDeptName = d.departmentName;
      } else {
        this.searchText = '';
        this.pendingDeptId = this.prHeader.departmentID || null;
      }

      try {
        this.prLines = Array.isArray(d.prLines) ? d.prLines : JSON.parse(d.prLines || '[]');
      } catch {
        this.prLines = [];
      }

      this.prStep = 0;
      this.headerLoaded = true;
      this.resolveDepartmentName();
      this.updateBaseline();
    });
  }

  // ---------------- Name/ID helpers ----------------

  private toNum(v: any): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  private resolveDepartmentName(): void {
    if (!this.departmentsLoaded || !this.headerLoaded) return;
    if (this.searchText && this.searchText.trim().length) return;

    const depId = this.toNum(this.prHeader?.departmentID);
    if (!depId || !Array.isArray(this.departments) || this.departments.length === 0) return;

    const match = this.departments.find((d: any) => {
      const idCandidates = [d.id, d.Id, d.departmentID, d.DepartmentID].map(this.toNum);
      return idCandidates.includes(depId);
    });

    const name = match?.departmentName ?? match?.DepartmentName ?? null;
    if (name) {
      this.searchText = name;
    } else if (this.pendingDeptName) {
      this.searchText = this.pendingDeptName;
    }
  }

  // ---------------- Unsaved detection baseline ----------------

  private computeSignature(): string {
    const header = {
      requester: this.prHeader?.requester ?? '',
      departmentID: Number(this.prHeader?.departmentID || 0),
      neededBy: this.prHeader?.neededBy ?? null,
      description: this.prHeader?.description ?? '',
      multiLoc: !!this.prHeader?.multiLoc,
      oversea: !!this.prHeader?.oversea
    };
    const lines = (this.prLines || []).map(l => {
      const {
        filteredItems, filteredUoms, filteredLocations,
        dropdownOpen, uomDropdownOpen, locationDropdownOpen,
        isDraft, ...rest
      } = l || {};
      return rest;
    });
    return JSON.stringify({ header, lines });
  }

  private updateBaseline(): void {
    this.initialSignature = this.computeSignature();
  }

  private hasUnsavedChanges(): boolean {
    const currentSig = this.computeSignature();
    return currentSig !== this.initialSignature;
  }

  onGoToPRList(): void {
    if (!this.hasUnsavedChanges()) {
      this.router.navigate(['/purchase/list-PurchaseRequest']);
      return;
    }

    Swal.fire({
      title: 'Unsaved Changes',
      text: 'Do you want to save changes before leaving?',
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true,
      allowEscapeKey: true,
      allowOutsideClick: false,
      confirmButtonText: 'Save Changes',
      cancelButtonText: 'Discard',
      confirmButtonColor: '#2E5F73',
      cancelButtonColor: '#d33'
    }).then(result => {
      if (result.isConfirmed) {
        this.saveAsDraft();
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.discardAndGo();
      }
    });
  }

  private discardAndGo(): void {
    this.suppressAutosave = true;
    try { this.draft?.clear?.(); } catch {}
    this.router.navigate(['/purchase/list-PurchaseRequest']);
  }

  // ---------------- Draft save (server) ----------------

  saveAsDraft(): void {
    const payload = {
      id: this.tempDraftId ?? 0,
      PurchaseRequestNo: 'pr-temp',
      requester: this.prHeader.requester,
      departmentID: this.prHeader.departmentID,
      deliveryDate: this.prHeader.neededBy,
      description: this.prHeader.description,
      multiLoc: this.prHeader.multiLoc,
      oversea: this.prHeader.oversea,
      prLines: JSON.stringify(this.prLines || []),
      status: 0,
      isActive: true,
      userId: this.userId,
      CreatedBy: this.userId,
      UpdatedBy: this.userId,
      DepartmentName: this.searchText || null,
      StockReorderId:0
    };

    const goList = () => this.router.navigate(['/purchase/list-PurchaseRequest']);

    if (this.tempDraftId) {
      this.draft.update(this.tempDraftId, payload).subscribe({
        next: _ => Swal.fire({
          icon: 'success', title: 'Saved', text: 'Draft updated.', confirmButtonColor: '#2E5F73'
        }).then(() => {
          this.updateBaseline();
          goList();
        }),
        error: _ => Swal.fire({
          icon: 'error', title: 'Save Failed', text: 'Try again.', confirmButtonColor: '#2E5F73'
        })
      });
    } else {
      this.draft.create(payload).subscribe({
        next: (res: any) => {
          this.tempDraftId = res?.data ?? res?.id ?? null;
          Swal.fire({
            icon: 'success', title: 'Saved', text: 'Draft saved.', confirmButtonColor: '#2E5F73'
          }).then(() => {
            this.updateBaseline();
            goList();
          });
        },
        error: _ => Swal.fire({
          icon: 'error', title: 'Save Failed', text: 'Try again.', confirmButtonColor: '#2E5F73'
        })
      });
    }
  }

  // ---------------- Client-only draft ----------------

  private saveDraft(): void {
    this.draft.save({
      prHeader: this.prHeader,
      prLines: this.prLines,
      departmentName: this.searchText,
      step: this.prStep
    });
  }

  private clearDraft(): void {
    // IMPORTANT: reset to defaults; never set these to null
    this.prHeader = {
      id: 0,
      requester: '',
      departmentID: 0,
      neededBy: null,
      description: '',
      multiLoc: false,
      oversea: false
    };
    this.prLines = [];
    this.searchText = '';
    this.prStep = 0;
    this.draftIndex = null;
    this.editingIndex = null;

    this.headerLoaded = false;
    this.pendingDeptId = null;
    this.pendingDeptName = null;
  }

  onAddDepartmentClick(): void {
    this.saveDraft();
    this.router.navigate(['/master/department'], {
      state: { openCreate: true, returnUrl: this.RETURN_URL },
      replaceUrl: false
    });
  }

  // ---------------- UI dropdown close capture ----------------

  private onGlobalClickCapture(ev: MouseEvent) {
    const t = ev.target as HTMLElement;
    if (t.closest('.dropdown-wrapper') || t.closest('.prl-dropdown') || t.closest('.prl-menu')) return;

    this.zone.run(() => {
      this.dropdownOpen = false;
      this.prLines.forEach(l => {
        l.dropdownOpen = false;
        l.uomDropdownOpen = false;
        l.locationDropdownOpen = false;
      });
      if (this.modalLine) {
        this.modalLine.dropdownOpen = false;
        this.modalLine.uomDropdownOpen = false;
        this.modalLine.locationDropdownOpen = false;
      }
    });
  }

  onModalRootClick(ev: MouseEvent) {
    ev.stopPropagation();
    const t = ev.target as HTMLElement;
    const insideDropdown = t.closest('.prl-dropdown') || t.closest('.prl-menu');
    if (insideDropdown) return;
    this.modalLine.dropdownOpen = false;
    this.modalLine.uomDropdownOpen = false;
    this.modalLine.locationDropdownOpen = false;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEsc(_e: KeyboardEvent) {}

  // ---------------- UI helpers ----------------

  gridColsClass(cols: number) {
    return {
      'grid grid-cols-1 gap-3': true,
      'md:grid-cols-1': cols === 1,
      'md:grid-cols-2': cols === 2,
      'md:grid-cols-3': cols === 3,
      'md:grid-cols-4': cols === 4,
      'md:grid-cols-5': cols === 5,
      'md:grid-cols-6': cols === 6
    };
  }

  trackByIndex(index: number) { return index; }

  private scrollTo(position: 'top' | 'bottom') {
    const anchor = position === 'bottom'
      ? this.bottomOfWizard?.nativeElement
      : this.topOfWizard?.nativeElement;

    if (anchor?.scrollIntoView) {
      anchor.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'nearest' });
    }

    anchor?.parentElement?.scrollTo?.({
      top: position === 'bottom'
        ? anchor.parentElement.scrollHeight
        : 0,
      left: 0,
      behavior: 'auto'
    });

    const scrollingElement = document.scrollingElement || document.documentElement;
    if (position === 'bottom') {
      scrollingElement.scrollTop = scrollingElement.scrollHeight;
      window.scrollTo({ top: document.body.scrollHeight, left: 0, behavior: 'auto' });
    } else {
      scrollingElement.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }

  prGo(step: number) {
    (document.activeElement as HTMLElement | null)?.blur?.();

    const next = this.prStep + step;
    this.prStep = Math.max(0, Math.min(next, this.prSteps.length - 1));

    setTimeout(() => {
      requestAnimationFrame(() => {
        if (this.prStep === 2) {
          this.scrollTo('bottom');
        } else {
          this.scrollTo('top');
        }
      });
    }, 0);
  }

  prRemoveLine(index: number) {
    if (this.draftIndex !== null && this.draftIndex === index) {
      this.closeModal();
      return;
    }
    this.prLines.splice(index, 1);
  }

  setMinDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;
  }

  // ---------------- Loads ----------------

  loadDepartments() {
    this.deptService.getDepartment().subscribe((res: any) => {
      this.departments = (res?.data ?? []).map((x: any) => ({
        ...x,
        id: this.toNum(x.id ?? x.Id ?? x.departmentID ?? x.DepartmentID)
      }));
      this.filteredDepartments = [...this.departments];

      this.departmentsLoaded = true;

      if (this.pendingDeptName && !this.searchText) {
        this.searchText = this.pendingDeptName;
      }
      if (!this.searchText && (this.prHeader?.departmentID || this.pendingDeptId)) {
        if (this.pendingDeptId) this.prHeader.departmentID = this.pendingDeptId;
      }

      this.resolveDepartmentName();
       this.applyDepartmentFromTeamsAndSetId();
    });
  }

  loadCatalogs() {
    this.chartOfAccountService.getAllChartOfAccount().subscribe((res: any) => {
      this.accountHeads = res?.data ?? [];
      this.parentHeadList = this.accountHeads.map((head: any) => ({
        value: head.id,
        label: this.buildFullPath(head)
      }));

      this.itemService.getAllItem().subscribe((ires: any) => {
        const raw = ires?.data ?? [];
        this.itemsList = raw.map((item: any) => {
          const matched = this.parentHeadList.find(h => +h.value === +item.budgetLineId);
          return { ...item, label: matched ? matched.label : null };
        });
      });
    });

    this.uomService.getAllUom().subscribe((res: any) => {
      this.uomList = res?.data ?? [];
    });

    this.locationService.getLocation().subscribe((res: any) => {
      this.locationList = res?.data ?? [];
    });
  }

  loadRequests() {
    this.purchaseService.getAll().subscribe({
      next: (res: any) => {
        this.purchaseRequests = (res?.data || []).map((req: any) => ({
          ...req,
          prLines: req.prLines ? JSON.parse(req.prLines) : []
        }));
      },
      error: (err: any) => console.error('Error loading list', err)
    });
  }

  buildFullPath(item: any): string {
    if (!item) return '';
    let path = item.headName;
    let current = this.accountHeads.find((x: any) => x.headCode === item.parentHead);
    while (current) {
      path = `${current.headName} >> ${path}`;
      current = this.accountHeads.find((x: any) => x.headCode === current.parentHead);
    }
    return path;
  }

  // ---------------- Department dropdown ----------------

  filterDepartments() {
    const q = (this.searchText || '').toLowerCase();
    this.filteredDepartments = this.departments.filter(d =>
      ((d.departmentName ?? d.DepartmentName ?? '') as string).toLowerCase().includes(q)
    );
  }

  toggleDropdown(force?: boolean) {
    this.dropdownOpen = force !== undefined ? !!force : !this.dropdownOpen;
  }

  selectDepartment(dept: any) {
    const id =
      this.toNum(dept?.id ?? dept?.Id ?? dept?.departmentID ?? dept?.DepartmentID);
    const name = dept?.departmentName ?? dept?.DepartmentName ?? '';

    this.prHeader.departmentID = id;
    this.searchText = name;
    this.pendingDeptId = null;
    this.pendingDeptName = null;
    this.dropdownOpen = false;
  }

  // ---------------- PR line modal (draft/edit) ----------------

  private makeEmptyDraft() {
    return {
      itemSearch: '',
      itemCode: '',
      qty: null,
      uomSearch: '',
      uom: '',
      locationSearch: '',
      location: '',
      budget: '',
      remarks: '',
      filteredItems: [] as any[],
      filteredUoms: [] as any[],
      filteredLocations: [] as any[],
      dropdownOpen: false,
      uomDropdownOpen: false,
      locationDropdownOpen: false,
      isDraft: true
    };
  }

  private validateModal(): boolean {
    if (!this.modalLine?.itemSearch || !this.modalLine?.qty || !this.modalLine.location) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Item,Location and Qty are required',
        confirmButtonColor: '#0e3a4c'
      });
      return false;
    }
    return true;
  }

  prAddLine() {
    if (this.draftIndex !== null) {
      this.showModal = true;
      return;
    }
    const draft = this.makeEmptyDraft();
    this.prLines.push(draft);
    this.draftIndex = this.prLines.length - 1;
    this.modalLine = this.prLines[this.draftIndex];
    this.showModal = true;
  }

 addAnotherPR() {
  if (!this.validateModal()) return;

  const incomingQty = Number(this.modalLine?.qty) || 0;
  const dupIndex = this.findSameItemLocationIndex(this.modalLine);

  const isSameRow = (this.draftIndex !== null && dupIndex === this.draftIndex) ||
                    (this.editingIndex !== null && dupIndex === this.editingIndex);

  if (dupIndex >= 0 && !isSameRow) {
    const oldQty = Number(this.prLines[dupIndex]?.qty) || 0;
    this.prLines[dupIndex].qty = oldQty + incomingQty;

    // remarks append optional
    const oldRem = (this.prLines[dupIndex]?.remarks || '').toString().trim();
    const newRem = (this.modalLine?.remarks || '').toString().trim();
    if (newRem) this.prLines[dupIndex].remarks = oldRem ? `${oldRem} | ${newRem}` : newRem;

    // keep modal open but clear fields for next line
    this.modalLine = this.makeEmptyDraft();
    return;
  }

  // normal add flow
  if (this.draftIndex !== null) {
    this.prLines[this.draftIndex].isDraft = false;
  }

  const draft = this.makeEmptyDraft();
  this.prLines.push(draft);
  this.draftIndex = this.prLines.length - 1;
  this.modalLine = this.prLines[this.draftIndex];
}


 addAndClose() {
  if (!this.validateModal()) return;

  const incomingQty = Number(this.modalLine?.qty) || 0;

  // ✅ check duplicate (same item + same location)
  const dupIndex = this.findSameItemLocationIndex(this.modalLine);

  // if the existing row is not the same draft row we are editing/adding
  const isSameRow = (this.draftIndex !== null && dupIndex === this.draftIndex) ||
                    (this.editingIndex !== null && dupIndex === this.editingIndex);

  if (dupIndex >= 0 && !isSameRow) {
    // OPTIONAL: ensure UOM same (avoid wrong merge)
    const existingUom = this.norm(this.prLines[dupIndex]?.uom || this.prLines[dupIndex]?.uomSearch);
    const incomingUom = this.norm(this.modalLine?.uom || this.modalLine?.uomSearch);

    if (existingUom && incomingUom && existingUom !== incomingUom) {
      Swal.fire({
        icon: 'warning',
        title: 'UOM mismatch',
        text: `Same item + location ஆனால் UOM different. Please correct UOM.`,
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    // ✅ MERGE QTY
    const oldQty = Number(this.prLines[dupIndex]?.qty) || 0;
    this.prLines[dupIndex].qty = oldQty + incomingQty;

    // OPTIONAL: merge remarks (keep existing + append new)
    const oldRem = (this.prLines[dupIndex]?.remarks || '').toString().trim();
    const newRem = (this.modalLine?.remarks || '').toString().trim();
    if (newRem) {
      this.prLines[dupIndex].remarks = oldRem ? `${oldRem} | ${newRem}` : newRem;
    }

    // ✅ remove draft row if exists
    if (this.draftIndex !== null) {
      this.prLines.splice(this.draftIndex, 1);
      this.draftIndex = null;
    }

    this.showModal = false;
    return;
  }

  // ✅ normal flow (no duplicate)
  if (this.draftIndex !== null) {
    this.prLines[this.draftIndex].isDraft = false;
    this.draftIndex = null;
  }

  this.showModal = false;
}


  closeModal() {
    if (this.draftIndex !== null) {
      if (this.prLines[this.draftIndex]?.isDraft) {
        this.prLines.splice(this.draftIndex, 1);
      }
    }
    this.draftIndex = null;
    this.editingIndex = null;
    this.showModal = false;

    this.modalLine.dropdownOpen = false;
    this.modalLine.uomDropdownOpen = false;
    this.modalLine.locationDropdownOpen = false;
  }

  onModalItemFocus() {
    this.modalLine.filteredItems = [...this.itemsList];
    this.modalLine.dropdownOpen = true;
    this.isItemSelected = false;
  }

  filterModalItems() {
    const q = (this.modalLine.itemSearch || '').toLowerCase();
    this.modalLine.filteredItems = this.itemsList.filter(
      (it: any) =>
        (it.itemName || '').toLowerCase().includes(q) ||
        (it.itemCode || '').toLowerCase().includes(q)
    );
  }

selectModalItem(item: any) {
  // First, check if the item exists before doing anything else
  this.itemsService.checkItemExists(item.itemCode).subscribe({
    next: (res) => {
      if (res.data === true) {
        // ✅ Item exists → Continue your normal logic
        this.modalLine.itemSearch = item.itemName;
        this.modalLine.itemCode = item.itemCode;
        this.modalLine.uomSearch = item.uomName;
        this.modalLine.uom = item.uomName;
        this.modalLine.budget = item.label || '';
        this.modalLine.dropdownOpen = false;
        this.modalLine.filteredItems = [];
        this.isItemSelected = true;

        // 👉 Call your existing method (e.g., calculate, refresh, etc.)
        // this.afterItemSelected(item);
      } else {
  this.modalLine = {
    itemSearch: '',
    itemCode: '',
    uomSearch: '',
    uom: '',
    budget: '',
    dropdownOpen: false,
    filteredItems: []
  };
        Swal.fire({
          icon: 'warning',
          title: 'Item not found in ItemMaster',
          text: 'Please add this item to ItemMaster before proceeding.',
        });
        
      }
    },
    error: (err) => {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to verify item existence.',
      });
      console.error(err);
    }
  });
}


  onModalUomFocus() {
    this.modalLine.filteredUoms = [...this.uomList];
    this.modalLine.uomDropdownOpen = true;
  }

  filterModalUoms() {
    const q = (this.modalLine.uomSearch || '').toLowerCase();
    this.modalLine.filteredUoms = this.uomList.filter((u: any) =>
      (u.name || '').toLowerCase().includes(q)
    );
  }

  selectModalUom(uom: any) {
    this.modalLine.uomSearch = uom.name;
    this.modalLine.uom = uom.name;
    this.modalLine.uomDropdownOpen = false;
    this.modalLine.filteredUoms = [];
  }

  onModalLocationFocus() {
    this.modalLine.filteredLocations = [...this.locationList];
    this.modalLine.locationDropdownOpen = true;
  }

  filterModalLocations() {
    const q = (this.modalLine.locationSearch || '').toLowerCase();
    this.modalLine.filteredLocations = this.locationList.filter((loc: any) =>
      (loc.name || '').toLowerCase().includes(q)
    );
  }

  private reloadLocationList(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.locationService.getLocation().subscribe(
        (res: any) => {
          this.locationList = res?.data ?? [];
          resolve();
        },
        _ => resolve()
      );
    });
  }

  private applyLocationToActiveLine(loc: any) {
    this.selectModalLocation(loc); // sets modalLine.locationSearch & modalLine.location
    this.modalLine.locationDropdownOpen = false;
    this.modalLine.filteredLocations = [];
  }

  selectModalLocation(location: any) {
    this.modalLine.locationSearch = location.name;
    this.modalLine.location = location.name;
    this.modalLine.locationDropdownOpen = false;
    this.modalLine.filteredLocations = [];
  }

  editLine(index: number) {
    if (this.draftIndex !== null) {
      this.prLines[this.draftIndex].isDraft = false;
      this.draftIndex = null;
    }
    this.editingIndex = index;

    this.modalLine = JSON.parse(JSON.stringify(this.prLines[index] || {}));
    this.modalLine.filteredItems = [];
    this.modalLine.filteredUoms = [];
    this.modalLine.filteredLocations = [];
    this.modalLine.dropdownOpen = false;
    this.modalLine.uomDropdownOpen = false;
    this.modalLine.locationDropdownOpen = false;
    this.modalLine.isDraft = false;

    this.showModal = true;
  }

  onSubmitModal() {
    if (this.editingIndex !== null) {
      this.saveEdit();
    } else {
      this.addAndClose();
    }
  }

  private saveEdit() {
    if (!this.modalLine?.itemSearch || !this.modalLine?.qty) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Item and Qty are required',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const idx = this.editingIndex!;
    const {
      filteredItems, filteredUoms, filteredLocations,
      dropdownOpen, uomDropdownOpen, locationDropdownOpen,
      isDraft, ...clean
    } = this.modalLine;

    this.prLines[idx] = { ...this.prLines[idx], ...clean, isDraft: false };
    this.editingIndex = null;
    this.showModal = false;
  }

  // ---------------- NEW: Item creation -> auto select into modal ----------------

  /** Normalize server item -> ensure we have uomName + budget label */
  private hydrateItem(raw: any) {
    const uomId = Number(raw.uomId ?? raw.UomId ?? raw.uomid);
    const budgetLineId = Number(raw.budgetLineId ?? raw.BudgetLineId ?? raw.budgetlineid);

    const uomName =
      this.uomList.find((u: any) => Number(u.id ?? u.Id) === uomId)?.name
      ?? raw.uomName
      ?? '';

    const budgetLabel =
      this.parentHeadList.find((h: any) => Number(h.value) === budgetLineId)?.label
      ?? raw.label
      ?? '';

    return {
      ...raw,
      uomId,
      budgetLineId,
      uomName,
      label: budgetLabel
    };
  }

  /** Apply a chosen item into the current PR-line modal */
  private applyItemToActiveLine(item: any) {
    this.selectModalItem(item);
    this.isItemSelected = true;
    this.modalLine.dropdownOpen = false;
  }

  /** Reload items only and rebuild itemsList with labels */
  private reloadItemsList(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.itemService.getAllItem().subscribe((ires: any) => {
        const raw = ires?.data ?? [];
        this.itemsList = raw.map((item: any) => {
          const matched = this.parentHeadList.find(h => +h.value === +item.budgetLineId);
          return { ...item, label: matched ? matched.label : null };
        });
        resolve();
      }, _ => resolve());
    });
  }

  /** Safe id getter */
  private getId(x: any): number {
    return this.toNum(x?.id ?? x?.Id);
  }

  /** Create item, then refresh list and apply the canonical item by ID */
  submitNewItem(): void {
    debugger
    const { itemName, itemCode, uomId, budgetLineId } = this.newItem || {};

    if (!itemName?.trim() || !itemCode?.trim() || uomId == null || budgetLineId == null) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please enter Item Name, Item Code, UOM, and Ledger Name.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const payload = {
      itemName: itemName.trim(),
      itemCode: itemCode.trim(),
      uomId: Number(uomId),
      budgetLineId: Number(budgetLineId),
      createdBy: this.userId,
      createdDate: new Date()
    };

    this.itemsService.createItem(payload).subscribe({
      next: async (res: any) => {
        // new DB id from server
        const newId = this.toNum(res?.data?.id ?? res?.id);

        // Always refresh items from server so we have the canonical object (and id)
        await this.reloadItemsList();

        // Find newly created item in the refreshed list
        const canonical = this.itemsList.find(it => this.getId(it) === newId);

        // Fallback if not found
        const toApply = canonical ?? { ...payload, id: newId };

        // Hydrate to guarantee uomName/label exist for UI bindings
        const hydrated = this.hydrateItem(toApply);

        // Apply into the PR line modal
        this.applyItemToActiveLine(hydrated);

        // Keep modal’s filtered list fresh
        if (this.modalLine) {
          this.modalLine.filteredItems = [hydrated, ...this.itemsList];
        }

        Swal.fire({
          icon: 'success',
          title: 'Created!',
          text: 'Item created successfully.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0e3a4c'
        });

        // Reset + close the New Item popup
        this.resetNewItemForm();
        this.closeNewItemModal();

        // Focus back to item input for quick flow
        setTimeout(() => this.itemSearchInput?.nativeElement?.focus?.(), 0);
      },
      error: _ => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to create item.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // ---------------- Final save (Convert) ----------------

  saveRequest() {
    if (this.tempDraftId) {
      this.draft.promote(this.tempDraftId, this.userId).subscribe({
        next: (res: any) => {
          const newPrId = res?.data ?? res;
          Swal.fire({
            icon: 'success',
            title: 'Converted',
            text: 'Draft converted to Purchase Request.',
            confirmButtonColor: '#0e3a4c'
          }).then(() => this.router.navigate(['/purchase/list-PurchaseRequest']));
        },
        error: _ => Swal.fire({
          icon: 'error',
          title: 'Convert Failed',
          text: 'Try again.',
          confirmButtonColor: '#0e3a4c'
        })
      });
      return;
    }

    const strippedLines = this.prLines.map(l => {
      const { filteredItems, filteredUoms, filteredLocations, dropdownOpen, uomDropdownOpen, locationDropdownOpen, isDraft, ...rest } = l;
      return rest;
    });

    const payload: any = {
      id: this.prHeader.id || 0,
      requester: this.prHeader.requester,
      departmentID: this.prHeader.departmentID,
      deliveryDate: this.prHeader.neededBy,
      description: this.prHeader.description,
      multiLoc: this.prHeader.multiLoc,
      oversea: this.prHeader.oversea,
      PurchaseRequestNo: '',
      CreatedBy: '1',
      UpdatedBy: '1',
      IsActive: true,
      Status: 1,
      prLines: JSON.stringify(strippedLines)
    };

    if (payload.id > 0) {
      this.purchaseService.update(payload.id, payload).subscribe({
        next: (res: any) => {
          Swal.fire({ icon: 'success', title: 'Updated', text: res?.message || 'Updated successfully', confirmButtonColor: '#0e3a4c' });
          this.draft.clear();
          this.loadRequests();
          this.resetForm();
          this.updateBaseline();
          this.router.navigate(['/purchase/list-PurchaseRequest']);
        },
        error: (err: any) => console.error(err)
      });
    } else {
      this.purchaseService.create(payload).subscribe({
        next: (res: any) => {
          Swal.fire({ icon: 'success', title: 'Created', text: res?.message || 'Created successfully', confirmButtonColor: '#0e3a4c' });
          this.draft.clear();
          this.loadRequests();
          this.resetForm();
          this.updateBaseline();
          this.router.navigate(['/purchase/list-PurchaseRequest']);
        },
        error: (err: any) => console.error(err)
      });
    }
  }

resetForm() {
  this.prHeader = {
    id: 0,
    requester: '',
    departmentID: 0,
    neededBy: null,
    description: '',
    multiLoc: false,
    oversea: false
  };

  // ✅ re-apply requester default
  this.applyRequesterDefault();

  this.searchText = '';
  this.dropdownOpen = false;
  this.prLines = [];
  this.prStep = 0;

  // ✅ if departments already loaded, bind dept again
  this.applyDepartmentFromTeams();
}


  editRequest(res: any) {
    const data = res.data;
    this.prHeader = {
      id: data.id,
      requester: data.requester,
      departmentID: this.toNum(data.departmentID),
      neededBy: data.deliveryDate ? String(data.deliveryDate).split('T')[0] : null,
      description: data.description,
      multiLoc: data.multiLoc,
      oversea: data.oversea,
      purchaseRequestNo: data.purchaseRequestNo
    };

    this.headerLoaded = true;
    this.resolveDepartmentName();

    try { this.prLines = data.prLines ? JSON.parse(data.prLines) : []; }
    catch { this.prLines = []; }
  }

  goToPurchaseRequest() {
    this.router.navigateByUrl('/purchase/list-PurchaseRequest');
  }

  get totalQty(): number {
    return (this.prLines || []).reduce((sum: number, l: any) => {
      const q = Number(l?.qty) || 0;
      return sum + q;
    }, 0);
  }

  // ---------------- Add Location modal helpers ----------------

  openAddLocationModal() {
    this.showAddLocationModal = true;
  }

  closeAddLocationModal() {
    this.showAddLocationModal = false;
    this.newLocation = {};  // reset on close
    this.StateList = [];
    this.CityList = [];
  }

  onCountryChange(selectedCountryId: any) {
    const countryId = Number(selectedCountryId);
    if (countryId) {
      this.getAllState(countryId);
      this.newLocation.stateId = null;
    } else {
      this.StateList = [];
    }
  }

  onStateChange(selectedStateId: any) {
    const stateId = Number(selectedStateId);
    if (stateId) {
      this.getAllCities(stateId);
      this.newLocation.cityId = null;
    } else {
      this.CityList = [];
    }
  }

  getAllCities(stateId: number) {
    this._cityService.GetCityWithStateId(stateId).subscribe((res: any) => {
      this.CityList = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : []);
    });
  }

  getAllCountries() {
    this._countriesService.getCountry().subscribe((response: any) => {
      this.countries = response?.data ?? [];
    });
  }

  getAllState(countryId: number) {
    this._cityService.GetStateWithCountryId(countryId).subscribe((res: any) => {
      this.StateList = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : []);
    });
  }

  private validateNewLocation(): string | null {
    const n = (this.newLocation?.name ?? '').trim();
    if (!n) return 'Location Name is required.';
    if (!this.newLocation?.countryId) return 'Country is required.';
    if (!this.newLocation?.stateId) return 'State is required.';
    if (!this.newLocation?.cityId) return 'City is required.';
    return null;
  }

  // Submit new location
  submitNewLocation(): void {
    const err = this.validateNewLocation();
    if (err) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: err,
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    const payload = {
      name: (this.newLocation.name ?? '').trim(),
      contactNumber: (this.newLocation.contactNumber ?? '').trim() || null,
      latitude: (this.newLocation.latitude ?? '').trim() || null,
      longitude: (this.newLocation.longitude ?? '').trim() || null,
      countryId: this.toNum(this.newLocation.countryId),
      stateId: this.toNum(this.newLocation.stateId),
      cityId: this.toNum(this.newLocation.cityId),
      createdBy: this.userId,
      createdDate: new Date(),
      isActive: true
    };

    this.locationService.insertLocation(payload).subscribe({
      next: async (res: any) => {
        // 1) new DB id from response
        const newId = this.toNum(res?.data?.id ?? res?.id);

        // 2) reload canonical list from server
        await this.reloadLocationList();

        // 3) find newly created row in refreshed list
        const canonical = this.locationList.find(l => this.getId(l) === newId)
                        ?? { ...payload, id: newId };

        // 4) set it into the PR line modal Location field
        this.applyLocationToActiveLine(canonical);

        // keep the modal’s filtered list fresh
        this.modalLine.filteredLocations = [canonical, ...this.locationList];

        Swal.fire({
          icon: 'success',
          title: 'Created!',
          text: 'Location created successfully.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0e3a4c'
        });

        // 5) reset + close
        this.newLocation = {};
        this.closeAddLocationModal();
      },
      error: _ => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to create location.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
  private norm(v: any): string {
  return (v ?? '').toString().trim().toLowerCase();
}

private findSameItemLocationIndex(line: any): number {
  const itemKey = this.norm(line?.itemCode || line?.itemSearch);
  const locKey  = this.norm(line?.location || line?.locationSearch);

  if (!itemKey || !locKey) return -1;

  return (this.prLines || []).findIndex((x: any) => {
    const xItemKey = this.norm(x?.itemCode || x?.itemSearch);
    const xLocKey  = this.norm(x?.location || x?.locationSearch);
    return xItemKey === itemKey && xLocKey === locKey && !x?.isDraft;
  });
}

}
