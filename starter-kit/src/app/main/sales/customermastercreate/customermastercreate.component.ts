import { Component, OnInit, ViewEncapsulation } from '@angular/core';
export interface Customer {
  id?: string;
  name: string;
  kycStatus: 'Pending'|'Verified';
  creditLimit: number;
  priceLevel?: string;
  terms?: string;
  contacts: { name: string; phone?: string; email?: string; role?: string; }[];
}
@Component({
  selector: 'app-customermastercreate',
  templateUrl: './customermastercreate.component.html',
  styleUrls: ['./customermastercreate.component.scss'],
  encapsulation:ViewEncapsulation.None
})

export class CustomermastercreateComponent implements OnInit {
  
 list: Customer[] = [
    { name: 'Acme Pte Ltd', kycStatus: 'Verified', creditLimit: 20000, priceLevel: 'Standard', terms: '30 Days', contacts: [{name:'Ivy', email:'ivy@acme.com'}] },
    { name: 'Beta Foods', kycStatus: 'Pending', creditLimit: 5000, priceLevel: 'Wholesale', terms: 'COD', contacts: [] }
  ];
  selected?: Customer;
  editing: Customer = { name: '', kycStatus: 'Pending', creditLimit: 0, contacts: [] };

  select(c: Customer) { this.selected = c; this.editing = JSON.parse(JSON.stringify(c)); }
  new() { this.selected = undefined; this.editing = { name:'', kycStatus:'Pending', creditLimit:0, contacts: [] }; }
  save() {
    if (this.selected) Object.assign(this.selected, this.editing);
    else this.list = [this.editing, ...this.list];
  }
  constructor() { }

  ngOnInit(): void {
  }

}
