// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute } from '@angular/router';
// import { SalesOrderService } from '../../sales-order/sales-order.service';

// @Component({
//   selector: 'app-so-quick-view',
//   templateUrl: './so-quick-view.component.html',
//   styleUrls: ['./so-quick-view.component.scss']
// })
// export class SoQuickViewComponent implements OnInit {

//   hdr: any; lines: any[] = [];
//   constructor(private route: ActivatedRoute, private so: SalesOrderService) {}
//   ngOnInit() {
//     debugger
//     const id = Number(this.route.snapshot.paramMap.get('id'));
//     if (!id) return;
//     this.so.getSOById(id).subscribe(res => {
//       const data = res?.data ?? res;
//       this.hdr   = data;
//       this.lines = data?.lineItems ?? data?.lines ?? [];
//     });
//   }

// }
