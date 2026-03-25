
import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import Swal from 'sweetalert2';
import * as feather from 'feather-icons';
import { UomConversionService } from '../uomconversion-service';
import { UomService } from '../../uom/uom.service';


@Component({
  selector: 'app-uomconversion',
  templateUrl: './uomconversion.component.html',
  styleUrls: ['./uomconversion.component.scss']
})
export class UomconversionComponent implements OnInit {

    @ViewChild('addForm') addForm!: NgForm;

  conversionList: any[] = [];
  uomList: any[] = [];

  fromUomId: number | null = null;
  toUomId: number | null = null;
  factor: number | null = null;
  description: string = '';

  isEditMode = false;
  selectedRow: any = null;
  isDisplay = false;
  userId: string;

  constructor(
    private uomService: UomService,
    private conversionService: UomConversionService
  ) {
    this.userId = localStorage.getItem('id') || '1';
  }

  ngOnInit(): void {
    this.loadUoms();
    this.loadConversions();
  }

  ngAfterViewChecked(): void {
    setTimeout(() => feather.replace());
  }

  ngAfterViewInit(): void {
    feather.replace();
  }

  loadUoms(): void {
    this.uomService.getAllUom().subscribe((res: any) => {
      this.uomList = res?.data?.filter((x: any) => x.isActive) || [];
    });
  }

  loadConversions(): void {
    this.conversionService.getAll().subscribe((res: any) => {
      this.conversionList = res?.data || [];
      setTimeout(() => feather.replace(), 0);
    });
  }

  createRow(): void {
    this.isDisplay = true;
    this.isEditMode = false;
    this.selectedRow = null;
    this.reset();
  }

  editRow(row: any): void {
    this.isDisplay = true;
    this.isEditMode = true;
    this.selectedRow = row;

    this.fromUomId = row.fromUomId;
    this.toUomId = row.toUomId;
    this.factor = row.factor;
    this.description = row.description || '';
  }

  cancel(): void {
    this.isDisplay = false;
    this.isEditMode = false;
    this.selectedRow = null;
  }

  reset(): void {
    this.fromUomId = null;
    this.toUomId = null;
    this.factor = null;
    this.description = '';
  }

  onSubmit(form: any): void {
    if (!form.valid) {
      Swal.fire('Warning', 'Please fill all required fields', 'warning');
      return;
    }

    if (this.fromUomId === this.toUomId) {
      Swal.fire('Warning', 'From UOM and To UOM cannot be same', 'warning');
      return;
    }

    const payload = {
      fromUomId: this.fromUomId,
      toUomId: this.toUomId,
      factor: this.factor,
      description: this.description,
      createdBy: this.userId,
      updatedBy: this.userId,
      updatedDate: new Date(),
      isActive: true
    };

    if (this.isEditMode) {
      const body = { ...this.selectedRow, ...payload };
      this.conversionService.update(this.selectedRow.id, body).subscribe({
        next: (res: any) => {
         
          Swal.fire('Updated!', 'UOM Conversion updated successfully', 'success');
          this.loadConversions();
          this.cancel();
        },
        error: () => Swal.fire('Error', 'Failed to update UOM Conversion', 'error')
      });
    } else {
      this.conversionService.create(payload).subscribe({
        next: (res: any) => {
         
          Swal.fire('Created!', 'UOM Conversion created successfully', 'success');
          this.loadConversions();
          this.cancel();
        },
        error: () => Swal.fire('Error', 'Failed to create UOM Conversion', 'error')
      });
    }
  }

  confirmDelete(row: any): void {
    Swal.fire({
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this conversion?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        this.deleteRow(row);
      }
    });
  }

  deleteRow(row: any): void {
    this.conversionService.delete(row.id).subscribe({
      next: () => {
        Swal.fire('Deleted!', 'UOM Conversion deleted successfully', 'success');
        this.loadConversions();
      },
      error: () => Swal.fire('Error', 'Failed to delete UOM Conversion', 'error')
    });
  }

}



