import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import { StockIssueService } from './stock-issue.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-stock-issue',
  templateUrl: './stock-issue.component.html',
  styleUrls: ['./stock-issue.component.scss']
})
export class StockIssueComponent implements OnInit,AfterViewInit {
@ViewChild('addForm') addForm!: NgForm;
   StockissueList: any[] = [];
   StockissueName: string = '';
   description: string = '';
   isEditMode = false;
   selectedStockissue: any = null;
   public isDisplay = false;
   private iconsReplaced = false;
   userId: string;
   constructor(private fb: FormBuilder,
     private StockissueService: StockIssueService,) {
        this.userId = localStorage.getItem('id');
      }
 
   ngOnInit(): void {
     this.loadStockissue();
   }
 
   ngAfterViewInit(): void {
     feather.replace();
   }
   // Load data from API
   loadStockissue() {
   this.StockissueService.getAllStockissue().subscribe((res: any) => {
     // Filter only active ones
     this.StockissueList = res.data.filter((item: any) => item.isActive === true);
     setTimeout(() => feather.replace(), 0);
   });
 }
  // Show form for creating
   createStockissue() {
     this.isDisplay = true;
     this.isEditMode = false;
     this.selectedStockissue = null;
     this.reset();
   }
 
   // Show form for editing
   editStockissue(data: any) {
     this.isDisplay = true;       // show the form
     this.isEditMode = true;      // enable edit mode
     this.selectedStockissue = data;
 
     // patch the form fields
     this.StockissueName = data.stockIssuesNames;       // bind to input
     this.description = data.description; // bind to textarea
   }
   cancel() {
 
     this.isEditMode = false;
     this.isDisplay = false;
   }
 
   reset() {
     this.StockissueName = '';
     this.description = '';
   }
 
   // Save or update
   onSubmit(form: any) {
     if (!form.valid) {
       Swal.fire({
         icon: 'warning',
         title: 'Warning',
         text: 'Please fill all required fields',
         confirmButtonText: 'OK',
         confirmButtonColor: '#0e3a4c'
       });
       return;
     }
 
     const payload = {
       StockissuesNames: this.StockissueName,
       CreatedBy: this.userId,
       UpdatedBy: this.userId,
       CreatedDate: new Date(),
       UpdatedDate: new Date()
     };
 
     if (this.isEditMode) {
       const updatedStockissue = { ...this.selectedStockissue, ...payload };
       this.StockissueService.updateStockissue(this.selectedStockissue.id, updatedStockissue).subscribe({
         next: () => {
           Swal.fire({
             icon: 'success',
             title: 'Updated!',
             text: 'Stockissue updated successfully',
             confirmButtonText: 'OK',
             confirmButtonColor: '#0e3a4c'
           });
           this.loadStockissue();
           this.cancel();
         },
         error: () => {
           Swal.fire({
             icon: 'error',
             title: 'Error',
             text: 'Failed to update Stockissue',
             confirmButtonText: 'OK',
             confirmButtonColor: '#d33'
           });
         }
       });
     } else {
       this.StockissueService.createStockissue(payload).subscribe({
         next: () => {
           Swal.fire({
             icon: 'success',
             title: 'Created!',
             text: 'Stockissue created successfully',
             confirmButtonText: 'OK',
             confirmButtonColor: '#0e3a4c'
           });
           this.loadStockissue();
           this.cancel();
         },
         error: () => {
           Swal.fire({
             icon: 'error',
             title: 'Error',
             text: 'Failed to create Stockissue',
             confirmButtonText: 'OK',
             confirmButtonColor: '#d33'
           });
         }
       });
     }
   }
   // Delete
   confirmdeleteStockissue(data: any) {
     Swal.fire({
       title: 'Confirm Delete',
       text: 'Are you sure you want to delete this item?',
       icon: 'warning',
       showCancelButton: true,
       confirmButtonText: 'Delete',
       cancelButtonText: 'Cancel',
       confirmButtonColor: '#d33',
       cancelButtonColor: '#3085d6'
     }).then((result) => {
       if (result.isConfirmed) {
         this.deleteStockissue(data);
         Swal.fire({
           icon: 'success',
           title: 'Deleted!',
           text: 'Stockissue has been deleted.',
           confirmButtonColor: '#3085d6'
         });
       }
     });
   }
   // Delete
   deleteStockissue(item: any) {
     this.StockissueService.deleteStockissue(item.id).subscribe({
       next: (res) => {
         Swal.fire({
           icon: 'success',
           title: 'Deleted!',
           text: 'Stockissue deleted successfully',
           confirmButtonColor: '#3085d6'
         });
         this.ngOnInit();
       },
       error: (err) => {
         Swal.fire({
           icon: 'error',
           title: 'Error',
           text: 'Failed to delete Uom',
           confirmButtonColor: '#d33'
         });
       }
     });
   }
 
     ngAfterViewChecked(): void {
       setTimeout(() => {
         feather.replace();
       });
     }
}
