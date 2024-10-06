// Crear la escena
const scene = new THREE.Scene();

// Crear la cámara
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5; // Define el zoom por defecto ajustando la posición z

// Crear el renderizador y agregarlo al DOM
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controles de órbita
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Limitar el zoom in y zoom out
controls.minDistance = 1.2; // Distancia mínima a la esfera para evitar atravesar la malla
controls.maxDistance = 10;  // Distancia máxima para que no se aleje demasiado

// Definir un nivel de zoom por defecto (opcional)
camera.zoom = 3; // Ajusta el zoom predeterminado
camera.updateProjectionMatrix(); // Actualizar la proyección para aplicar el zoom

// Crear la geometría de la primera esfera (Tierra)
const sphereGeometry = new THREE.SphereGeometry(1, 720, 360);
const material = new THREE.MeshPhongMaterial();
const texture = new THREE.TextureLoader().load("img/texturaH1.png");
material.map = texture;
const displacementMap = new THREE.TextureLoader().load("img/relieve.jpg");
material.displacementMap = displacementMap;
material.displacementScale = 0.1;
const sphere = new THREE.Mesh(sphereGeometry, material);
scene.add(sphere);

// Cargar la textura de temperatura (temp.png)
const temperatureTexture = new THREE.TextureLoader().load('img/temp.png');
temperatureTexture.minFilter = THREE.LinearFilter;
temperatureTexture.magFilter = THREE.LinearFilter;
temperatureTexture.wrapS = THREE.RepeatWrapping;
temperatureTexture.wrapT = THREE.RepeatWrapping;

// Shader personalizado para la escala de temperatura (de azul a rojo)
const temperatureShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
        temperatureMap: { value: temperatureTexture }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D temperatureMap;
        varying vec2 vUv;

        void main() {
            // Obtener el valor de la textura en escala de grises
            vec4 tempValue = texture2D(temperatureMap, vUv);
            float temperature = tempValue.r;

            // Interpolar entre azul (frío) y rojo (calor)
            vec3 coldColor = vec3(0.0, 0.0, 1.0); // Azul
            vec3 hotColor = vec3(1.0, 0.0, 0.0); // Rojo

            vec3 finalColor = mix(coldColor, hotColor, temperature);

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    transparent: true,
    opacity: 0.6,
});

// Material turquesa por defecto
const turquoiseMaterial = new THREE.MeshPhongMaterial({
    color: 0x40E0D0,  // Color turquesa
    transparent: true,
    opacity: 0.6
});

const newColorMaterial = new THREE.MeshPhongMaterial({
    color: 0x121526,  // Nuevo color oscuro
    transparent: true,
    opacity: 0.6
});

// Actualiza la segunda esfera con el nuevo material
let secondSphereGeometry = new THREE.SphereGeometry(1.005535, 720, 360);
let secondSphere = new THREE.Mesh(secondSphereGeometry, newColorMaterial);
scene.add(secondSphere);

// Luz ambiental y direccional (siempre es de día)
const ambientLight = new THREE.AmbientLight(0x404040, 1); // Aumentar la intensidad de la luz ambiental
scene.add(ambientLight);

const sunlight = new THREE.DirectionalLight(0xffffff, 1.5);
sunlight.position.set(10, 10, 10).normalize();
sunlight.castShadow = true;
scene.add(sunlight);

// Raycaster para detectar intersecciones
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Array de coordenadas con la propiedad "info"
const coordinates = [
    { lat: -12.0464, lon: -77.0428, info: "hola mundo 0" }, // Lima (Capital de Perú)
    { lat: 34.0522, lon: -118.2437, info: "hola mundo 1" }, // Los Ángeles
    { lat: -33.8688, lon: 151.2093, info: "hola mundo 2" }, // Sídney
    { lat: 51.5074, lon: -0.1278, info: "hola mundo 3" },   // Londres
    { lat: 35.6895, lon: 139.6917, info: "hola mundo 4" }   // Tokio
];

// Función para convertir coordenadas geográficas a coordenadas 3D
function convertLatLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180); // Convertir latitud a phi
    const theta = (lon + 180) * (Math.PI / 180); // Convertir longitud a theta

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
}

// Función para agregar pines en las coordenadas
const pins = [];



// Función para agregar pines en las coordenadas (con círculo y vara con resplandor)
// Función para agregar pines en las coordenadas (usando CircleGeometry para trazar círculos con un anillo animado)

// Función para agregar pines en las coordenadas (usando CircleGeometry para trazar círculos con un anillo animado)
function addPin(lat, lon, info) {
// Geometría del círculo
const circleGeometry = new THREE.CircleGeometry(0.02, 32);  // Círculo con radios pequeños y muchos segmentos para suavizar
const circleMaterial = new THREE.MeshBasicMaterial({
color: 0xff0000,  // Color rojo
side: THREE.DoubleSide,  // Hacer visible el círculo desde ambos lados
transparent: true,
opacity: 0.8  // Ligera transparencia
});
const circle = new THREE.Mesh(circleGeometry, circleMaterial);

// Posicionar el círculo en la superficie de la esfera
const position = convertLatLonToVector3(lat, lon, 1.08);
circle.position.copy(position);

// Colocar el círculo plano en la superficie de la esfera
const normalDirection = position.clone().normalize();
circle.lookAt(position.clone().add(normalDirection)); // Alinear el círculo con la esfera

// Agregar información al círculo
circle.userData.info = info;

// Animación de anillo pulsante
let scaleFactor = 1;
let growing = true; // Controla si el anillo está creciendo o encogiendo

function animateRing() {
if (growing) {
    scaleFactor += 0.005; // Crecer ligeramente
    if (scaleFactor >= 1.2) growing = false; // Limitar crecimiento
} else {
    scaleFactor -= 0.005; // Encoger ligeramente
    if (scaleFactor <= 1.0) growing = true; // Limitar encogimiento
}
circle.scale.set(scaleFactor, scaleFactor, scaleFactor); // Aplicar la escala al círculo
}

// Actualizar la animación de los pines dentro de la función de animación principal
function updatePin() {
animateRing();
}

// Agregar la función de actualización al círculo
circle.update = updatePin;

// Agregar el círculo a la esfera
sphere.add(circle);

// Almacenar el círculo para la detección de clics
pins.push(circle);
}





// Agregar pines para cada coordenada
coordinates.forEach((coord, index) => addPin(coord.lat, coord.lon, coord.info));

// Detectar clics en los pines usando raycaster
function onMouseClick(event) {
    // Normalizar las coordenadas del clic
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Establecer el raycaster desde la cámara y las coordenadas del clic
    raycaster.setFromCamera(mouse, camera);

    // Detectar intersección con los pines
    const intersects = raycaster.intersectObjects(pins);

    // Si hubo intersección
    if (intersects.length > 0) {
        const pinClicked = intersects[0].object;
        const info = pinClicked.userData.info;

        // Mostrar la información del pin en el modal
        const modal = document.getElementById('info-modal');
        const modalContent = document.getElementById('modal-content');
        modalContent.textContent = info;
        modal.style.display = 'block';
    }
}

// Escuchar eventos de clic
window.addEventListener('click', onMouseClick);

// Cerrar el modal
const closeModalButton = document.getElementById('close-modal');
closeModalButton.addEventListener('click', () => {
    document.getElementById('info-modal').style.display = 'none';
});

// Función para alternar entre el shader de temperatura y el material turquesa
const temperatureSwitch = document.getElementById('temperature-switch');
temperatureSwitch.addEventListener('change', (event) => {
    if (event.target.checked) {
        // Activar el shader de temperatura
        secondSphere.material = temperatureShaderMaterial;
    } else {
        // Volver al material turquesa
        secondSphere.material = turquoiseMaterial;
    }
});

// Función demo para ocultar controles, luces y detener la rotación
function demo(activate) {
    const controlsContainer = document.getElementById('controls-container');
    const demoSwitch = document.getElementById('demo-switch'); // Referencia al checkbox del demo

    if (activate) {
        // Ocultar todos los botones y sliders
        controlsContainer.style.display = 'none';

        // Ocultar todos los pines al iniciar el modo demo
        pins.forEach(pin => pin.visible = false);

        // Crear luces que iluminen toda la esfera
        const pointLight1 = new THREE.PointLight(0xffffff, 1, 0);
        pointLight1.position.set(50, 50, 50);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xffffff, 1, 0);
        pointLight2.position.set(-50, -50, -50);
        scene.add(pointLight2);

        // Detener la animación de rotación
        autoRotate = false;

        // Incrementar el valor del radio de la segunda esfera cada 100 ms
        demoInterval = setInterval(() => {
            let currentRadius = parseFloat(radiusSlider.value);
            const halfSliderValue = (parseFloat(radiusSlider.min) + parseFloat(radiusSlider.max)) / 2;

            if (currentRadius < parseFloat(radiusSlider.max)) {
                radiusSlider.value = (currentRadius + 0.001).toFixed(3);
                const newRadius = parseFloat(radiusSlider.value);
                const newSecondSphereGeometry = new THREE.SphereGeometry(newRadius, 720, 360);
                secondSphere.geometry.dispose();
                secondSphere.geometry = newSecondSphereGeometry;

                // Verificar si se ha alcanzado la mitad del slider para mostrar el pin de Lima
                if (currentRadius >= halfSliderValue && !pins[0].visible) {
                    // Mostrar el pin de Lima
                    pins[0].visible = true;

                    // Simular el clic en el pin de Lima
                    const modal = document.getElementById('info-modal');
                    const modalContent = document.getElementById('modal-content');
                    modalContent.textContent = pins[0].userData.info;
                    modal.style.display = 'block';

                    // Esperar 2 segundos y luego cerrar el modal
                    setTimeout(() => {
                        modal.style.display = 'none';
                    }, 2000);
                }

            } else {
                // Detener el incremento y salir del modo demo cuando se alcanza el valor máximo
                clearInterval(demoInterval);
                demo(false); // Salir del modo demo automáticamente
            }
        }, 100);

    } else {
        // Mostrar nuevamente los controles
        controlsContainer.style.display = 'block';

        // Detener el incremento del radio
        clearInterval(demoInterval);

        // Restaurar el valor original del slider
        radiusSlider.value = initialSliderValue;
        const newSecondSphereGeometry = new THREE.SphereGeometry(initialSliderValue, 720, 360);
        secondSphere.geometry.dispose();
        secondSphere.geometry = newSecondSphereGeometry;

        // Reactivar la rotación automática
        autoRotate = true;

        // Asegurar que el checkbox del demo esté desmarcado
        demoSwitch.checked = false;

        // Restaurar la visibilidad de todos los pines
        pins.forEach(pin => pin.visible = true);
    }
}

// Vincular el modo demo al switch HTML
const demoSwitch = document.getElementById('demo-switch');
demoSwitch.addEventListener('change', (event) => {
    demo(event.target.checked);
});

// Animación
let autoRotate = true;
let demoInterval;
const initialSliderValue = parseFloat(document.getElementById('sphere-radius').value);

function animate() {
    requestAnimationFrame(animate);

    // Actualizar todos los pines
    pins.forEach(pin => pin.update());

    if (autoRotate) {
        sphere.rotation.y += 0.002;
        secondSphere.rotation.y += 0.002;
    }
    controls.update();
    renderer.render(scene, camera);
}


// Redimensionar ventana
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Iniciar animación
animate();

// Control del radio de la segunda esfera
const radiusSlider = document.getElementById('sphere-radius');
radiusSlider.addEventListener('input', (event) => {
    const newRadius = parseFloat(event.target.value);
    const newSecondSphereGeometry = new THREE.SphereGeometry(newRadius, 720, 360);
    secondSphere.geometry.dispose();
    secondSphere.geometry = newSecondSphereGeometry;
});

// Botón para rotación
const toggleRotationButton = document.getElementById('toggle-rotation');
toggleRotationButton.addEventListener('click', () => {
    autoRotate = !autoRotate;
    toggleRotationButton.textContent = autoRotate ? "detener giro" : "iniciar giro";
});

//Funcionalidad
function toggleCard() {
    const floatingBox = document.getElementById('floatingBox');
    floatingBox.classList.toggle('expanded');
}
