import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionOutputComponent } from './production-output.component';

describe('ProductionOutputComponent', () => {
  let component: ProductionOutputComponent;
  let fixture: ComponentFixture<ProductionOutputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProductionOutputComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionOutputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
