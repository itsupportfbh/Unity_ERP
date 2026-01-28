import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { CoastingMethodService } from './coasting-method.service';

@Component({
  selector: 'app-coasting-method',
  templateUrl: './coasting-method.component.html',
  styleUrls: ['./coasting-method.component.scss']
})
export class CoastingMethodComponent implements OnInit {

  @ViewChild('addForm') addForm!: NgForm;
   CoastingMethodList: any[] = [];
   costingName: string = '';
   description: string = '';
   isEditMode = false;
   selectedCoastingMethod: any = null;
   public isDisplay = false;
   private iconsReplaced = false;
   userId: string;
   constructor(private fb: FormBuilder,
     private coastingmethodService: CoastingMethodService,) { 
        this.userId = localStorage.getItem('id');
     }
 
   ngOnInit(): void {
     this.loadCoastingMethod();
   }
  ngAfterViewChecked(): void {
   setTimeout(() => {
     feather.replace();
   });
 }
 
   ngAfterViewInit(): void {
     feather.replace();
   }
   // Load data from API
   loadCoastingMethod() {
     debugger
     this.coastingmethodService.getAllCoastingMethod().subscribe((res: any) => {
      this.CoastingMethodList = res.data.filter((item: any) => item.isActive === true);
       setTimeout(() => feather.replace(), 0);
     });
   }
 
   // Show form for creating
   createCoastingMethod() {
     this.isDisplay = true;
     this.isEditMode = false;
     this.selectedCoastingMethod = null;
     this.reset();
   }
 
   // Show form for editing
   editCoastingMethod(data: any) {
     this.isDisplay = true;       // show the form
     this.isEditMode = true;      // enable edit mode
     this.selectedCoastingMethod = data;
 
     // patch the form fields
     this.costingName = data.costingName;       // bind to input
     this.description = data.description; // bind to textarea
   }
   cancel() {
 
     this.isEditMode = false;
     this.isDisplay = false;
   }
 
   reset() {
     this.costingName = '';
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
       costingName: this.costingName,
       description: this.description,
       CreatedDate: new Date(),
       CreatedBy: this.userId,
       UpdatedBy: this.userId,
       UpdatedDate: new Date(),
       isActive: true,
     };
 
     if (this.isEditMode) {
       const updatedCoastingMethod = { ...this.selectedCoastingMethod, ...payload };
       this.coastingmethodService.updateCoastingMethod(this.selectedCoastingMethod.id, updatedCoastingMethod).subscribe({
         next: () => {
           Swal.fire({
             icon: 'success',
             title: 'Updated!',
             text: 'CoastingMethod updated successfully',
             confirmButtonText: 'OK',
             confirmButtonColor: '#0e3a4c'
           });
           this.loadCoastingMethod();
           this.cancel();
         },
         error: () => {
           Swal.fire({
             icon: 'error',
             title: 'Error',
             text: 'Failed to update CoastingMethod',
             confirmButtonText: 'OK',
             confirmButtonColor: '#d33'
           });
         }
       });
     } else {
       this.coastingmethodService.createCoastingMethod(payload).subscribe({
         next: () => {
           Swal.fire({
             icon: 'success',
             title: 'Created!',
             text: 'CoastingMethod created successfully',
             confirmButtonText: 'OK',
             confirmButtonColor: '#0e3a4c'
           });
           this.loadCoastingMethod();
           this.cancel();
         },
         error: () => {
           Swal.fire({
             icon: 'error',
             title: 'Error',
             text: 'Failed to create CoastingMethod',
             confirmButtonText: 'OK',
             confirmButtonColor: '#d33'
           });
         }
       });
     }
   }
   // Delete
   confirmdeleteCoastingMethod(data: any) {
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
         this.deleteCoastingMethod(data);
         Swal.fire({
           icon: 'success',
           title: 'Deleted!',
           text: 'Item has been deleted.',
           confirmButtonColor: '#3085d6'
         });
       }
     });
   }
   // Delete
   deleteCoastingMethod(item: any) {
     this.coastingmethodService.deleteCoastingMethod(item.id).subscribe({
       next: (res) => {
         Swal.fire({
           icon: 'success',
           title: 'Deleted!',
           text: 'CoastingMethod deleted successfully',
           confirmButtonColor: '#3085d6'
         });
         this.ngOnInit();
       },
       error: (err) => {
         Swal.fire({
           icon: 'error',
           title: 'Error',
           text: 'Failed to delete CoastingMethod',
           confirmButtonColor: '#d33'
         });
       }
     });
   }
 
 }
 