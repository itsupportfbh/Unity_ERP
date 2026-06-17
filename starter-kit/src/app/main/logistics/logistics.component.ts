import { Component, OnInit } from '@angular/core';
import { AvailableDelivery, LogisticsRoute, LogisticsService, LogisticsStop } from './logistics.service';

@Component({
  selector: 'app-logistics',
  templateUrl: './logistics.component.html',
  styleUrls: ['./logistics.component.scss']
})
export class LogisticsComponent implements OnInit {
  routes: LogisticsRoute[] = [];
  stops: LogisticsStop[] = [];
  availableDeliveries: AvailableDelivery[] = [];
  drivers: any[] = [];
  vehicles: any[] = [];
  selectedRoute?: LogisticsRoute;
  selectedStop?: LogisticsStop;
  selectedDeliveryIds: number[] = [];
  loading = false;
  saving = false;
  message = '';
  error = '';

  filters = {
    routeDate: new Date().toISOString().slice(0, 10),
    status: ''
  };

  routeForm = {
    routeName: '',
    routeDate: new Date().toISOString().slice(0, 10),
    driverId: null,
    vehicleId: null
  };

  podForm = {
    status: 'Delivered',
    receiverName: '',
    receiverMobile: '',
    remarks: ''
  };

  readonly statuses = ['Planned', 'In Transit', 'Completed', 'Cancelled'];
  readonly podStatuses = ['Delivered', 'Failed', 'Skipped', 'Cancelled'];

  constructor(private logisticsService: LogisticsService) {}

  ngOnInit(): void {
    this.loadMasters();
    this.loadRoutes();
    this.loadAvailableDeliveries();
  }

  loadMasters(): void {
    this.logisticsService.getDrivers().subscribe({ next: rows => (this.drivers = rows || []), error: () => (this.drivers = []) });
    this.logisticsService.getVehicles().subscribe({ next: rows => (this.vehicles = rows || []), error: () => (this.vehicles = []) });
  }

  loadRoutes(): void {
    this.loading = true;
    this.logisticsService.getRoutes(this.filters).subscribe({
      next: rows => {
        this.routes = rows;
        this.loading = false;
      },
      error: () => {
        this.error = 'Routes load panna mudiyala.';
        this.loading = false;
      }
    });
  }

  loadAvailableDeliveries(): void {
    this.logisticsService.getAvailableDeliveries(this.routeForm.routeDate).subscribe({
      next: rows => (this.availableDeliveries = rows),
      error: () => (this.availableDeliveries = [])
    });
  }

  toggleDelivery(id: number, checked: boolean): void {
    this.selectedDeliveryIds = checked
      ? Array.from(new Set([...this.selectedDeliveryIds, id]))
      : this.selectedDeliveryIds.filter(x => x !== id);
  }

  createRoute(): void {
    this.message = '';
    this.error = '';
    if (!this.routeForm.routeName || this.selectedDeliveryIds.length === 0) {
      this.error = 'Route name and delivery orders required.';
      return;
    }

    this.saving = true;
    this.logisticsService
      .createRoute({
        ...this.routeForm,
        deliveryOrderIds: this.selectedDeliveryIds
      })
      .subscribe({
        next: () => {
          this.message = 'Route create aagiduchu.';
          this.saving = false;
          this.selectedDeliveryIds = [];
          this.routeForm.routeName = '';
          this.loadRoutes();
          this.loadAvailableDeliveries();
        },
        error: () => {
          this.error = 'Route create panna mudiyala.';
          this.saving = false;
        }
      });
  }

  openRoute(route: LogisticsRoute): void {
    this.selectedRoute = route;
    this.selectedStop = undefined;
    this.logisticsService.getStops(route.id).subscribe({
      next: rows => (this.stops = rows),
      error: () => (this.stops = [])
    });
  }

  startRoute(route: LogisticsRoute): void {
    this.logisticsService.startRoute(route.id).subscribe({
      next: () => {
        this.message = 'Route start aagiduchu.';
        this.loadRoutes();
        this.openRoute(route);
      },
      error: () => (this.error = 'Route start panna mudiyala.')
    });
  }

  openPod(stop: LogisticsStop): void {
    this.selectedStop = stop;
    this.podForm = {
      status: stop.status === 'Pending' ? 'Delivered' : stop.status,
      receiverName: stop.receiverName || '',
      receiverMobile: stop.receiverMobile || '',
      remarks: stop.remarks || ''
    };
  }

  savePod(): void {
    if (!this.selectedStop) {
      return;
    }

    this.saving = true;
    this.logisticsService.updatePod(this.selectedStop.id, this.podForm).subscribe({
      next: () => {
        this.message = 'POD update aagiduchu.';
        this.saving = false;
        if (this.selectedRoute) {
          this.openRoute(this.selectedRoute);
          this.loadRoutes();
        }
      },
      error: () => {
        this.error = 'POD update panna mudiyala.';
        this.saving = false;
      }
    });
  }

  trackById(_: number, item: any): number {
    return item.id;
  }
}
