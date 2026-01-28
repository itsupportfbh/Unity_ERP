import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatesuppliersComponent } from './createsuppliers.component';

describe('CreatesuppliersComponent', () => {
  let component: CreatesuppliersComponent;
  let fixture: ComponentFixture<CreatesuppliersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreatesuppliersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatesuppliersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
