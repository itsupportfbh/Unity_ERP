import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaxGstComponent } from './tax-gst.component';



describe('TaxGstComponent', () => {
  let component: TaxGstComponent;
  let fixture: ComponentFixture<TaxGstComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TaxGstComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaxGstComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
