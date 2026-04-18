import { Router } from 'express';
import { IAControlador } from '../controladores/ia.controlador';

const router = Router();
const controlador = new IAControlador();

router.post('/tablero',   controlador.crearTablero);
router.get('/tablero',    controlador.verTablero);
router.post('/resultado', controlador.registrarResultado);
router.post('/mina',      controlador.registrarMina);
router.post('/reiniciar', controlador.reiniciarTablero);

export default router;