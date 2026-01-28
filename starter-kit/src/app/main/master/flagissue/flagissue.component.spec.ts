import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlagissueComponent } from './flagissue.component';

describe('FlagissueComponent', () => {
  let component: FlagissueComponent;
  let fixture: ComponentFixture<FlagissueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FlagissueComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlagissueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
