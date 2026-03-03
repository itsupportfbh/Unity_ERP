import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

type CompanyTab =
  | 'general'
  | 'financeTax'
  | 'defaults'
  | 'numberSeries'
  | 'integrations'
  | 'audit';

interface NumberSeriesRow {
  document: string;
  prefix: string;
  nextNo: number;
  reset: boolean;
}

@Component({
  selector: 'app-company-create',
  templateUrl: './company-create.component.html',
  styleUrls: ['./company-create.component.scss']
})
export class CompanyCreateComponent implements OnInit {
  activeTab: CompanyTab = 'general';

  readonly tabsOrder: CompanyTab[] = [
    'general',
    'financeTax',
    'defaults',
    'numberSeries',
    'integrations',
    'audit'
  ];

  generalForm!: FormGroup;
  financeForm!: FormGroup;
  defaultsForm!: FormGroup;
  integrationForm!: FormGroup;

  logoPreview: string | null = null;

  numberSeries: NumberSeriesRow[] = [
    { document: 'Sales Invoice', prefix: 'SI', nextNo: 123, reset: true },
    { document: 'Purchase Invoice (PIN)', prefix: 'PIN', nextNo: 88, reset: true },
    { document: 'Delivery Order', prefix: 'DO', nextNo: 441, reset: false }
  ];

  lastUpdatedBy = 'Admin';
  lastUpdatedAt = '2026-02-27 18:20';
  auditTrail = [
    { date: '2026-02-21', user: 'Admin', change: 'Updated theme / defaults' },
    { date: '2026-02-22', user: 'Admin', change: 'Updated theme / defaults' },
    { date: '2026-02-23', user: 'Admin', change: 'Updated theme / defaults' }
  ];

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.generalForm = this.fb.group({
      code: ['FBH', [Validators.required]],
      name: ['FBH Foods', [Validators.required]],
      legalName: ['FBH Foods Pte Ltd'],
      registrationNo: ['2019XXXXXX'],
      status: ['Active'],
      phone: ['+65 6XXX XXXX'],
      email: ['finance@fbh.com.sg'],
      website: ['fbh.com.sg'],

      contactPerson: [''],
      contactMobileNo: [''],
      contactEmail: [''],

      address1: [''],
      address2: [''],
      city: [''],
      state: [''],
      postal: ['']
    });

    this.financeForm = this.fb.group({
      baseCurrency: ['SGD'],
      country: ['Singapore'],
      taxMode: ['Exclusive'],
      gstNo: [''],
      filingFrequency: ['Monthly'],
      defaultOutputTaxCode: ['SR (Standard Rated)'],
      defaultInputTaxCode: ['TX (Input Tax)'],
      decimalPlaces: [2],
      roundingRule: ['Round half up']
    });

    this.defaultsForm = this.fb.group({
      defaultBranch: ['Head Office'],
      defaultWarehouse: ['Central'],
      defaultBin: ['MAIN'],
      defaultLanguage: ['EN'],
      timeZone: ['Asia/Singapore']
    });

    this.integrationForm = this.fb.group({
      whatsapp: [true],
      smtp: [true],
      ocr: [false],
      apiEndpoint: [''],
      apiKey: ['']
    });
  }

  setTab(tab: CompanyTab): void {
    this.activeTab = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isFirstTab(): boolean {
    return this.tabsOrder.indexOf(this.activeTab) === 0;
  }

  isLastTab(): boolean {
    return this.tabsOrder.indexOf(this.activeTab) === this.tabsOrder.length - 1;
  }

  goPrev(): void {
    const idx = this.tabsOrder.indexOf(this.activeTab);
    if (idx <= 0) return;
    this.setTab(this.tabsOrder[idx - 1]);
  }

  goNext(): void {
    const idx = this.tabsOrder.indexOf(this.activeTab);
    if (idx >= this.tabsOrder.length - 1) return;
    this.setTab(this.tabsOrder[idx + 1]);
  }

  onLogoPicked(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => (this.logoPreview = String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.logoPreview = null;
  }

  addNumberRow(): void {
    this.numberSeries.push({ document: '', prefix: '', nextNo: 1, reset: false });
  }

  removeNumberRow(i: number): void {
    this.numberSeries.splice(i, 1);
  }

  save(): void {
    const payload = {
      general: this.generalForm.value,
      financeTax: this.financeForm.value,
      defaults: this.defaultsForm.value,
      numberSeries: this.numberSeries,
      integrations: this.integrationForm.value,
      logoBase64: this.logoPreview
    };

    console.log('SAVE COMPANY', payload);
  }

  cancel(): void {
    this.router.navigate(['/master']);
  }
}