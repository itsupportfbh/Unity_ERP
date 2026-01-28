import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-financereports',
  templateUrl: './financereports.component.html',
  styleUrls: ['./financereports.component.scss']
})
export class FinancereportsComponent implements OnInit {
  selectedReport: string | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {}

  setAndGo(code: string): void {
    // 1) set color
    this.selectedReport = code;

    // 2) navigate
    switch (code) {
      case 'pl':
        this.router.navigate(['/financial/profitloss']);
        break;
      case 'bs':
        this.router.navigate(['/financial/balance-sheet']);
        break;
      case 'aging':
        this.router.navigate(['/financial/aging']);
        break;
      case 'gst':
        this.router.navigate(['/financial/Gst-report']);
        break;
      case 'cf':
        this.router.navigate(['/financial/forecast']);
        break;
      case 'daybook':
        this.router.navigate(['/financial/daybook']);
        break;
    }
  }
}
