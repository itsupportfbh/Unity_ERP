import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-arap-aging',
  templateUrl: './ap-aging.component.html',
  styleUrls: ['./ap-aging.component.scss']
})
export class ArApAgingComponent implements OnInit {

 
   activeTab: 'ar-aging' | 'ap-aging' = 'ar-aging';
 
   constructor(private route: ActivatedRoute) {}
 
   ngOnInit(): void {
     this.route.queryParamMap.subscribe(params => {
       const tab = params.get('tab') as 'ar-aging' | 'ap-aging' | null;
       if (tab) {
         this.activeTab = tab;
       }
     });
   }
 
   setTab(tab: 'ar-aging' | 'ap-aging') {
     this.activeTab = tab;
   }

}
