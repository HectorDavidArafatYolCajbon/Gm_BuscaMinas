import { Request, Response } from 'express';
import { TableroModelo } from '../modelos/tablero.modelo';
import { estadoJuegoServicio } from '../servicios/estado-juego.servicio';
import { IABuscaminasServicio } from '../servicios/ia-buscaminas.servicio';

export class IAControlador {
  private tableroModelo = new TableroModelo();
  private iaBuscaminasServicio = new IABuscaminasServicio();


  public crearTablero = (req: Request, res: Response): void => {
    try {
      // tablero nuevo, sin minas, sin nada
      const tablero = this.tableroModelo.crearTableroVacio();
      estadoJuegoServicio.guardarTablero(tablero);

      // La IA escoge su primera jugada automaticamente
      const primeraJugada = this.iaBuscaminasServicio.obtenerSiguienteJugada(tablero);
      estadoJuegoServicio.guardarTablero(tablero);

      res.status(201).json({
        mensaje: 'Tablero creado. La IA ya escogió su primera casilla.',
        jugada: primeraJugada,
        tablero
      });
    } catch (error) {
      res.status(500).json({
        mensaje: 'Error al crear el tablero',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  public registrarResultado = (req: Request, res: Response): void => {
    try {
      // sin tablero no hay nada que hacer
      if (!estadoJuegoServicio.existeTablero()) {
        res.status(400).json({ mensaje: 'Primero debes crear un tablero' });
        return;
      }

      if (estadoJuegoServicio.estaJuegoPerdido()) {
        res.status(400).json({ mensaje: 'El juego ya fue perdido. Reinicia para continuar.' });
        return;
      }

      const { fila, columna, minasAlrededor } = req.body;

      // validaciones por si mandan cualquier cosa
      if (typeof fila !== 'number' || typeof columna !== 'number' || typeof minasAlrededor !== 'number') {
        res.status(400).json({ mensaje: 'Debes enviar fila, columna y minasAlrededor como números' });
        return;
      }

      if (fila < 0 || fila >= 10 || columna < 0 || columna >= 10) {
        res.status(400).json({ mensaje: 'Fila o columna fuera del rango 0-9' });
        return;
      }

      if (minasAlrededor < 0 || minasAlrededor > 8) {
        res.status(400).json({ mensaje: 'Minas alrededor debe estar entre 0 y 8' });
        return;
      }

      const tablero = estadoJuegoServicio.obtenerTablero()!;
      const casilla = tablero.matriz[fila][columna];

      if (casilla.abierta) {
        res.status(400).json({ mensaje: 'Esa casilla ya fue abierta anteriormente' });
        return;
      }

      // Registrar la informacion que el usuario informo sobre esta casilla
      casilla.abierta = true;
      casilla.minasAlrededor = minasAlrededor;
      casilla.fueIntentada = true;
      casilla.probabilidadMina = 0;
      casilla.recomendacion = 0;

      estadoJuegoServicio.guardarTablero(tablero);

      // Con la nueva informacion, la IA calcula su siguiente jugada
      const siguienteJugada = this.iaBuscaminasServicio.obtenerSiguienteJugada(tablero);
      estadoJuegoServicio.guardarTablero(tablero);

      res.status(200).json({
        mensaje: 'Resultado registrado. La IA ya escogió la siguiente casilla.',
        casillaAbierta: { fila, columna, minasAlrededor },
        jugada: siguienteJugada,
        tablero
      });
    } catch (error) {
      res.status(500).json({
        mensaje: 'Error al registrar el resultado',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  public registrarMina = (req: Request, res: Response): void => {
    try {
      if (!estadoJuegoServicio.existeTablero()) {
        res.status(400).json({ mensaje: 'Primero debes crear un tablero' });
        return;
      }

      if (estadoJuegoServicio.estaJuegoPerdido()) {
        res.status(400).json({ mensaje: 'El juego ya estaba perdido. Reinicia para continuar.' });
        return;
      }

      const { fila, columna } = req.body;

      if (typeof fila !== 'number' || typeof columna !== 'number') {
        res.status(400).json({ mensaje: 'Debes enviar fila y columna como números' });
        return;
      }

      if (fila < 0 || fila >= 10 || columna < 0 || columna >= 10) {
        res.status(400).json({ mensaje: 'Fila o columna fuera del rango 0-9' });
        return;
      }

      // adios partida
      estadoJuegoServicio.marcarJuegoPerdido();

      res.status(200).json({
        mensaje: `Mina en [${fila}, ${columna}]. Juego perdido. Reinicia para una nueva partida.`,
        juegoPerdido: true,
        posicionMina: { fila, columna }
      });
    } catch (error) {
      res.status(500).json({
        mensaje: 'Error al registrar la mina',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  public reiniciarTablero = (req: Request, res: Response): void => {
    try {
      estadoJuegoServicio.limpiarTablero();

      // IA nueva, sin recuerdos de la partida anterior
      this.iaBuscaminasServicio = new IABuscaminasServicio();

      res.status(200).json({
        mensaje: 'Tablero reiniciado. Crea un nuevo tablero para empezar.'
      });
    } catch (error) {
      res.status(500).json({
        mensaje: 'Error al reiniciar el tablero',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };

  public verTablero = (req: Request, res: Response): void => {
    try {
      if (!estadoJuegoServicio.existeTablero()) {
        res.status(400).json({ mensaje: 'No hay tablero activo. Crea uno primero.' });
        return;
      }

      res.status(200).json({
        mensaje: 'Tablero obtenido correctamente',
        juegoPerdido: estadoJuegoServicio.estaJuegoPerdido(),
        tablero: estadoJuegoServicio.obtenerTablero()
      });
    } catch (error) {
      res.status(500).json({
        mensaje: 'Error al obtener el tablero',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  };
}