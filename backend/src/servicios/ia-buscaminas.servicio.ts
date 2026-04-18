import { Casilla } from '../interfaces/casilla.interface';
import { Jugada } from '../interfaces/jugada.interface';
import { Tablero } from '../interfaces/tablero.interface';

interface GrupoAnalisis {
  filaCentral: number;
  columnaCentral: number;
  casillasCerradas: Casilla[];
  minasFaltantes: number;
}

export class IABuscaminasServicio {
  private ultimaJugadaRecomendada: { fila: number; columna: number } | null = null;

  public obtenerSiguienteJugada(tablero: Tablero): Jugada {
    const casillasDisponibles = this.obtenerCasillasDisponibles(tablero);

    if (casillasDisponibles.length === 0) {
      throw new Error('Ya no hay casillas disponibles para recomendar');
    }

    this.limpiarRecomendaciones(tablero);
    this.limpiarProbabilidades(tablero);

    const jugadaSeguraBasica = this.buscarJugadaSeguraPorLogica(tablero);

    if (jugadaSeguraBasica) {
      this.ultimaJugadaRecomendada = {
        fila: jugadaSeguraBasica.fila,
        columna: jugadaSeguraBasica.columna
      };
      return jugadaSeguraBasica;
    }

    this.aplicarComparacionDeGrupos(tablero);

    const jugadaSeguraTrasComparacion = this.buscarJugadaSeguraPorLogica(tablero);

    if (jugadaSeguraTrasComparacion) {
      this.ultimaJugadaRecomendada = {
        fila: jugadaSeguraTrasComparacion.fila,
        columna: jugadaSeguraTrasComparacion.columna
      };
      return jugadaSeguraTrasComparacion;
    }

    const casillasDisponiblesActualizadas = this.obtenerCasillasDisponibles(tablero);

    if (casillasDisponiblesActualizadas.length === 0) {
      throw new Error('Ya no hay casillas disponibles para recomendar');
    }

    const jugadaEstadistica = this.buscarJugadaPorEstadistica(tablero, casillasDisponiblesActualizadas);

    this.ultimaJugadaRecomendada = {
      fila: jugadaEstadistica.fila,
      columna: jugadaEstadistica.columna
    };

    return jugadaEstadistica;
  }

  private obtenerCasillasDisponibles(tablero: Tablero): Casilla[] {
    const casillasDisponibles: Casilla[] = [];

    for (let fila = 0; fila < tablero.totalFilas; fila++) {
      for (let columna = 0; columna < tablero.totalColumnas; columna++) {
        const casillaActual = tablero.matriz[fila][columna];

        // Lógica de la casilla [fila, columna]: una casilla disponible es una que sigue cerrada y no está marcada como mina.
        if (!casillaActual.abierta && !casillaActual.marcadaComoMina) {
          casillasDisponibles.push(casillaActual);
        }
      }
    }

    return casillasDisponibles;
  }

  private limpiarRecomendaciones(tablero: Tablero): void {
    for (let fila = 0; fila < tablero.totalFilas; fila++) {
      for (let columna = 0; columna < tablero.totalColumnas; columna++) {
        // Lógica de la casilla [fila, columna]: se reinicia la recomendación antes de volver a evaluar el tablero.
        tablero.matriz[fila][columna].recomendacion = 0;
      }
    }
  }

  private limpiarProbabilidades(tablero: Tablero): void {
    for (let fila = 0; fila < tablero.totalFilas; fila++) {
      for (let columna = 0; columna < tablero.totalColumnas; columna++) {
        // Lógica de la casilla [fila, columna]: se limpia la probabilidad anterior para recalcular el riesgo actual.
        tablero.matriz[fila][columna].probabilidadMina = 0;
      }
    }
  }

  private buscarJugadaSeguraPorLogica(tablero: Tablero): Jugada | null {
    const minasParaMarcar: Casilla[] = [];

    for (let fila = 0; fila < tablero.totalFilas; fila++) {
      for (let columna = 0; columna < tablero.totalColumnas; columna++) {
        const casillaCentral = tablero.matriz[fila][columna];

        // Lógica de la casilla [fila, columna]: solo se analizan casillas abiertas con número conocido.
        if (!casillaCentral.abierta || casillaCentral.minasAlrededor === null) {
          continue;
        }

        const vecinos = this.obtenerVecinos(tablero, fila, columna);
        const vecinosCerrados = vecinos.filter((v) => !v.abierta && !v.marcadaComoMina);
        const vecinosMarcadosComoMina = vecinos.filter((v) => v.marcadaComoMina);
        const minasFaltantes = casillaCentral.minasAlrededor - vecinosMarcadosComoMina.length;

        // Lógica de la casilla [fila, columna]: si ya se cubrieron sus minas, el resto de vecinos cerrados son seguros.
        if (minasFaltantes === 0 && vecinosCerrados.length > 0) {
          const casillaSegura = this.elegirMejorCasillaSegura(vecinosCerrados);
          casillaSegura.recomendacion = 100;
          casillaSegura.probabilidadMina = 0;

          // Aplicar las minas recolectadas antes de retornar
          this.aplicarMarcasMinas(minasParaMarcar);

          return {
            fila: casillaSegura.fila,
            columna: casillaSegura.columna,
            motivo: `Casilla segura deducida alrededor de [${fila}, ${columna}]`,
            probabilidadMina: 0,
            recomendacion: 100
          };
        }

        // Lógica de la casilla [fila, columna]: si las cerradas coinciden exactamente con las minas faltantes, todas son minas.
        if (minasFaltantes > 0 && vecinosCerrados.length === minasFaltantes) {
          for (const vecino of vecinosCerrados) {
            if (!minasParaMarcar.some((m) => m.fila === vecino.fila && m.columna === vecino.columna)) {
              minasParaMarcar.push(vecino);
            }
          }
        }
      }
    }

    // Aplicar todas las minas recolectadas en este pase
    this.aplicarMarcasMinas(minasParaMarcar);

    return null;
  }

  private aplicarMarcasMinas(minas: Casilla[]): void {
    for (const mina of minas) {
      mina.marcadaComoMina = true;
      mina.probabilidadMina = 100;
      mina.recomendacion = -100;
    }
  }

  private aplicarComparacionDeGrupos(tablero: Tablero): void {
    const grupos = this.construirGruposAnalisis(tablero);

    for (let i = 0; i < grupos.length; i++) {
      for (let j = 0; j < grupos.length; j++) {
        if (i === j) continue;

        const grupoA = grupos[i];
        const grupoB = grupos[j];

        if (grupoA.casillasCerradas.length === 0 || grupoB.casillasCerradas.length === 0) {
          continue;
        }

        const grupoAIncluidoEnGrupoB = this.esSubconjunto(grupoA.casillasCerradas, grupoB.casillasCerradas);

        // Lógica de grupos [grupoA.filaCentral, grupoA.columnaCentral] y [grupoB.filaCentral, grupoB.columnaCentral]:
        // solo sirve comparar si el grupo pequeño está contenido en el grande.
        if (!grupoAIncluidoEnGrupoB) {
          continue;
        }

        const casillasDiferencia = this.obtenerDiferenciaDeCasillas(
          grupoB.casillasCerradas,
          grupoA.casillasCerradas
        );

        if (casillasDiferencia.length === 0) {
          continue;
        }

        const diferenciaMinas = grupoB.minasFaltantes - grupoA.minasFaltantes;

        // Si la diferencia de minas coincide con las casillas extra, todas son minas.
        if (diferenciaMinas > 0 && diferenciaMinas === casillasDiferencia.length) {
          for (const casillaMina of casillasDiferencia) {
            // Lógica de la casilla diferencia [casillaMina.fila, casillaMina.columna]: se marca como mina por relación entre grupos.
            casillaMina.marcadaComoMina = true;
            casillaMina.probabilidadMina = 100;
            casillaMina.recomendacion = -100;
          }
        }
      }
    }
  }

  private construirGruposAnalisis(tablero: Tablero): GrupoAnalisis[] {
    const grupos: GrupoAnalisis[] = [];

    for (let fila = 0; fila < tablero.totalFilas; fila++) {
      for (let columna = 0; columna < tablero.totalColumnas; columna++) {
        const casillaCentral = tablero.matriz[fila][columna];

        // Lógica de la casilla [fila, columna]: solo una pista abierta genera un grupo útil de análisis.
        if (!casillaCentral.abierta || casillaCentral.minasAlrededor === null) {
          continue;
        }

        const vecinos = this.obtenerVecinos(tablero, fila, columna);
        const vecinosCerrados = vecinos.filter((v) => !v.abierta && !v.marcadaComoMina);
        const vecinosMarcadosComoMina = vecinos.filter((v) => v.marcadaComoMina);
        const minasFaltantes = casillaCentral.minasAlrededor - vecinosMarcadosComoMina.length;

        if (vecinosCerrados.length === 0 || minasFaltantes < 0) {
          continue;
        }

        grupos.push({
          filaCentral: fila,
          columnaCentral: columna,
          casillasCerradas: vecinosCerrados,
          minasFaltantes
        });
      }
    }

    return grupos;
  }

  private esSubconjunto(casillasPequenas: Casilla[], casillasGrandes: Casilla[]): boolean {
    for (const casillaPequena of casillasPequenas) {
      const existe = casillasGrandes.some(
        (c) => c.fila === casillaPequena.fila && c.columna === casillaPequena.columna
      );
      if (!existe) return false;
    }
    return true;
  }

  private obtenerDiferenciaDeCasillas(origen: Casilla[], referencia: Casilla[]): Casilla[] {
    return origen.filter(
      (casillaOrigen) =>
        !referencia.some(
          (c) => c.fila === casillaOrigen.fila && c.columna === casillaOrigen.columna
        )
    );
  }

  private buscarJugadaPorEstadistica(tablero: Tablero, casillasDisponibles: Casilla[]): Jugada {
    this.calcularRiesgosPorCasillasAbiertas(tablero);

    // Asignar probabilidades y calcular la mínima
    let probabilidadMinima = Infinity;

    for (const casilla of casillasDisponibles) {
      if (casilla.probabilidadMina === 0) {
        casilla.probabilidadMina = 50;
      }

      // Lógica de la casilla [casilla.fila, casilla.columna]: a menor riesgo, mayor recomendación.
      casilla.recomendacion = 100 - casilla.probabilidadMina;

      if (casilla.probabilidadMina < probabilidadMinima) {
        probabilidadMinima = casilla.probabilidadMina;
      }
    }

    // Recolectar todas las casillas con la probabilidad mínima,
    // excluyendo la última jugada recomendada si hay otras opciones disponibles.
    const candidatas = casillasDisponibles.filter(
      (c) => c.probabilidadMina === probabilidadMinima && !this.esLaMismaUltimaJugada(c)
    );

    // Si todas las candidatas son la última jugada (caso extremo de 1 casilla),
    // usar todas las de probabilidad mínima sin filtrar.
    const pool = candidatas.length > 0
      ? candidatas
      : casillasDisponibles.filter((c) => c.probabilidadMina === probabilidadMinima);

    if (pool.length === 0) {
      throw new Error('No fue posible determinar una jugada');
    }

    // Elegir al azar entre las candidatas para no empezar siempre en el mismo lugar.
    const indiceAleatorio = Math.floor(Math.random() * pool.length);
    const mejorCasilla = pool[indiceAleatorio];

    return {
      fila: mejorCasilla.fila,
      columna: mejorCasilla.columna,
      motivo: 'Jugada elegida por análisis estadístico mejorado',
      probabilidadMina: mejorCasilla.probabilidadMina,
      recomendacion: mejorCasilla.recomendacion
    };
  }

  private calcularRiesgosPorCasillasAbiertas(tablero: Tablero): void {
    for (let fila = 0; fila < tablero.totalFilas; fila++) {
      for (let columna = 0; columna < tablero.totalColumnas; columna++) {
        const casillaCentral = tablero.matriz[fila][columna];

        // Lógica de la casilla [fila, columna]: solo una pista abierta reparte riesgo a sus vecinas cerradas.
        if (!casillaCentral.abierta || casillaCentral.minasAlrededor === null) {
          continue;
        }

        const vecinos = this.obtenerVecinos(tablero, fila, columna);
        const vecinosCerrados = vecinos.filter((v) => !v.abierta && !v.marcadaComoMina);
        const vecinosMarcadosComoMina = vecinos.filter((v) => v.marcadaComoMina);
        const minasFaltantes = casillaCentral.minasAlrededor - vecinosMarcadosComoMina.length;

        if (minasFaltantes <= 0 || vecinosCerrados.length === 0) continue;

        const riesgoEstimado = Math.round((minasFaltantes / vecinosCerrados.length) * 100);

        for (const vecino of vecinosCerrados) {
          // Lógica de la casilla vecina [vecino.fila, vecino.columna]: se conserva el riesgo más alto detectado entre todas sus pistas cercanas.
          if (riesgoEstimado > vecino.probabilidadMina) {
            vecino.probabilidadMina = riesgoEstimado;
          }
        }
      }
    }
  }

  private obtenerVecinos(tablero: Tablero, fila: number, columna: number): Casilla[] {
    const vecinos: Casilla[] = [];

    for (let df = -1; df <= 1; df++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (df === 0 && dc === 0) continue;

        const nuevaFila = fila + df;
        const nuevaColumna = columna + dc;

        if (
          nuevaFila >= 0 &&
          nuevaFila < tablero.totalFilas &&
          nuevaColumna >= 0 &&
          nuevaColumna < tablero.totalColumnas
        ) {
          vecinos.push(tablero.matriz[nuevaFila][nuevaColumna]);
        }
      }
    }

    return vecinos;
  }

  private elegirMejorCasillaSegura(casillasSeguras: Casilla[]): Casilla {
    let mejorCasilla = casillasSeguras[0];

    for (const casilla of casillasSeguras) {
      // Lógica de la casilla segura [casilla.fila, casilla.columna]: se evita repetir la última recomendación si hay otra disponible.
      if (!this.esLaMismaUltimaJugada(casilla)) {
        mejorCasilla = casilla;
        break;
      }
    }

    return mejorCasilla;
  }

  private esLaMismaUltimaJugada(casilla: Casilla): boolean {
    if (!this.ultimaJugadaRecomendada) {
      return false;
    }

    return (
      casilla.fila === this.ultimaJugadaRecomendada.fila &&
      casilla.columna === this.ultimaJugadaRecomendada.columna
    );
  }
}