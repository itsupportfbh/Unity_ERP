import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SmartSearchResponse, SmartSearchResult, SmartSearchService } from './smart-search.service';

@Component({
  selector: 'app-smart-search',
  templateUrl: './smart-search.component.html',
  styleUrls: ['./smart-search.component.scss']
})
export class SmartSearchComponent implements OnInit {
  query = '';
  module = 'All';
  loading = false;
  error = '';
  response: SmartSearchResponse = { query: '', totalCount: 0, results: [] };

  modules = ['All', 'Purchase', 'Sales', 'Inventory', 'Master'];

  constructor(
    private service: SmartSearchService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q') || '';
    const module = this.route.snapshot.queryParamMap.get('module') || 'All';
    this.query = q;
    this.module = this.modules.includes(module) ? module : 'All';

    if (this.query.trim().length >= 2) {
      this.search();
    }
  }

  search(): void {
    const q = this.query.trim();
    if (q.length < 2) {
      this.response = { query: q, totalCount: 0, results: [] };
      this.error = 'Minimum 2 characters type pannunga.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.service.search(q, this.module).subscribe({
      next: res => {
        this.response = res || { query: q, totalCount: 0, results: [] };
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.message || err?.message || 'Search failed.';
        this.loading = false;
      }
    });
  }

  open(row: SmartSearchResult): void {
    if (row?.route) {
      this.router.navigateByUrl(row.route);
    }
  }

  money(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    return Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  date(value: string | undefined): string {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
  }

  trackByResult(_: number, row: SmartSearchResult): string {
    return `${row.module}-${row.documentType}-${row.id}`;
  }
}
