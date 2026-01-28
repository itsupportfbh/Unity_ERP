import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncotermsComponent } from './incoterms.component';

describe('IncotermsComponent', () => {
  let component: IncotermsComponent;
  let fixture: ComponentFixture<IncotermsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IncotermsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncotermsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
