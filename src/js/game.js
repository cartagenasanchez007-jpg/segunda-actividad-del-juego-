import * as THREE from 'three';


const CONFIG = {
    GRAVEDAD: -32, VEL_CAMINAR: 6, VEL_CORRER: 9, ACELERACION: 40, FRICCION: 30,
    FUERZA_SALTO: 18, CORTE_SALTO: 0.45, VEL_MAX_CAIDA: -20, TIEMPO_COYOTE: 0.1,
    BUFFER_SALTO: 0.12, VIDAS_INICIALES: 3, TIEMPO_NIVEL: 300, LIMITE_CAIDA: -5,
    VEL_ENEMIGO: 1.5, INVULNERABLE: 2.0,
};


const MAPA_NIVEL = [
  "",
  "                                                                   ooo                               SS",
  "          G                                                        BBB                              SSS",
  "                              oooo                                                                 SSSS",
  "                              BBBB                    SS   S                                      SSSSS",
  "        GBGBG                                        SSS   SS     BGBGB          oo   GGG        SSSSSS",
  "                    C                     C         SSSS   SSS                                  SSSSSSS",
  "  P            E    C               E E   C    E   SSSSS   SSSS         E E               E    SSSSSSSS   F",
  "#########################  #############################   ######################  ###########################",
];
const SOLIDOS = new Set(["#", "B", "G", "S", "C", "U"]);

let estado = 'inicio';
let vidas = CONFIG.VIDAS_INICIALES;
let puntos = 0;
let gemasRecogidas = 0;
let tiempoRestante = CONFIG.TIEMPO_NIVEL;
let tiempoMuerte = 0;


const COLOR_CIELO = 0x6ec6ff;
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLOR_CIELO);
scene.fog = new THREE.Fog(COLOR_CIELO, 25, 60);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(5, 5, 14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

const luzAmbiente = new THREE.HemisphereLight(0xffffff, 0x7caa5c, 2.2);
scene.add(luzAmbiente);
const luzSol = new THREE.DirectionalLight(0xffffff, 2.6);
luzSol.castShadow = true;
luzSol.shadow.mapSize.set(2048, 2048);
luzSol.shadow.camera.left = -22; luzSol.shadow.camera.right = 22;
luzSol.shadow.camera.top = 15; luzSol.shadow.camera.bottom = -10;
scene.add(luzSol);
scene.add(luzSol.target);


const RUTA_TEXTURAS = './src/img/texture/';
const textureLoader = new THREE.TextureLoader();

function cargarTextura(archivo) {
    const textura = textureLoader.load(RUTA_TEXTURAS + archivo);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    return textura;
}

const texTierra = cargarTextura('ground.jpg');
const texTierraRelleno = cargarTextura('ground.jpg'); texTierraRelleno.repeat.set(1, 4);
const texSuelo = cargarTextura('pasto.jpg');
const texSueloLado = cargarTextura('suelo-lado.jpg');
const texLadrillo = cargarTextura('ladrillo.jpg');
const texSorpresa = cargarTextura('sorpresa.jpg');
const texUsado = cargarTextura('usado.jpg');
const texPiedra = cargarTextura('piedra.jpg');
const texColumna = cargarTextura('columna.jpg');

const matSueloLado = new THREE.MeshLambertMaterial({ map: texSueloLado });
const MATERIALES = {
    suelo: [matSueloLado, matSueloLado, new THREE.MeshLambertMaterial({ map: texSuelo }), new THREE.MeshLambertMaterial({ map: texTierra }), matSueloLado, matSueloLado],
    tierra: new THREE.MeshLambertMaterial({ map: texTierraRelleno }),
    ladrillo: new THREE.MeshLambertMaterial({ map: texLadrillo }),
    sorpresa: new THREE.MeshLambertMaterial({ map: texSorpresa, emissive: 0x332200 }),
    usado: new THREE.MeshLambertMaterial({ map: texUsado }),
    piedra: new THREE.MeshLambertMaterial({ map: texPiedra }),
    columna: new THREE.MeshLambertMaterial({ map: texColumna }),
    gema: new THREE.MeshPhongMaterial({ color: 0x26c6da, emissive: 0x0b5560, shininess: 100 }),
};

const GEO_BLOQUE = new THREE.BoxGeometry(1, 1, 1);
const GEO_TIERRA = new THREE.BoxGeometry(1, 4, 1);
const GEO_GEMA = new THREE.OctahedronGeometry(0.28);


function pieza(geometria, material, x, y, z) {
    const malla = new THREE.Mesh(geometria, material);
    malla.position.set(x, y, z);
    malla.castShadow = true;
    return malla;
}

function crearModeloJugador() {
    const grupo = new THREE.Group();
    const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x2ec4b6 });
    const matOscuro = new THREE.MeshLambertMaterial({ color: 0x1b2a41 });
    const matLuz = new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x664400 });
    const matOjo = new THREE.MeshBasicMaterial({ color: 0x7df9ff });
    
    const pIzq = pieza(new THREE.BoxGeometry(0.16, 0.2, 0.22), matOscuro, -0.14, 0.1, 0);
    const pDer = pieza(new THREE.BoxGeometry(0.16, 0.2, 0.22), matOscuro, 0.14, 0.1, 0);
    
    grupo.add(pIzq, pDer);
    grupo.add(pieza(new THREE.BoxGeometry(0.6, 0.4, 0.48), matCuerpo, 0, 0.4, 0));
    grupo.add(pieza(new THREE.BoxGeometry(0.56, 0.34, 0.5), matCuerpo, 0, 0.77, 0));
    grupo.add(pieza(new THREE.BoxGeometry(0.46, 0.2, 0.04), matOscuro, 0, 0.78, 0.26));
    grupo.add(pieza(new THREE.BoxGeometry(0.08, 0.1, 0.02), matOjo, -0.1, 0.79, 0.285));
    grupo.add(pieza(new THREE.BoxGeometry(0.08, 0.1, 0.02), matOjo, 0.1, 0.79, 0.285));
    grupo.add(pieza(new THREE.CylinderGeometry(0.025, 0.025, 0.2), matOscuro, 0, 1.03, 0));
    grupo.add(pieza(new THREE.SphereGeometry(0.07, 12, 12), matLuz, 0, 1.15, 0));
    grupo.add(pieza(new THREE.BoxGeometry(0.4, 0.32, 0.14), matLuz, 0, 0.42, -0.3));
    
    grupo.userData = { piernaIzq: pIzq, piernaDer: pDer };
    return grupo;
}

function crearModeloEnemigo() {
    const grupo = new THREE.Group();
    const matCuerpo = new THREE.MeshLambertMaterial({ color: 0x9b5de5 });
    const cuerpo = pieza(new THREE.SphereGeometry(0.42, 20, 16), matCuerpo, 0, 0.32, 0);
    cuerpo.scale.set(1, 0.78, 0.9);
    grupo.add(cuerpo);
    grupo.add(pieza(new THREE.SphereGeometry(0.1, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), -0.14, 0.42, 0.3));
    grupo.add(pieza(new THREE.SphereGeometry(0.1, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.14, 0.42, 0.3));
    grupo.add(pieza(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0x111111 }), -0.14, 0.42, 0.39));
    grupo.add(pieza(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0x111111 }), 0.14, 0.42, 0.39));
    return grupo;
}

function crearBandera(alto, colorTela) {
    const grupo = new THREE.Group();
    grupo.add(pieza(new THREE.CylinderGeometry(0.06, 0.06, alto), new THREE.MeshLambertMaterial({ color: 0xeeeeee }), 0, alto / 2, 0));
    const matTela = new THREE.MeshLambertMaterial({ color: colorTela, side: THREE.DoubleSide });
    const tela = pieza(new THREE.BoxGeometry(0.9, 0.6, 0.04), matTela, -0.48, alto - 0.4, 0);
    grupo.add(tela);
    grupo.userData.tela = tela;
    return grupo;
}


const grupoFondo = new THREE.Group();
scene.add(grupoFondo);

function crearFondo() {
    const geoMontana = new THREE.ConeGeometry(8, 15, 4);
    const matMontana = new THREE.MeshLambertMaterial({ color: 0x5c8a9e });
    for (let i = -5; i < 30; i += 6) {
        const montana = new THREE.Mesh(geoMontana, matMontana);
        montana.position.set(i, 2, -40);
        montana.rotation.y = Math.PI / 4;
        grupoFondo.add(montana);
    }
    const geoColina = new THREE.SphereGeometry(5, 16, 16);
    const matColina = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });
    for (let i = -5; i < 30; i += 4) {
        const colina = new THREE.Mesh(geoColina, matColina);
        colina.scale.set(1.5, 0.5, 1);
        colina.position.set(i + 2, -1, -25);
        grupoFondo.add(colina);
    }
    const geoNube = new THREE.SphereGeometry(1.5, 8, 8);
    const matNube = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -5; i < 30; i += 5) {
        const nube = new THREE.Group();
        nube.add(pieza(geoNube, matNube, 0, 0, 0));
        nube.add(pieza(geoNube, matNube, 1.2, 0.2, 0));
        nube.add(pieza(geoNube, matNube, -1.2, 0.2, 0));
        nube.position.set(i, 8 + Math.random() * 3, -15);
        nube.userData.velocidad = 0.5 + Math.random() * 0.5;
        grupoFondo.add(nube);
    }
}
crearFondo();

function actualizarFondo(dt) {
    for (let i = 0; i < grupoFondo.children.length; i++) {
        const obj = grupoFondo.children[i];
        if (obj.userData.velocidad) {
            obj.position.x -= obj.userData.velocidad * dt;
            if (obj.position.x < camera.position.x - 20) {
                obj.position.x = camera.position.x + 30;
            }
        }
    }
}


const sonidos = {};
const RUTA_AUDIO = './src/audio/';

function iniciarAudio() {
    const nombres = ['salto', 'romper', 'gema', 'enemigo', 'vida', 'musica'];
    for (let i = 0; i < nombres.length; i++) {
        const nombre = nombres[i];
        const audio = new Audio(RUTA_AUDIO + nombre + '.mp3');
        if (nombre === 'musica') {
            audio.loop = true;
            audio.volume = 0.2; 
        }
        sonidos[nombre] = audio;
    }
    if (sonidos.musica) {
        sonidos.musica.play().catch(function() {});
    }
}

function reproducirSonido(nombre) {
    if (sonidos[nombre]) {
        sonidos[nombre].currentTime = 0;
        
        // Control de volumen por efecto
        if (nombre === 'romper') sonidos[nombre].volume = 1.0;
        else if (nombre === 'vida') sonidos[nombre].volume = 1.0;
        else if (nombre === 'enemigo') sonidos[nombre].volume = 0.8;
        else if (nombre === 'gema') sonidos[nombre].volume = 0.7;
        else sonidos[nombre].volume = 0.4;

        sonidos[nombre].play().catch(function() {});
    }
}


let grupoNivel = null;
let bloques = new Map();
let gemas = [];
let enemigos = [];
let posicionInicial = { x: 2.5, y: 1 };
let banderaMeta = null;

function obtenerClave(x, y) { return x + "," + y; }

function construirNivel() {
    if (grupoNivel) scene.remove(grupoNivel);
    grupoNivel = new THREE.Group();
    scene.add(grupoNivel);
    
    bloques = new Map(); gemas = []; enemigos = [];
    banderaMeta = null;
    
    const alto = MAPA_NIVEL.length;
    for (let y = 0; y < alto; y++) {
        const fila = MAPA_NIVEL[y];
        const yMundo = alto - 1 - y;
        
        for (let x = 0; x < fila.length; x++) {
            const char = fila[x];
            if (SOLIDOS.has(char)) {
                crearBloque(x, yMundo, char);
            } else if (char === "o") {
                crearGema(x, yMundo);
            } else if (char === "E") {
                crearEnemigo(x, yMundo);
            } else if (char === "P") {
                posicionInicial = { x: x + 0.5, y: yMundo };
            } else if (char === "F") {
                const bandera = crearBandera(6, 0xff595e);
                bandera.position.set(x + 0.5, yMundo, 0);
                grupoNivel.add(bandera);
                banderaMeta = { x: x + 0.5, bandera: bandera };
            }
        }
    }
}

function crearBloque(x, y, tipo) {
    let material;
    if (tipo === "#") material = MATERIALES.suelo;
    else if (tipo === "B") material = MATERIALES.ladrillo;
    else if (tipo === "G") material = MATERIALES.sorpresa;
    else if (tipo === "S") material = MATERIALES.piedra;
    else if (tipo === "C") material = MATERIALES.columna;
    else if (tipo === "U") material = MATERIALES.usado;

    const malla = new THREE.Mesh(GEO_BLOQUE, material);
    malla.position.set(x + 0.5, y + 0.5, 0);
    malla.castShadow = true; malla.receiveShadow = true;
    grupoNivel.add(malla);
    bloques.set(obtenerClave(x, y), { x: x, y: y, tipo: tipo, malla: malla });
    
    if (tipo === "#") {
        const tierra = new THREE.Mesh(GEO_TIERRA, MATERIALES.tierra);
        tierra.position.set(x + 0.5, y - 1.5, 0);
        tierra.receiveShadow = true; grupoNivel.add(tierra);
    }
}

function crearGema(x, y) {
    const malla = new THREE.Mesh(GEO_GEMA, MATERIALES.gema);
    malla.position.set(x + 0.5, y + 0.5, 0); malla.castShadow = true;
    grupoNivel.add(malla);
    gemas.push({ x: x, y: y, malla: malla, recogida: false });
}

function crearEnemigo(x, y) {
    const malla = crearModeloEnemigo(); grupoNivel.add(malla);
    enemigos.push({ x: x + 0.5, y: y, vx: 0, vy: 0, ancho: 0.8, alto: 0.7, direccion: -1, vivo: true, malla: malla });
}


function obtenerBloque(tx, ty) { return bloques.get(obtenerClave(tx, ty)) || null; }

function bloquesQueToca(ent) {
    const resultado = [];
    const izq = Math.floor(ent.x - ent.ancho / 2), der = Math.floor(ent.x + ent.ancho / 2 - 0.001);
    const abj = Math.floor(ent.y), arr = Math.floor(ent.y + ent.alto - 0.001);
    for (let tx = izq; tx <= der; tx++) {
        for (let ty = abj; ty <= arr; ty++) {
            const b = obtenerBloque(tx, ty); 
            if (b) resultado.push(b);
        }
    }
    return resultado;
}

function moverEntidad(ent, dt, alGolpearTecho) {
    ent.chocoPared = false; 
    ent.x += ent.vx * dt;
    let choques = bloquesQueToca(ent);
    if (choques.length > 0) {
        if (ent.vx > 0) ent.x = Math.min.apply(null, choques.map(function(b){return b.x;})) - ent.ancho / 2 - 0.001;
        else if (ent.vx < 0) ent.x = Math.max.apply(null, choques.map(function(b){return b.x;})) + 1 + ent.ancho / 2 + 0.001;
        ent.vx = 0; ent.chocoPared = true;
    }
    ent.y += ent.vy * dt; ent.enSuelo = false;
    choques = bloquesQueToca(ent);
    if (choques.length > 0) {
        if (ent.vy < 0) { 
            ent.y = Math.max.apply(null, choques.map(function(b){return b.y;})) + 1; 
            ent.enSuelo = true; 
        } else if (ent.vy > 0) {
            ent.y = Math.min.apply(null, choques.map(function(b){return b.y;})) - ent.alto - 0.001;
            if (alGolpearTecho) alGolpearTecho(choques);
        }
        ent.vy = 0;
    }
}

function seSuperponen(a, b) {
    return Math.abs(a.x - b.x) < (a.ancho + b.ancho) / 2 && a.y < b.y + b.alto && a.y + a.alto > b.y;
}


const jugador = { 
    x: 0, y: 0, vx: 0, vy: 0, ancho: 0.7, alto: 0.9, enSuelo: false, mirando: 1, 
    tiempoCoyote: 0, bufferSalto: 0, saltando: false, invulnerable: 0, tiempoAnimacion: 0, 
    malla: crearModeloJugador() 
};
scene.add(jugador.malla);

function reaparecerJugador() {
    jugador.x = posicionInicial.x; jugador.y = posicionInicial.y; 
    jugador.vx = 0; jugador.vy = 0; jugador.mirando = 1;
    jugador.invulnerable = CONFIG.INVULNERABLE; 
    jugador.malla.rotation.set(0, 0, 0); jugador.malla.visible = true;
}

const teclas = {};
window.addEventListener('keydown', function(e) {
    teclas[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
    }
    if (!e.repeat && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && estado === 'jugando') {
        jugador.bufferSalto = CONFIG.BUFFER_SALTO;
    }
    if (e.code === 'KeyP') alternarPausa();
    if (e.code === 'KeyR' && estado !== 'inicio') iniciarJuego();
});
window.addEventListener('keyup', function(e) { teclas[e.code] = false; });

function teclaIzquierda() { return teclas['ArrowLeft'] || teclas['KeyA']; }
function teclaDerecha() { return teclas['ArrowRight'] || teclas['KeyD']; }
function teclaSalto() { return teclas['Space'] || teclas['ArrowUp'] || teclas['KeyW']; }
function teclaCorrer() { return teclas['ShiftLeft'] || teclas['ShiftRight']; }


const ui = {
    vidas: document.getElementById('hud-vidas'), gemas: document.getElementById('hud-gemas'), 
    puntos: document.getElementById('hud-puntos'), tiempo: document.getElementById('hud-tiempo'),
    inicio: document.getElementById('pantalla-inicio'), pausa: document.getElementById('pantalla-pausa'), 
    fin: document.getElementById('pantalla-fin')
};

function actualizarHUD() {
    ui.vidas.textContent = vidas; 
    ui.gemas.textContent = gemasRecogidas;
    ui.puntos.textContent = String(puntos).padStart(6, '0'); 
    ui.tiempo.textContent = Math.ceil(tiempoRestante);
}

document.getElementById('btn-jugar').addEventListener('click', iniciarJuego);
document.getElementById('btn-reiniciar').addEventListener('click', iniciarJuego);

function iniciarJuego() {
    vidas = CONFIG.VIDAS_INICIALES; puntos = 0; gemasRecogidas = 0; tiempoRestante = CONFIG.TIEMPO_NIVEL;
    construirNivel(); reaparecerJugador(); camera.position.set(8, 4.5, 14);
    ui.inicio.classList.add('oculto'); ui.fin.classList.add('oculto'); ui.pausa.classList.add('oculto');
    estado = 'jugando';
    iniciarAudio();
}

function alternarPausa() {
    if (estado === 'jugando') { estado = 'pausa'; ui.pausa.classList.remove('oculto'); }
    else if (estado === 'pausa') { estado = 'jugando'; ui.pausa.classList.add('oculto'); reloj.getDelta(); }
}

function perderVida(animacion) {
    vidas--; estado = 'muriendo'; tiempoMuerte = 1.4; 
    jugador.vy = animacion ? 12 : 0; jugador.vx = 0; 
    reproducirSonido('vida');
}


const reloj = new THREE.Clock();

function animate() {
    const dt = Math.min(reloj.getDelta(), 1 / 30);
    const tiempo = reloj.elapsedTime;

    if (estado === 'jugando') {
        const j = jugador;
        let dir = 0; if (teclaIzquierda()) dir -= 1; if (teclaDerecha()) dir += 1;
        const velMax = teclaCorrer() ? CONFIG.VEL_CORRER : CONFIG.VEL_CAMINAR;
        
        if (dir !== 0) { 
            j.vx += dir * CONFIG.ACELERACION * dt; 
            j.vx = Math.max(-velMax, Math.min(velMax, j.vx)); 
            j.mirando = dir; 
        } else { 
            const freno = CONFIG.FRICCION * dt; 
            j.vx = Math.abs(j.vx) <= freno ? 0 : j.vx - Math.sign(j.vx) * freno; 
        }
        
        j.tiempoCoyote = j.enSuelo ? CONFIG.TIEMPO_COYOTE : j.tiempoCoyote - dt; 
        j.bufferSalto -= dt;
        if (j.bufferSalto > 0 && j.tiempoCoyote > 0) { 
            j.vy = CONFIG.FUERZA_SALTO; j.bufferSalto = 0; j.tiempoCoyote = 0; j.saltando = true; 
            reproducirSonido('salto'); 
        }
        if (j.saltando && !teclaSalto() && j.vy > 0) { j.vy *= CONFIG.CORTE_SALTO; j.saltando = false; }
        if (j.vy <= 0) j.saltando = false;
        
        j.vy += CONFIG.GRAVEDAD * dt; 
        j.vy = Math.max(j.vy, CONFIG.VEL_MAX_CAIDA);
        
        
        moverEntidad(j, dt, function(bloques) {
            const bloque = bloques[0];
            if (bloque.tipo === 'B') { 
                grupoNivel.remove(bloque.malla); 
                bloques.delete(obtenerClave(bloque.x, bloque.y)); 
                puntos += 50; 
                reproducirSonido('romper'); 
            } 
            else if (bloque.tipo === 'G') {
                bloque.tipo = 'U'; 
                bloque.malla.material = MATERIALES.usado; 
                
                const nuevaGema = new THREE.Mesh(GEO_GEMA, MATERIALES.gema);
                nuevaGema.position.set(bloque.x + 0.5, bloque.y + 1.2, 0);
                nuevaGema.castShadow = true;
                grupoNivel.add(nuevaGema);
                
                gemas.push({ 
                    x: bloque.x, 
                    y: bloque.y + 1, 
                    malla: nuevaGema, 
                    recogida: false 
                });

                reproducirSonido('gema');
            }
        });

        if (j.x < j.ancho / 2) { j.x = j.ancho / 2; j.vx = 0; }
        if (j.y < CONFIG.LIMITE_CAIDA) { perderVida(false); return; }
        
        
        j.malla.position.set(j.x, j.y, 0);
        j.malla.rotation.y += (j.mirando * 0.9 - j.malla.rotation.y) * Math.min(1, 12 * dt);
        
        const piernas = j.malla.userData;
        if (j.enSuelo && Math.abs(j.vx) > 0.5) {
            j.tiempoAnimacion += dt * Math.abs(j.vx) * 2.2;
            piernas.piernaIzq.position.y = 0.1 + Math.max(0, Math.sin(j.tiempoAnimacion)) * 0.08;
            piernas.piernaDer.position.y = 0.1 + Math.max(0, -Math.sin(j.tiempoAnimacion)) * 0.08;
        } else {
            piernas.piernaIzq.position.y = 0.1;
            piernas.piernaDer.position.y = 0.1;
        }

        j.malla.visible = j.invulnerable > 0 ? Math.floor(j.invulnerable * 12) % 2 === 0 : true;
        if (j.invulnerable > 0) j.invulnerable -= dt;

       
        for (let i = 0; i < enemigos.length; i++) {
            const en = enemigos[i];
            if (!en.vivo) continue;
            en.vx = en.direccion * CONFIG.VEL_ENEMIGO; 
            en.vy += CONFIG.GRAVEDAD * dt; 
            moverEntidad(en, dt);
            if (en.chocoPared) en.direccion *= -1;
            if (en.enSuelo) { 
                const pie = Math.floor(en.x + en.direccion * (en.ancho / 2 + 0.05)); 
                if (!obtenerBloque(pie, Math.floor(en.y - 0.1))) en.direccion *= -1; 
            }
            en.malla.position.set(en.x, en.y, 0);
            
            if (seSuperponen(j, en)) {
                if (j.vy < 0 && j.y > en.y + en.alto * 0.4) { 
                    en.vivo = false; en.malla.scale.set(1.2, 0.25, 1.2); 
                    j.vy = CONFIG.FUERZA_SALTO * 0.65; puntos += 200; 
                    reproducirSonido('enemigo'); 
                } else if (j.invulnerable <= 0) {
                    perderVida(true);
                }
            }
        }

        
        for (let i = 0; i < gemas.length; i++) {
            const g = gemas[i];
            if (!g.recogida) {
                g.malla.rotation.y = tiempo * 2;
                g.malla.position.y = g.y + 0.5 + Math.sin(tiempo * 3 + g.x) * 0.08;
            }
            if (!g.recogida && seSuperponen(j, { x: g.x + 0.5, y: g.y + 0.15, ancho: 0.6, alto: 0.7 })) {
                g.recogida = true; 
                grupoNivel.remove(g.malla); 
                puntos += 100; gemasRecogidas++; 
                reproducirSonido('gema');
            }
        }

        
        camera.position.x += (Math.max(8, j.x + 2) - camera.position.x) * Math.min(1, 5 * dt);
        camera.position.y += (Math.max(4.5, j.y + 3) - camera.position.y) * Math.min(1, 5 * dt);
        camera.lookAt(camera.position.x, camera.position.y - 2, 0);
        luzSol.position.set(camera.position.x - 6, 18, 12);
        luzSol.target.position.set(camera.position.x, 0, 0);
        
        actualizarHUD();
        tiempoRestante -= dt;
        if (tiempoRestante <= 0) perderVida(true);

    } else if (estado === 'muriendo') {
        tiempoMuerte -= dt; 
        jugador.vy += CONFIG.GRAVEDAD * dt; 
        jugador.y += jugador.vy * dt;
        jugador.malla.position.set(jugador.x, jugador.y, 0); 
        jugador.malla.rotation.z += dt * 8;
        
        if (tiempoMuerte <= 0) { 
            if (vidas <= 0) { estado = 'fin'; ui.fin.classList.remove('oculto'); } 
            else { reaparecerJugador(); tiempoRestante = CONFIG.TIEMPO_NIVEL; estado = 'jugando'; } 
        }
    }

    actualizarFondo(dt);
    renderer.render(scene, camera);
}

// Iniciar
ui.inicio.classList.remove('oculto');
construirNivel();
reaparecerJugador();
renderer.setAnimationLoop(animate);