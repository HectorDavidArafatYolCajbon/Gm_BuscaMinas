import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IaBuscaminasService } from '../../servicios/ia-buscaminas.service';
import { Tablero } from '../../interfaces/tablero.interface';
import { Jugada } from '../../interfaces/jugada.interface';
import { HistorialJugada } from '../../interfaces/historial-jugada.interface';
import { Casilla } from '../../interfaces/casilla.interface';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss'
})
export class InicioComponent implements OnInit {
  private iaBuscaminasServicio = inject(IaBuscaminasService);

  public tablero = signal<Tablero | null>(null);
  public historial = signal<HistorialJugada[]>([]);
  public jugadaIaActual = signal<Jugada | null>(null);
  public mensaje = signal<string>('');
  public tableroProbabilidadesTexto = signal<string>('');

  public totalMinas = 15;

  public casillaSeleccionadaManual = signal<Casilla | null>(null);
  public minasAlrededorManual = 0;

  public filaResultadoIa = 0;
  public columnaResultadoIa = 0;
  public minasAlrededorResultadoIa = 0;

  public ngOnInit(): void {
    this.cargarHistorial();
  }

  public crearTablero(): void {
    this.iaBuscaminasServicio.crearTablero(this.totalMinas).subscribe({
      next: (respuesta) => {
        this.tablero.set(respuesta.tablero);
        this.mensaje.set(respuesta.mensaje);
        this.jugadaIaActual.set(null);
        this.casillaSeleccionadaManual.set(null);
        this.tableroProbabilidadesTexto.set('');
        this.minasAlrededorManual = 0;
        this.filaResultadoIa = 0;
        this.columnaResultadoIa = 0;
        this.minasAlrededorResultadoIa = 0;
        this.cargarHistorial();
      },
      error: (error) => {
        this.mensaje.set(error?.error?.mensaje ?? 'Error al crear tablero');
      }
    });
  }

  public reiniciarTablero(): void {
    this.iaBuscaminasServicio.reiniciarTablero().subscribe({
      next: (respuesta) => {
        this.tablero.set(null);
        this.jugadaIaActual.set(null);
        this.casillaSeleccionadaManual.set(null);
        this.tableroProbabilidadesTexto.set('');
        this.minasAlrededorManual = 0;
        this.filaResultadoIa = 0;
        this.columnaResultadoIa = 0;
        this.minasAlrededorResultadoIa = 0;
        this.mensaje.set(respuesta?.mensaje ?? 'Tablero reiniciado');
        this.cargarHistorial();
      },
      error: (error) => {
        this.mensaje.set(error?.error?.mensaje ?? 'Error al reiniciar tablero');
      }
    });
  }

  public seleccionarCasillaManual(casilla: Casilla): void {
    // Lógica de la casilla [casilla.fila, casilla.columna]: solo se puede seleccionar una casilla cerrada no marcada.
    if (casilla.abierta || casilla.marcadaComoMina) {
      return;
    }

    this.casillaSeleccionadaManual.set(casilla);
    this.mensaje.set(`Casilla seleccionada: [${casilla.fila}, ${casilla.columna}]`);
  }

  public registrarPrimeraJugada(): void {
    const casilla = this.casillaSeleccionadaManual();

    if (!casilla) {
      this.mensaje.set('Primero selecciona una casilla del tablero');
      return;
    }

    this.iaBuscaminasServicio
      .registrarJugada(casilla.fila, casilla.columna, this.minasAlrededorManual)
      .subscribe({
        next: (respuesta) => {
          this.tablero.set(respuesta.tablero);
          this.mensaje.set(respuesta.mensaje);
          this.casillaSeleccionadaManual.set(null);
          this.minasAlrededorManual = 0;
          this.tableroProbabilidadesTexto.set('');
          this.cargarHistorial();
        },
        error: (error) => {
          this.mensaje.set(error?.error?.mensaje ?? 'Error al registrar jugada');
        }
      });
  }

  public pedirJugadaIa(): void {
    this.iaBuscaminasServicio.obtenerSiguienteJugada().subscribe({
      next: (respuesta) => {
        this.tablero.set(respuesta.tablero);
        this.jugadaIaActual.set(respuesta.jugada);
        this.filaResultadoIa = respuesta.jugada.fila;
        this.columnaResultadoIa = respuesta.jugada.columna;
        this.mensaje.set(respuesta.mensaje);
        this.cargarHistorial();
        this.cargarProbabilidades();
      },
      error: (error) => {
        this.mensaje.set(error?.error?.mensaje ?? 'Error al pedir jugada IA');
      }
    });
  }

  public registrarResultadoIa(): void {
    this.iaBuscaminasServicio
      .registrarResultado(this.filaResultadoIa, this.columnaResultadoIa, this.minasAlrededorResultadoIa)
      .subscribe({
        next: (respuesta) => {
          this.tablero.set(respuesta.tablero);
          this.mensaje.set(respuesta.mensaje);
          this.minasAlrededorResultadoIa = 0;
          this.tableroProbabilidadesTexto.set('');
          this.cargarHistorial();
        },
        error: (error) => {
          this.mensaje.set(error?.error?.mensaje ?? 'Error al registrar resultado IA');
        }
      });
  }

  public cargarHistorial(): void {
    this.iaBuscaminasServicio.verHistorial().subscribe({
      next: (respuesta) => {
        this.historial.set(respuesta.historial);
      },
      error: () => {
        this.historial.set([]);
      }
    });
  }

  public cargarProbabilidades(): void {
    this.iaBuscaminasServicio.verProbabilidades().subscribe({
      next: (respuesta) => {
        this.tableroProbabilidadesTexto.set(respuesta.tableroProbabilidades);
        this.tablero.set(respuesta.tablero);
      },
      error: () => {
        this.tableroProbabilidadesTexto.set('');
      }
    });
  }

  public obtenerTextoCasilla(casilla: Casilla): string {
    if (casilla.marcadaComoMina) {
      return 'M';
    }

    if (casilla.abierta) {
      return `${casilla.minasAlrededor ?? ''}`;
    }

    if (casilla.probabilidadMina > 0) {
      return `${casilla.probabilidadMina}%`;
    }

    return '';
  }

  public esCasillaSeleccionada(casilla: Casilla): boolean {
    const seleccionada = this.casillaSeleccionadaManual();

    if (!seleccionada) {
      return false;
    }

    return seleccionada.fila === casilla.fila && seleccionada.columna === casilla.columna;
  }

  public esCasillaRecomendadaPorIa(casilla: Casilla): boolean {
    const jugadaIa = this.jugadaIaActual();

    if (!jugadaIa) {
      return false;
    }

    return jugadaIa.fila === casilla.fila && jugadaIa.columna === casilla.columna;
  }

  public esCasillaConProbabilidad(casilla: Casilla): boolean {
    return !casilla.abierta && !casilla.marcadaComoMina && casilla.probabilidadMina > 0;
  }
}
