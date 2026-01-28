import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import { DatatableComponent, ColumnMode } from '@swimlane/ngx-datatable';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { ApprovallevelService } from './approvallevel.service';

@Component({
  selector: 'app-approval-level',
  templateUrl: './approval-level.component.html',
  styleUrls: ['./approval-level.component.scss'],
 encapsulation: ViewEncapsulation.None
})
export class ApprovalLevelComponent implements OnInit {
  @ViewChild('addForm') addForm!: NgForm;
   approvalLevelList: any[] = [];
   approvalLevelName: string = '';
   description: string = '';
   isEditMode = false;
   selectedApprovalLevel: any = null;
   public isDisplay = false;
   private iconsReplaced = false;
  userId: string;
   approvalLevelHeader: string = 'Add Approval Level';
   constructor(private fb: FormBuilder,
     private approvallevelService: ApprovallevelService,) {
       this.userId = localStorage.getItem('id');
      }
 
   ngOnInit(): void {
     this.loadApprovalLevel();
   }
   ngAfterViewChecked(): void {
     feather.replace();  // remove the guard so icons refresh every cycle
   }
   ngAfterViewInit(): void {
     feather.replace();
   }
   // Load data from API
   loadApprovalLevel() {
  this.approvallevelService.getAllApprovalLevel().subscribe((response: any) => {
  if (response.isSuccess) {
   this.approvalLevelList = response.data.filter((item: any) => item.isActive);
  } else {
    this.approvalLevelList = [];
  }
});
 }
  // Show form for creating
   createApprovalLevel() {
     this.isDisplay = true;
     this.isEditMode = false;
     this.selectedApprovalLevel = null;
     this.reset();
      this.approvalLevelHeader = 'Create Approval Level';
   }
 
   // Show form for editing
   editApprovalLevel(data: any) {
     this.isDisplay = true;       // show the form
     this.isEditMode = true;      // enable edit mode
     this.selectedApprovalLevel = data;
 
     // patch the form fields
     this.approvalLevelName = data.name;       // bind to input
     this.description = data.description; // bind to textarea
      this.approvalLevelHeader = "Edit Approval Level";
   }
   cancel() {
 
     this.isEditMode = false;
     this.isDisplay = false;
   }
 
   reset() {
     this.approvalLevelName = '';
     this.description = '';
      this.approvalLevelHeader = "Create Approval Level";
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
       Name: this.approvalLevelName,
       Description:this.description,
       IsActive:true,
       CreatedBy: this.userId,
       UpdatedBy: this.userId,
       CreatedDate: new Date(),
       UpdatedDate: new Date()
     };
 
     if (this.isEditMode) {
       const updatedApprovallevel = { ...this.selectedApprovalLevel, ...payload };
      this.approvallevelService
  .updateApprovalLevel(this.selectedApprovalLevel.id, updatedApprovallevel)
  .subscribe({
    next: (res: any) => {
      if (res?.isSuccess) {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: res.message || 'Approval level updated successfully',
          confirmButtonText: 'OK',
          confirmButtonColor: '#0e3a4c'
        });
        this.loadApprovalLevel();
        this.cancel();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: res?.message || 'Failed to update Approval level.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#d33'
        });
      }
    },
    error: (err) => {
      const msg =
        err?.error?.message ||
        err?.message ||
        'Unable to update Approval level.';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: msg,
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
      });
    }
  });
     } else {
      this.approvallevelService.createApprovalLevel(payload).subscribe({
  next: (res) => {
    if (res?.isSuccess) {
      Swal.fire({
        icon: 'success',
        title: 'Created!',
        text: res.message || 'Approval level created successfully',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      this.loadApprovalLevel();
      this.cancel();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: res?.message || 'Something went wrong.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#d33'
      });
    }
  },
  error: (err) => {
    // Handles non-200 responses, network errors, etc.
    const msg =
      err?.error?.message ||
      err?.message ||
      'Unable to create approval level.';
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: msg,
      confirmButtonText: 'OK',
      confirmButtonColor: '#d33'
    });
  }
});

     }
   }
   // Delete
   confirmdeleteApprovalLevel(data: any) {
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
         this.deleteApprovallevel(data);
         Swal.fire({
           icon: 'success',
           title: 'Deleted!',
           text: 'ApprovalLevel has been deleted.',
           confirmButtonColor: '#3085d6'
         });
       }
     });
   }
   // Delete
   deleteApprovallevel(item: any) {
     this.approvallevelService.deleteApprovalLevel(item.id).subscribe({
       next: (res) => {
         Swal.fire({
           icon: 'success',
           title: 'Deleted!',
           text: 'ApprovalLevel deleted successfully',
           confirmButtonColor: '#3085d6'
         });
         this.ngOnInit();
       },
       error: (err) => {
         Swal.fire({
           icon: 'error',
           title: 'Error',
           text: 'Failed to delete ApprovalLevel',
           confirmButtonColor: '#d33'
         });
       }
     });
   }
 

}
