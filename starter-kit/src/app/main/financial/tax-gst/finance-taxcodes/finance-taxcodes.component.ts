import { Component, OnInit } from '@angular/core';
import { TaxCodeService } from 'app/main/master/taxcode/taxcode.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-finance-taxcodes',
  templateUrl: './finance-taxcodes.component.html',
  styleUrls: ['./finance-taxcodes.component.scss']
})
export class FinanceTaxcodesComponent implements OnInit {

  rows: any[] = [];

  // TypeId → text (for listing)
  taxTypes: { id: number; name: string }[] = [
    { id: 1, name: 'Input' },
    { id: 2, name: 'Output' }
  ];

  // Level → text (if you later store level in DB)
  levelMap: { id: number; name: string }[] = [
    { id: 1, name: 'Line' },
    { id: 2, name: 'Invoice' },
    { id: 3, name: 'Line / Invoice' }
  ];

  // ---------- Modal state + form model ----------
  isTaxModalOpen = false;

  // For dropdown inside modal (label text)
  taxTypeOptions = [
    { id: 1, label: 'Input GST' },
    { id: 2, label: 'Output GST' }
  ];

  newTax: {
    name: string;
    description: string;
    typeId: number | null;
    rate: number | null;
    levelId: number | null;
  } = {
    name: '',
    description: '',
    typeId: null,
    rate: null,
    levelId: 1        // default Line Level
  };

  constructor(private taxCodeService: TaxCodeService) {}

  ngOnInit(): void {
    this.loadTaxCodes();
  }

  loadTaxCodes(): void {
    this.taxCodeService.getTaxCode().subscribe((res: any) => {
      this.rows = res?.data || [];
    });
  }

  getTypeName(typeId: number): string {
    const found = this.taxTypes.find(t => t.id === typeId);
    return found ? found.name : '-';
  }

  getLevelName(level: number | string): string {
    if (typeof level === 'string') {
      return level; // if API already sends "Line / Invoice"
    }
    const found = this.levelMap.find(l => l.id === level);
    return found ? found.name : '-';
  }

  // ---------- Modal handlers ----------
  openNewTaxModal(): void {
    this.newTax = {
      name: '',
      description: '',
      typeId: null,
      rate: null,
      levelId: 1
    };
    this.isTaxModalOpen = true;
  }

  closeNewTaxModal(): void {
    this.isTaxModalOpen = false;
  }

saveTaxCode(): void {
  if (!this.newTax.name || !this.newTax.typeId || this.newTax.rate == null) {
    Swal.fire({
      icon: 'warning',
      title: 'Missing details',
      text: 'Name, Type and Rate are required.',
      confirmButtonColor: '#2E5F73'
    });
    return;
  }

  const payload: any = {
    name: this.newTax.name,
    description: this.newTax.description,
    typeId: this.newTax.typeId,
    rate: this.newTax.rate,
    level: this.newTax.levelId,
    createdBy: '1',
    createdDate: new Date(),
    updatedBy: '1',
    updatedDate: new Date(),
    isActive: true
  };

  this.taxCodeService.insertTaxCode(payload).subscribe({
    next: (res: any) => {
      this.isTaxModalOpen = false;
      this.loadTaxCodes();

      Swal.fire({
        icon: 'success',
        title: 'Saved',
        text: 'Tax code saved successfully.',
        timer: 1500,
        showConfirmButton: false
      });
    },
    error: err => {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save tax code.',
        confirmButtonColor: '#2E5F73'
      });
    }
  });
}

}
