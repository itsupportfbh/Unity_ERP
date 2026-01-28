import { Component, OnInit } from '@angular/core';
interface ARRow { docNo: string; customer: string; dueDate: string; amount: number; dunning: number;}
@Component({
  selector: 'app-collectionscreate',
  templateUrl: './collectionscreate.component.html',
  styleUrls: ['./collectionscreate.component.scss']
})
 
export class CollectionscreateComponent implements OnInit {
 rows: ARRow[] = [
    { docNo:'SI-0008', customer:'Acme', dueDate:'2025-09-30', amount: 3200, dunning: 1 },
    { docNo:'SI-0012', customer:'Beta', dueDate:'2025-09-25', amount: 980, dunning: 2 },
  ];
  sendPaymentLink(r: ARRow){}
  matchBankFeed(r: ARRow){}
  ngOnInit(): void {
    
  }
}
