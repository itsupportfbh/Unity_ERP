import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportscreateComponent } from './reportscreate.component';


describe('ReportscreateComponent', () => {
  let component: ReportscreateComponent;
  let fixture: ComponentFixture<ReportscreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportscreateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportscreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
