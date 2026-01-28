// app/main/master/vehicle/vehicle.component.ts
import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import * as feather from 'feather-icons';
import Swal from 'sweetalert2';
import { VehicleService } from './vehicle.service';

@Component({
  selector: 'app-vehicle',
  templateUrl: './vehicle.component.html',
  styleUrls: ['./vehicle.component.scss']
})
export class VehicleComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild('addForm') addForm!: NgForm;

  vehicleList: any[] = [];
  isDisplay = false;
  isEditMode = false;
  selected: any = null;

  // form fields
  vehicleNo = '';
  vehicleType = '';
  capacity: number | null = null;
  capacityUom = 'KG'; // default

  userId = localStorage.getItem('id');

  constructor(private vehicleSvc: VehicleService) {}

  ngOnInit(): void {
    this.loadVehicles();
  }
  ngAfterViewInit(): void { feather.replace(); }
  ngAfterViewChecked(): void { setTimeout(() => feather.replace()); }

  loadVehicles() {
    this.vehicleSvc.getVehicles().subscribe((res: any) => {
      this.vehicleList = (res?.data || []).filter((x: any) => x.isActive === true);
      setTimeout(() => feather.replace(), 0);
    });
  }

  createVehicle() {
    this.isDisplay = true;
    this.isEditMode = false;
    this.selected = null;
    this.reset();
  }

  editVehicle(row: any) {
    this.isDisplay = true;
    this.isEditMode = true;
    this.selected = row;

    this.vehicleNo   = row.vehicleNo;
    this.vehicleType = row.vehicleType || '';
    this.capacity    = row.capacity ?? null;
    this.capacityUom = row.capacityUom || 'KG';
  }

  cancel() {
    this.isDisplay = false;
    this.isEditMode = false;
  }

  reset() {
    this.vehicleNo = '';
    this.vehicleType = '';
    this.capacity = null;
    this.capacityUom = 'KG';
  }

  onSubmit(form: NgForm) {
    if (!form.valid) {
      Swal.fire({ icon: 'warning', title: 'Warning', text: 'Please fill all required fields', confirmButtonColor: '#0e3a4c' });
      return;
    }

    const payload = {
      vehicleNo: this.vehicleNo.trim(),
      vehicleType: this.vehicleType || null,
      capacity: this.capacity,
      capacityUom: this.capacityUom || null,
      createdBy: this.userId,
      updatedBy: this.userId,
      isActive: true
    };

    if (this.isEditMode) {
      this.vehicleSvc.updateVehicle(this.selected.id, payload).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Updated!', text: 'Vehicle updated successfully', confirmButtonColor: '#0e3a4c' });
          this.loadVehicles(); this.cancel();
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update vehicle', confirmButtonColor: '#d33' })
      });
    } else {
      this.vehicleSvc.createVehicle(payload).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Created!', text: 'Vehicle created successfully', confirmButtonColor: '#0e3a4c' });
          this.loadVehicles(); this.cancel();
        },
        error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to create vehicle', confirmButtonColor: '#d33' })
      });
    }
  }

  confirmDelete(row: any) {
    Swal.fire({
      title: 'Confirm Delete',
      text: `Deactivate vehicle ${row.vehicleNo}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    }).then(result => {
      if (result.isConfirmed) this.deleteVehicle(row);
    });
  }

  deleteVehicle(row: any) {
    this.vehicleSvc.deleteVehicle(row.id).subscribe({
      next: () => { Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Vehicle deactivated', confirmButtonColor: '#3085d6' }); this.loadVehicles(); },
      error: () => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete vehicle', confirmButtonColor: '#d33' })
    });
  }
}
