import { Tablero } from '../interfaces/tablero.interface';

export class EstadoJuegoServicio {
  
  private tableroActual: Tablero | null = null;

  private juegoPerdido: boolean = false;

  public guardarTablero(tablero: Tablero): void {
    // guarda el tablero actual tal cual viene del backend
    this.tableroActual = tablero;
  }

  public obtenerTablero(): Tablero | null {
    // devuelve el tablero actual o null si aun no hay nada
    return this.tableroActual;
  }

  public existeTablero(): boolean {
    return this.tableroActual !== null;
  }

  // Marca la partida como perdida, bloquea nuevas jugadas hasta reiniciar el tablero
  public marcarJuegoPerdido(): void {
    this.juegoPerdido = true;
  }

  public estaJuegoPerdido(): boolean {
    // se usa para cortar logica en el front cuando ya no se debe jugar
    return this.juegoPerdido;
  }

  //Limpia todo el estado para iniciar una partida desde cero
  public limpiarTablero(): void {
    // reseteo completo, como si nunca hubiera existido una partida
    this.tableroActual = null;
    this.juegoPerdido = false;
  }
}

export const estadoJuegoServicio = new EstadoJuegoServicio();