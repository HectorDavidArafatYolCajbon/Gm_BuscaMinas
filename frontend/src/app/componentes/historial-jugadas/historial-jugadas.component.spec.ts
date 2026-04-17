import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialJugadasComponent } from './historial-jugadas.component';

describe('HistorialJugadasComponent', () => {
  let component: HistorialJugadasComponent;
  let fixture: ComponentFixture<HistorialJugadasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialJugadasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistorialJugadasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
