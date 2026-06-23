import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyPipelineComponent } from './my-pipeline.component';

describe('MyPipelineComponent', () => {
  let component: MyPipelineComponent;
  let fixture: ComponentFixture<MyPipelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MyPipelineComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyPipelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
