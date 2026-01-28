import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ChartofaccountService } from '../../chartofaccount/chartofaccount.service';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { OpeningBalanceService } from '../opening-balance-service/opening-balance.service';

@Component({
  selector: 'app-opening-balance',
  templateUrl: './opening-balance.component.html',
  styleUrls: ['./opening-balance.component.scss']
})
export class OpeningBalanceComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('openingBalanceForm') openingBalanceForm!: NgForm;

  parentHeadList: Array<{ value: number; label: string }> = [];

  public id = 0;
  public openingBalanceAmount = '';
  public isDisplay = false;
  public modeHeader = 'Add openingBalance';
  public resetButton = true;
  public isEditMode = false;

  // IMPORTANT: keep this as number | null
  budgetLine: number | null = null;

  rows: any[] = [];
  tempData: any[] = [];
  openingBalanceList: any[] = [];

  constructor(
    private coaService: ChartofaccountService,
    private _openingBalanceService: OpeningBalanceService
  ) {}

  ngOnInit(): void {
    this.loadAccountHeads();
    this.getAllopeningBalance();
  }

  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { feather.replace(); }

  cancel() {
    this.isDisplay = false;
    this.isEditMode = false;
  }

  createopeningBalance() {
    this.isDisplay = true;
    this.modeHeader = 'Add openingBalance';
    this.reset();
  }

  // =========================
  // Load Chart of Accounts
  // =========================
  loadAccountHeads(): void {
    this.coaService.getAllChartOfAccount().subscribe((res: any) => {
      const data = (res?.data || []).filter((x: any) => x.isActive === true);

      this.parentHeadList = data.map((head: any) => ({
        value: Number(head.id),
        label: this.buildFullPath(head, data)
      }));

      // Debug if needed
      console.log('parentHeadList', this.parentHeadList);
    });
  }

  /** Build breadcrumb like: Parent >> Child >> This */
  private buildFullPath(item: any, all: any[]): string {
    let path = item.headName;
    let current = all.find((x: any) => x.headCode === item.parentHead);
    while (current) {
      path = `${current.headName} >> ${path}`;
      current = all.find((x: any) => x.headCode === current.parentHead);
    }
    return path;
  }

  reset() {
    this.modeHeader = 'Create openingBalance';
    this.openingBalanceAmount = '';
    this.id = 0;
    this.budgetLine = null;     // clear selection
    this.isEditMode = false;
    this.resetButton = true;

    if (this.openingBalanceForm) {
      this.openingBalanceForm.resetForm();
    }
  }

  // =========================
  // Opening Balance list
  // =========================
  getAllopeningBalance() {
    this._openingBalanceService.getOpeningBalance().subscribe((response: any) => {
      this.openingBalanceList = response.data || [];
      this.tempData = [...this.openingBalanceList];
    });
  }

  // =========================
  // Create / Update
  // =========================
  CreateopeningBalance() {
    if (!this.openingBalanceForm?.valid) {
      return;
    }

    const obj = {
      id: this.id,
      openingBalanceAmount: Number(this.openingBalanceAmount || 0),
      budgetLineId: this.budgetLine,      // number | null
      createdBy: '1',
      createdDate: new Date(),
      updatedBy: '1',
      updatedDate: new Date(),
      isActive: true
    };

    const req$ = this.id === 0
      ? this._openingBalanceService.insertOpeningBalance(obj)
      : this._openingBalanceService.updateOpeningBalance(obj);

    req$.subscribe((res: any) => {
      if (res.isSuccess) {
        Swal.fire({
          title: 'Hi',
          text: res.message,
          icon: 'success',
          allowOutsideClick: false
        });
        this.getAllopeningBalance();
        this.isDisplay = false;
        this.isEditMode = false;
      }
    });
  }

  // =========================
  // Edit
  // =========================
  getopeningBalanceDetails(id: number) {
    this._openingBalanceService.getOpeningBalanceById(id).subscribe((arg: any) => {
      const s = arg.data;
      this.id = s.id;
      this.openingBalanceAmount = String(s.openingBalanceAmount ?? '');
      this.budgetLine = s.budgetLineId != null ? Number(s.budgetLineId) : null;

      this.isDisplay = true;
      this.resetButton = false;
      this.modeHeader = 'Edit openingBalance';
      this.isEditMode = true;
    });
  }

  // =========================
  // Delete
  // =========================
  deleteopeningBalance(id: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#7367F0',
      cancelButtonColor: '#E42728',
      confirmButtonText: 'Yes, Delete it!',
      customClass: { confirmButton: 'btn btn-primary', cancelButton: 'btn btn-danger ml-1' },
      allowOutsideClick: false
    }).then((result) => {
      if (result.value) {
        this._openingBalanceService.deleteOpeningBalance(id).subscribe((response: any) => {
          Swal.fire({
            icon: response.isSuccess ? 'success' : 'error',
            title: response.isSuccess ? 'Deleted!' : 'Error!',
            text: response.message,
            allowOutsideClick: false
          });
          this.getAllopeningBalance();
        });
      }
    });
  }
}
