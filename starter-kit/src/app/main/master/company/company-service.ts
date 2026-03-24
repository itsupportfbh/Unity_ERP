import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface GeneralDto {
  code: string;
  name: string;
  legalName?: string;
  registrationNo?: string;
  status?: string;
  phone?: string;
  email?: string;
  website?: string;
  country?: string;
  contactPerson?: string;
  contactMobileNo?: string;
  contactEmail?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postal?: string;
}

export interface FinanceTaxDto {
  baseCurrency: string;
  country?: string;
  taxMode?: string;
  gstNo?: string;
  filingFrequency?: string;
  defaultOutputTaxCode?: string;
  defaultInputTaxCode?: string;
  decimalPlaces: number;
  roundingRule?: string;
}

export interface DefaultsDto {
  defaultBranch?: string;
  defaultWarehouse?: string;
  defaultBin?: string;
  defaultLanguage?: string;
  timeZone?: string;
}

export interface NumberSeriesDto {
  document: string;
  prefix?: string;
  nextNo: number;
  reset: boolean;
}

export interface IntegrationsDto {
  whatsapp: boolean;
  smtp: boolean;
  ocr: boolean;
  apiEndpoint?: string;
  apiKey?: string;
}

export interface InitialAdminUserDto {
  username: string;
  email: string;
  password: string;
  departmentId: number;
  locationId: number;
}

export interface CreateCompanySetupPayload {
  general: GeneralDto;
  financeTax: FinanceTaxDto;
  defaults: DefaultsDto;
  numberSeries: NumberSeriesDto[];
  integrations: IntegrationsDto;
  initialAdminUser: InitialAdminUserDto;
  logoBase64: string | null;
}

export interface CreateCompanySetupResponse {
  organizationId: number;
  databaseName: string;
  message: string;
}
export interface CompanyRow {
  id: number;
  orgGuid: string;
  companyCode: string;
  companyName: string;
  legalName?: string;
  baseCurrency: string;
  country: string;
  adminUsername: string;
  adminEmail: string;
  isActive: boolean;
  createdDate?: string;
  createdBy?: string;
  roleName?: string;
  isDefault?: boolean;
  isOwner?: boolean;
  approvalLevelName?: string;
}
export interface CompanySetupDetailDto {
  id: number;
  orgGuid?: string | null;

  general: {
    code: string;
    name: string;
    legalName: string;
    registrationNo: string;
    status: string;
    phone: string;
    email: string;
    website: string;
    country: string;
    contactPerson: string;
    contactMobileNo: string;
    contactEmail: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postal: string;
  };

  financeTax: {
    baseCurrency: string;
    country: string;
    taxMode: string;
    gstNo: string;
    filingFrequency: string;
    defaultOutputTaxCode: string;
    defaultInputTaxCode: string;
    decimalPlaces: number;
    roundingRule: string;
  };

  defaults: {
    defaultBranch: string;
    defaultWarehouse: string;
    defaultBin: string;
    defaultLanguage: string;
    timeZone: string;
  };

  numberSeries: Array<{
    document: string;
    prefix: string;
    nextNo: number;
    reset: boolean;
  }>;

  integrations: {
    whatsapp: boolean;
    smtp: boolean;
    ocr: boolean;
    apiEndpoint: string;
    apiKey: string;
  };

  initialAdminUser: {
    username: string;
    email: string;
    password?: string;
    departmentId: number | null;
    locationId: number | null;
  };

  logoBase64?: string | null;
  lastUpdatedBy?: string | null;
  lastUpdatedAt?: string | null;
  auditTrail?: Array<{ date: string; user: string; change: string }>;
}
@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createCompany(payload: CreateCompanySetupPayload): Observable<CreateCompanySetupResponse> {
    return this.http.post<CreateCompanySetupResponse>(
      `${this.baseUrl}/organizations/create-from-company-setup`,
      payload
    );
  }
   getCompanyList(approvalLevelName: string, orgGuid: string): Observable<CompanyRow[]> {
  return this.http.get<CompanyRow[]>(`${this.baseUrl}/Company/list`, {
    params: {
      approvalLevelName: approvalLevelName || '',
      orgGuid: orgGuid || ''
    }
  });
}
  getCompanyById(id: number): Observable<CompanySetupDetailDto> {
    return this.http.get<CompanySetupDetailDto>(`${this.baseUrl}/Company/${id}`);
  }
  updateCompany(id: number, payload: CreateCompanySetupPayload): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/Company/${id}`, payload);
  }
   deleteCompany(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/Company/${id}`);
  }
}