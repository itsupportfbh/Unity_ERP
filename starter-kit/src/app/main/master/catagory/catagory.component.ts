import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import { CatagoryService } from './catagory.service';
import * as feather from 'feather-icons';
import { FunctionPermission, PermissionService } from 'app/shared/permission.service';

@Component({
  selector: 'app-catagory',
  templateUrl: './catagory.component.html',
  styleUrls: ['./catagory.component.scss']
})
export class CatagoryComponent implements OnInit {

  @ViewChild('addForm') addForm!: NgForm;
    CatagoryList: any[] = [];
    CatagoryName: string = '';
    description: string = '';
    isEditMode = false;
    selectedCatagory: any = null;
    public isDisplay = false;
    private iconsReplaced = false;
     userId: number = 0;
  functionId = 'catagory';

  permission: FunctionPermission;
    isPermissionLoaded = false;
    isPageLoading = false;

    constructor(private fb: FormBuilder,
      private CatagoryService: CatagoryService,
      private permissionService : PermissionService
    ) { 
        this.userId = Number(localStorage.getItem('id') || 0);
    this.permission = this.permissionService.getEmptyPermission(this.functionId);
      }
  
    ngOnInit(): void {
      // this.loadCatagory();
     this.loadPermission();
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
              this.loadCatagory();
            } else {
              this.CatagoryList = [];
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
    ngAfterViewInit(): void {
      feather.replace();
    }
    // Load data from API
    loadCatagory() {
    this.CatagoryService.getAllCatagory().subscribe((res: any) => {
      // Filter only active ones
      this.CatagoryList = res.data.filter((item: any) => item.isActive === true);
      setTimeout(() => feather.replace(), 0);
    });
  }
   // Show form for creating
    createCatagory() {
      this.isDisplay = true;
      this.isEditMode = false;
      this.selectedCatagory = null;
      this.reset();
    }
  
    // Show form for editing
    editCatagory(data: any) {
      debugger
      this.isDisplay = true;       // show the form
      this.isEditMode = true;      // enable edit mode
      this.selectedCatagory = data;
  
      // patch the form fields
      this.CatagoryName = data.catagoryName;       // bind to input
      this.description = data.description; // bind to textarea
    }
    cancel() {
   
      this.isEditMode = false;
      this.isDisplay = false;
    }
  
    reset() {
       this.CatagoryName = '';
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
        catagoryName: this.CatagoryName,
        CreatedBy: this.userId,
        UpdatedBy: this.userId,
        CreatedDate: new Date(),
        UpdatedDate: new Date()
      };
  
      if (this.isEditMode) {
        const updatedCatagory = { ...this.selectedCatagory, ...payload };
        this.CatagoryService.updateCatagory(this.selectedCatagory.id, updatedCatagory).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: 'Catagory updated successfully',
              confirmButtonText: 'OK',
              confirmButtonColor: '#0e3a4c'
            });
            this.loadCatagory();
            this.cancel();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to update Catagory',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
          }
        });
      } else {
        this.CatagoryService.createCatagory(payload).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Created!',
              text: 'Catagory created successfully',
              confirmButtonText: 'OK',
              confirmButtonColor: '#0e3a4c'
            });
            this.loadCatagory();
            this.cancel();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to create Catagory',
              confirmButtonText: 'OK',
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    }
    // Delete
    confirmdeleteCatagory(data: any) {
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
          this.deleteCatagory(data);
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Catagory has been deleted.',
            confirmButtonColor: '#3085d6'
          });
        }
      });
    }
    // Delete
    deleteCatagory(item: any) {
      this.CatagoryService.deleteCatagory(item.id).subscribe({
        next: (res) => {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Catagory deleted successfully',
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
