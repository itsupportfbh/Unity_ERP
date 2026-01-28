import { Component, OnInit, ViewChild } from '@angular/core';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { NgForm } from '@angular/forms';
import { DriverService } from './driver.service';

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.scss']
})
export class DriverComponent implements OnInit {

  @ViewChild('addForm') addForm!: NgForm;

  driverList: any[] = [];
  driverName: string = '';
  nricOrId: string = '';
  contactNumber: number | null = null;
  licenseNumber: string = '';
  licenseExpiryDate: string = '';
  remarks: string = '';

  isEditMode = false;
  selectedDriver: any = null;
  public isDisplay = false;
  userId: string;

  constructor(private driverService: DriverService) {
    this.userId = localStorage.getItem('id') ?? '';
  }

  ngOnInit(): void {
    this.loadDrivers();
  }

  ngAfterViewChecked(): void {
    feather.replace();
  }

  // Load list
  loadDrivers() {
    this.driverService.getAllDriver().subscribe((res: any) => {
      this.driverList = res.data.filter((x: any) => x.isActive === true);
      setTimeout(() => feather.replace(), 0);
    });
  }

  // show form
  createDriver() {
    this.isDisplay = true;
    this.isEditMode = false;
    this.reset();
  }

  // edit
  editDriver(data: any) {
    this.isDisplay = true;
    this.isEditMode = true;
    this.selectedDriver = data;

    this.driverName = data.driverName;
    this.nricOrId = data.nricOrId;
    this.contactNumber = data.mobileNumber; // ✅ corrected
    this.licenseNumber = data.licenseNumber;
    this.licenseExpiryDate = data.licenseExpiryDate?.split('T')[0]; // ✅ convert date
    this.remarks = data.remarks;
  }

  cancel() {
    this.isDisplay = false;
    this.isEditMode = false;
  }

  // Reset form fields
  reset() {
    this.driverName = '';
    this.nricOrId = '';
    this.contactNumber = null; // ✅ Fix reset
    this.licenseNumber = '';
    this.licenseExpiryDate = '';
    this.remarks = '';
  }

  // Save or Update
  onSubmit(form: NgForm) {
    if (!form.valid) {
      Swal.fire({ icon: 'warning', title: 'Please fill all required fields' });
      return;
    }

    const payload = {
      driverName: this.driverName,
      nricOrId: this.nricOrId,
      mobileNumber: this.contactNumber, // ✅ correct field name
      licenseNumber: this.licenseNumber,
      licenseExpiryDate: this.licenseExpiryDate,
      remarks: this.remarks,
      createdBy: 1,
      updatedBy: 1,
      createdDate: new Date(),
      updatedDate: new Date()
    };

    // Update
    if (this.isEditMode) {
      const updatedDriver = { ...this.selectedDriver, ...payload };

      this.driverService.updateDriver(this.selectedDriver.id, updatedDriver).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Driver updated successfully' });
          this.loadDrivers();
          this.cancel();
        }
      });
    }
    // Create
    else {
      this.driverService.createDriver(payload).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Driver created successfully' });
          this.loadDrivers();
          this.cancel();
        }
      });
    }
  }

  // Delete Confirmation
  confirmDelete(data: any) {
    Swal.fire({
      title: 'Are you sure want to delete?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete'
    }).then(result => {
      if (result.isConfirmed) {
        this.deleteDriver(data);
      }
    });
  }

  // Delete
  deleteDriver(item: any) {
    this.driverService.deleteDriver(item.id).subscribe(() => {
      Swal.fire({ icon: 'success', title: 'Driver deleted' });
      this.loadDrivers();
    });
  }
}
