import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-rfq',
  templateUrl: './rfq.component.html',
  styleUrls: ['./rfq.component.scss']
})
export class RfqComponent implements OnInit {

  rfqSuppliers: string[] = [];
  rfqSupplierText: string = '';

  rfqItems: Array<{ item: string, qty: number }> = [
    { item: 'Item A', qty: 10 },
    { item: 'Item B', qty: 20 },
    { item: 'Item C', qty: 15 }
  ];

  quotePrices: { [supplier: string]: { [itemIndex: number]: number } } = {};

  constructor() { }

  ngOnInit(): void {
  }

  addRfqSupplier(): void {
    const name = this.rfqSupplierText.trim();
    if (name && !this.rfqSuppliers.includes(name)) {
      this.rfqSuppliers.push(name);
      this.rfqSupplierText = '';
    }
  }

  removeRfqSupplier(index: number): void {
    const removedSupplier = this.rfqSuppliers[index];
    this.rfqSuppliers.splice(index, 1);
    delete this.quotePrices[removedSupplier];
  }

  setQuotePrice(supplier: string, itemIndex: number, value: string): void {
    const price = parseFloat(value);
    if (!this.quotePrices[supplier]) {
      this.quotePrices[supplier] = {};
    }
    this.quotePrices[supplier][itemIndex] = price;
  }

  notify(msg: string): void {
    alert(msg);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
