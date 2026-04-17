import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tablero } from '../interfaces/tablero.interface';
import { Jugada } from '../interfaces/jugada.interface';
import { HistorialJugada } from '../interfaces/historial-jugada.interface';

@Injectable({
  providedIn: 'root'
})
export class IaBuscaminasService {
  private http = inject(HttpClient);
  private urlBase = 'http://localhost:3000/ia';

  public crearTablero(totalMinas: number): Observable<{ mensaje: string; tablero: Tablero }> {
    return this.http.post<{ mensaje: string; tablero: Tablero }>(`${this.urlBase}/crear-tablero`, {
      totalMinas
    });
  }

  public registrarJugada(fila: number, columna: number, minasAlrededor: number): Observable<any> {
    return this.http.post(`${this.urlBase}/registrar-jugada`, {
      fila,
      columna,
      minasAlrededor
    });
  }

  public obtenerSiguienteJugada(): Observable<{ mensaje: string; jugada: Jugada; tablero: Tablero }> {
    return this.http.post<{ mensaje: string; jugada: Jugada; tablero: Tablero }>(
      `${this.urlBase}/siguiente-jugada`,
      {}
    );
  }

  public registrarResultado(fila: number, columna: number, minasAlrededor: number): Observable<any> {
    return this.http.post(`${this.urlBase}/registrar-resultado`, {
      fila,
      columna,
      minasAlrededor
    });
  }

  public reiniciarTablero(): Observable<any> {
    return this.http.post(`${this.urlBase}/reiniciar-tablero`, {});
  }

  public verHistorial(): Observable<{ mensaje: string; totalEventos: number; historial: HistorialJugada[] }> {
    return this.http.get<{ mensaje: string; totalEventos: number; historial: HistorialJugada[] }>(
      `${this.urlBase}/ver-historial`
    );
  }

  public verProbabilidades(): Observable<{ mensaje: string; tableroProbabilidades: string; tablero: Tablero }> {
    return this.http.get<{ mensaje: string; tableroProbabilidades: string; tablero: Tablero }>(
      `${this.urlBase}/ver-probabilidades`
    );
  }
}
