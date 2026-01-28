import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { RecipemasterserviceService } from '../recipemasterservice.service';

@Component({
  selector: 'app-recipe-master-list',
  templateUrl: './recipe-master-list.component.html',
  styleUrls: ['./recipe-master-list.component.scss'],
  encapsulation:ViewEncapsulation.None
})
export class RecipeMasterListComponent implements OnInit {

  rows: any[] = [];
  tempRows: any[] = [];

  selectedOption = 10;
  searchValue = '';

  // modal
  showLinesModal = false;
  selectedLines: any[] = [];

  constructor(
    private router: Router,
    private recipeSrv: RecipemasterserviceService
  ) {}

  ngOnInit(): void {
    this.loadList();
  }

  loadList(): void {
    // API should return list of recipes (header)
    this.recipeSrv.listRecipes().subscribe({
      next: (res: any) => {
        const data = res?.data ?? res ?? [];
        this.rows = Array.isArray(data) ? data : [];
        this.tempRows = [...this.rows];
      },
      error: (e) => console.error(e)
    });
  }

  onLimitChange(e: any): void {
    this.selectedOption = Number(e?.target?.value || 10);
  }

  filterUpdate(event: any): void {
    const val = (event?.target?.value || '').toLowerCase();
    this.searchValue = event?.target?.value || '';

    if (!val) {
      this.rows = [...this.tempRows];
      return;
    }

    this.rows = this.tempRows.filter((d: any) => {
      const code = String(d.code ?? '').toLowerCase();
      const name = String(d.name ?? d.finishedItemName ?? '').toLowerCase();
      const cuisine = String(d.cuisine ?? '').toLowerCase();
      const status = String(d.status ?? '').toLowerCase();
      return code.includes(val) || name.includes(val) || cuisine.includes(val) || status.includes(val);
    });
  }

  goToCreate(): void {
    this.router.navigate(['/Recipe/recipecreate']); // adjust route
  }

  editRecipe(id: number): void {
    this.router.navigate(['/Recipe/recipeedit', id]); // adjust route
  }

  deleteRecipe(id: number): void {
    Swal.fire({
      title: 'Delete?',
      text: 'This recipe will be removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete'
    }).then(r => {
      if (!r.isConfirmed) return;

      this.recipeSrv.deleteRecipe(id).subscribe({
        next: () => {
          Swal.fire('Deleted', 'Recipe deleted', 'success');
          this.loadList();
        },
        error: (e) => {
          console.error(e);
          Swal.fire('Error', 'Delete failed', 'error');
        }
      });
    });
  }

  // ========== Lines modal ==========
  openLinesModal(row: any): void {
    const id = Number(row?.id || 0);
    if (!id) return;

    // If your list API already returns ingredients, you can skip this call
    this.recipeSrv.getRecipeById(id).subscribe({
      next: (res: any) => {
        const dto = res?.data ?? res ?? {};
        this.selectedLines = dto?.ingredients ?? dto?.ingredientLines ?? [];
        this.showLinesModal = true;
      },
      error: (e) => console.error(e)
    });
  }

  closeLinesModal(): void {
    this.showLinesModal = false;
    this.selectedLines = [];
  }
}
