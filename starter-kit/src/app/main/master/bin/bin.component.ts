import { Component, OnInit, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { FormBuilder, NgForm } from '@angular/forms';
import { BinService } from './bin.service';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-bin',
  templateUrl: './bin.component.html',
  styleUrls: ['./bin.component.scss']
})
export class BinComponent implements OnInit {

  @ViewChild('addForm') addForm!: NgForm;
     BinList: any[] = [];
     BinName: string = '';
     description: string = '';
     isEditMode = false;
     selectedBin: any = null;
     public isDisplay = false;
     private iconsReplaced = false;
  isPageLoading = false;
       userId: any = 0;
  functionId = 'nin';
  
    permission: FunctionPermission;
    isPermissionLoaded = false;
     constructor(private fb: FormBuilder,
       private BinService: BinService,
      private permissionService: PermissionService) {
          this.userId = localStorage.getItem('id');
        }
   
     ngOnInit(): void {
      //  this.loadBin();
      this.loadPermission();
     }
   
     ngAfterViewInit(): void {
       feather.replace();
     }
     // Load data from API
     loadBin() {
     this.BinService.getAllBin().subscribe((res: any) => {
       // Filter only active ones
       this.BinList = res.data.filter((item: any) => item.isActive === true);
       setTimeout(() => feather.replace(), 0);
     });
   }
    // Show form for creating
     createBin() {
       this.isDisplay = true;
       this.isEditMode = false;
       this.selectedBin = null;
       this.reset();
     }
   
     // Show form for editing
     editBin(data: any) {
       this.isDisplay = true;       // show the form
       this.isEditMode = true;      // enable edit mode
       this.selectedBin = data;
   
       // patch the form fields
       this.BinName = data.binName;       // bind to input
       this.description = data.description; // bind to textarea
     }
     cancel() {
   
       this.isEditMode = false;
       this.isDisplay = false;
     }
   
     reset() {
       this.BinName = '';
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
         binName: this.BinName,
         CreatedBy: this.userId,
         UpdatedBy: this.userId,
         CreatedDate: new Date(),
         UpdatedDate: new Date(),
         companyId: localStorage.getItem('companyId') || 0
       };
   
       if (this.isEditMode) {
         const updatedBin = { ...this.selectedBin, ...payload };
         this.BinService.updateBin(this.selectedBin.id, updatedBin).subscribe({
           next: () => {
             Swal.fire({
               icon: 'success',
               title: 'Updated!',
               text: 'Bin updated successfully',
               confirmButtonText: 'OK',
               confirmButtonColor: '#0e3a4c'
             });
             this.loadBin();
             this.cancel();
           },
           error: () => {
             Swal.fire({
               icon: 'error',
               title: 'Error',
               text: 'Failed to update Bin',
               confirmButtonText: 'OK',
               confirmButtonColor: '#d33'
             });
           }
         });
       } else {
         this.BinService.createBin(payload).subscribe({
           next: () => {
             Swal.fire({
               icon: 'success',
               title: 'Created!',
               text: 'Bin created successfully',
               confirmButtonText: 'OK',
               confirmButtonColor: '#0e3a4c'
             });
             this.loadBin();
             this.cancel();
           },
           error: () => {
             Swal.fire({
               icon: 'error',
               title: 'Error',
               text: 'Failed to create Bin',
               confirmButtonText: 'OK',
               confirmButtonColor: '#d33'
             });
           }
         });
       }
     }
     // Delete
     confirmdeleteBin(data: any) {
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
           this.deleteBin(data);
           Swal.fire({
             icon: 'success',
             title: 'Deleted!',
             text: 'Bin has been deleted.',
             confirmButtonColor: '#3085d6'
           });
         }
       });
     }
     // Delete
     deleteBin(item: any) {
       this.BinService.deleteBin(item.id).subscribe({
         next: (res) => {
           Swal.fire({
             icon: 'success',
             title: 'Deleted!',
             text: 'Bin deleted successfully',
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
  
 loadPermission(): void {
    if (!this.userId || this.userId <= 0) {
      this.permission = this.permissionService.getEmptyPermission(this.functionId);
      this.isPermissionLoaded = true;

      Swal.fire({
        icon: 'warning',
        title: 'Access Denied',
        text: 'User not found. Please login again.',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    this.isPageLoading = true;

    this.permissionService.getFunctionPermission(this.userId, this.functionId).subscribe({
      next: (res: FunctionPermission) => {
        this.permission = res || this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        if (this.canView()) {
          this.loadBin();
        } else {
          this.BinList = [];
          this.isDisplay = false;
        }
      },
      error: (err) => {
        console.error('Permission load error:', err);
        this.permission = this.permissionService.getEmptyPermission(this.functionId);
        this.isPermissionLoaded = true;
        this.isPageLoading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Unable to load permission.',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  canView(): boolean {
    return this.permissionService.hasView(this.permission);
  }

  canCreate(): boolean {
    return this.permissionService.hasCreate(this.permission);
  }

  canEdit(): boolean {
    return this.permissionService.hasEdit(this.permission);
  }

  canDelete(): boolean {
    return this.permissionService.hasDelete(this.permission);
  }
       
}
