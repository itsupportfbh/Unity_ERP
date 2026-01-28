import { AfterViewChecked, Component, OnInit, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { FormBuilder, NgForm } from '@angular/forms';
import { FlagissueService } from './flagissue.service';

@Component({
  selector: 'app-flagissue',
  templateUrl: './flagissue.component.html',
  styleUrls: ['./flagissue.component.scss']
})
export class FlagissueComponent implements OnInit,AfterViewChecked{
@ViewChild('addForm') addForm!: NgForm;
  flagIssueList: any[] = [];
  flagIssueName: string = '';
  description: string = '';
  isEditMode = false;
  selectedFlagIssue: any = null;
  public isDisplay = false;
  private iconsReplaced = false;
  userId: string;
  constructor(private fb: FormBuilder,
    private flagIssueService: FlagissueService,) {
       this.userId = localStorage.getItem('id');
     }

  ngOnInit(): void {
    this.loadFlagIssue();
  }

  ngAfterViewInit(): void {
    feather.replace();
  }
  // Load data from API
  loadFlagIssue() {
  this.flagIssueService.getAllFlagIssue().subscribe((res: any) => {
    // Filter only active ones
    this.flagIssueList = res.data.filter((item: any) => item.isActive === true);
    setTimeout(() => feather.replace(), 0);
  });
}
 // Show form for creating
  createFlagIssue() {
    this.isDisplay = true;
    this.isEditMode = false;
    this.selectedFlagIssue = null;
    this.reset();
  }

  // Show form for editing
  editFlagIssue(data: any) {
    this.isDisplay = true;       // show the form
    this.isEditMode = true;      // enable edit mode
    this.selectedFlagIssue = data;

    // patch the form fields
    this.flagIssueName = data.flagIssuesNames;       // bind to input
    this.description = data.description; // bind to textarea
  }
  cancel() {

    this.isEditMode = false;
    this.isDisplay = false;
  }

  reset() {
    this.flagIssueName = '';
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
    FlagIssuesNames: this.flagIssueName,
    CreatedBy: this.userId,
    UpdatedBy: this.userId,
    CreatedDate: new Date(),
    UpdatedDate: new Date()
  };

  const handleResponse = (res: any, successMsg: string) => {
    if (res?.isSuccess === false) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: res?.message || 'Operation failed',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0e3a4c'
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: res?.message || successMsg,
      confirmButtonText: 'OK',
      confirmButtonColor: '#0e3a4c'
    });

    this.loadFlagIssue();
    this.cancel();
  };

  const handleError = (err: any, fallbackMsg: string) => {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err?.error?.message || fallbackMsg,
      confirmButtonText: 'OK',
      confirmButtonColor: '#d33'
    });
  };

  if (this.isEditMode) {
    const updatedFlagIssue = { ...this.selectedFlagIssue, ...payload };

    this.flagIssueService.updateFlagIssue(this.selectedFlagIssue.id, updatedFlagIssue).subscribe({
      next: (res: any) => handleResponse(res, 'FlagIssue updated successfully'),
      error: (err: any) => handleError(err, 'Failed to update FlagIssue')
    });

  } else {
    this.flagIssueService.createFlagIssue(payload).subscribe({
      next: (res: any) => handleResponse(res, 'FlagIssue created successfully'),
      error: (err: any) => handleError(err, 'Failed to create FlagIssue')
    });
  }
}

  // Delete
  confirmdeleteFlagIssue(data: any) {
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
        this.deleteIncoterms(data);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'FlagIssue has been deleted.',
          confirmButtonColor: '#3085d6'
        });
      }
    });
  }
  // Delete
  deleteIncoterms(item: any) {
    this.flagIssueService.deleteFlagIssue(item.id).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Incoterms deleted successfully',
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
