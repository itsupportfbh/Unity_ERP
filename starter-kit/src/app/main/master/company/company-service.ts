import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CompanyDetail, CompanyListItem } from './company-model';


@Injectable({ providedIn: 'root' })
export class CompanyService {

  private list: CompanyListItem[] = [
    { id: 1, code: 'FBH', name: 'FBH Foods', currency: 'SGD', status: 'Active' },
    { id: 2, code: 'ALF', name: 'ALFA Outlet', currency: 'INR', status: 'Inactive' }
  ];

  private details: Record<number, CompanyDetail> = {
    1: {
      id: 1,
      code: 'FBH',
      name: 'FBH Foods',
      legalName: 'FBH Foods Pte Ltd',
      registrationNo: '2019XXXXXX',
      status: 'Active',
      phone: '+65 6XXX XXXX',
      email: 'finance@fbh.com.sg',
      website: 'fbh.com.sg',
      address1: '10 Anson Rd',
      address2: '#10-11',
      city: 'Singapore',
      state: '-',
      postal: '079903',
      logoBase64: '',

      financeTax: {
        baseCurrency: 'SGD',
        country: 'Singapore',
        taxMode: 'Exclusive',
        gstVatNo: 'GST-XXXXXXX',
        filingFrequency: 'Monthly',
        defaultOutputTaxCode: 'SR (Standard Rated)',
        defaultInputTaxCode: 'TX (Input Tax)',
        decimalPlaces: 2,
        roundingRule: 'Round half up'
      },

      defaults: {
        defaultBranch: 'Head Office',
        defaultWarehouse: 'Central',
        defaultBin: 'MAIN',
        defaultLanguage: 'EN',
        timeZone: 'Asia/Singapore'
      },

      numberSeries: [
        { id: 1, docType: 'Sales Invoice', prefix: 'SI', nextNo: 123, resetYearly: true },
        { id: 2, docType: 'Purchase Invoice (PIN)', prefix: 'PIN', nextNo: 88, resetYearly: true },
        { id: 3, docType: 'Delivery Order', prefix: 'DO', nextNo: 441, resetYearly: false }
      ],

      integrations: {
        whatsappEnabled: true,
        emailEnabled: true,
        ocrEnabled: false,
        bankFeedsEnabled: false,
        apiEndpoint: 'https://api.provider.com',
        apiKey: '********'
      },

      lastUpdatedBy: 'Admin',
      lastUpdatedAt: '2026-02-27 18:20',

      auditTrail: [
        { date: '2026-02-21', user: 'Admin', change: 'Updated theme / defaults' },
        { date: '2026-02-22', user: 'Admin', change: 'Updated theme / defaults' },
        { date: '2026-02-23', user: 'Admin', change: 'Updated theme / defaults' }
      ]
    },
    2: {
      id: 2,
      code: 'ALF',
      name: 'ALFA Outlet',
      legalName: 'ALFA Outlet',
      registrationNo: '2020XXXXXX',
      status: 'Inactive',
      phone: '',
      email: '',
      website: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postal: '',
      logoBase64: '',
      financeTax: {
        baseCurrency: 'INR',
        country: 'India',
        taxMode: 'Exclusive',
        gstVatNo: '',
        filingFrequency: 'Monthly',
        defaultOutputTaxCode: '',
        defaultInputTaxCode: '',
        decimalPlaces: 2,
        roundingRule: 'Round half up'
      },
      defaults: { defaultLanguage: 'EN', timeZone: 'Asia/Kolkata' },
      numberSeries: [],
      integrations: { whatsappEnabled: false, emailEnabled: false, ocrEnabled: false, bankFeedsEnabled: false },
      lastUpdatedBy: 'Admin',
      lastUpdatedAt: '2026-02-25 10:05',
      auditTrail: []
    }
  };

  getCompanies(): Observable<CompanyListItem[]> {
    return of(this.list).pipe(delay(150));
  }

  getCompanyDetail(id: number): Observable<CompanyDetail> {
    return of(this.details[id]).pipe(delay(150));
  }

  // mock save
  saveCompanyDetail(dto: CompanyDetail): Observable<any> {
    this.details[dto.id] = { ...dto };
    return of({ ok: true }).pipe(delay(200));
  }
}