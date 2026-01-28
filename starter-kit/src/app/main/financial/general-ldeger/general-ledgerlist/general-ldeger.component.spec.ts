import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeneralLdegerComponent } from './general-ldeger.component';



describe('GeneralLdegerComponent', () => {
  let component: GeneralLdegerComponent;
  let fixture: ComponentFixture<GeneralLdegerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GeneralLdegerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralLdegerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
