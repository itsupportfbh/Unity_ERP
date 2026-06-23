import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockMovementsTodayComponent } from './stock-movements-today.component';

describe('StockMovementsTodayComponent', () => {
  let component: StockMovementsTodayComponent;
  let fixture: ComponentFixture<StockMovementsTodayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StockMovementsTodayComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockMovementsTodayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
