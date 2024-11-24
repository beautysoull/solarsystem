// Инициализация WebGL
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL не поддерживается вашим браузером!");
    throw new Error("WebGL не найден");
}

// Шейдеры для орбит (белые линии)
const vsSourceOrbit = `
    attribute vec4 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
`;

const fsSourceOrbit = `
    void main(void) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Белый цвет для орбит
    }
`;

// Шейдеры для объектов
const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    varying highp vec2 vTextureCoord;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
    }
`;

const fsSource = `
    varying highp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    void main(void) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
    }
`;

// Создание шейдерной программы
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Не удалось инициализировать шейдерную программу: " + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

// Загрузка шейдера
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Ошибка при компиляции шейдера: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Проверка степени двойки
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

// Загрузка текстуры
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const pixel = new Uint8Array([255, 255, 255, 255]);// Пустая текстура
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        if ((image.width & (image.width - 1)) === 0 && (image.height & (image.height - 1)) === 0) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        
        
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }

    };
    image.src = url;

    return texture;
}

// Инициализация буферов для орбит
function initOrbitBuffer(gl, radius, segments = 100) {
    const positions = [];

    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        positions.push(x, 0, z);
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: positions.length / 3,
    };
}

// Буферы для орбит
const orbitBuffers = {
    mercury: initOrbitBuffer(gl, 5),
    venus: initOrbitBuffer(gl, 6.7),
    earth: initOrbitBuffer(gl, 9.5),
    mars: initOrbitBuffer(gl, 12),
    jupiter: initOrbitBuffer(gl, 15),
    saturn: initOrbitBuffer(gl, 20.8),
    uranus: initOrbitBuffer(gl, 26),
    neptune: initOrbitBuffer(gl, 30),
};

// Функция отрисовки орбиты
function renderOrbit(gl, programInfo, orbitBuffer, modelViewMatrix, projectionMatrix) {
    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, orbitBuffer.buffer);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.drawArrays(gl.LINE_LOOP, 0, orbitBuffer.vertexCount);
}

// Инициализация буферов для сфер
function initBuffers(gl, latBands, longBands, radius) {
    const positions = [];
    const textureCoordinates = [];
    const indices = [];
    for (let lat = 0; lat <= latBands; ++lat) {
        const theta = (lat * Math.PI) / latBands;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        for (let long = 0; long <= longBands; ++long) {
            const phi = (long * 2 * Math.PI) / longBands;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const x = cosPhi * sinTheta;
            const y = cosTheta;
            const z = sinPhi * sinTheta;
            const u = 1 - long / longBands;
            const v = 1 - lat / latBands;

            positions.push(radius * cosPhi * sinTheta, radius * cosTheta, radius * sinPhi * sinTheta);
            textureCoordinates.push(1 - long / longBands, 1 - lat / latBands);
            //positions.push(radius * x, radius * y, radius * z);
            //textureCoordinates.push(u, v);
        }
    }
    for (let lat = 0; lat < latBands; ++lat) {
        for (let long = 0; long < longBands; ++long) {
            const first = lat * (longBands + 1) + long;
            const second = first + longBands + 1;

            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }
    return {
        position: initBuffer(gl, positions, 3),
        textureCoord: initBuffer(gl, textureCoordinates, 2),
        indices: initIndexBuffer(gl, indices),
        vertexCount: indices.length,
    };
}

function initBuffer(gl, data, size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    buffer.size = size;
    return buffer;
}

function initIndexBuffer(gl, data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW);
    return buffer;
}

// Функция для создания кольца
function initRingBuffers(gl, innerRadius, outerRadius, segments) {
    const positions = [];
    const textureCoordinates = [];
    const indices = [];

    for (let i = 0; i <= segments; ++i) {
        const angle = (i / segments) * 2 * Math.PI;

        const sinAngle = Math.sin(angle);
        const cosAngle = Math.cos(angle);

        // Внешний край кольца
        positions.push(outerRadius * cosAngle, 0, outerRadius * sinAngle);
        textureCoordinates.push(i / segments, 1); // Горизонтальное растяжение

        // Внутренний край кольца
        positions.push(innerRadius * cosAngle, 0, innerRadius * sinAngle);
        textureCoordinates.push(i / segments, 0); // Горизонтальное растяжение
    }

    for (let i = 0; i < segments; ++i) {
        const first = i * 2;
        const second = first + 1;
        const third = first + 2;
        const fourth = first + 3;

        indices.push(first, second, third);
        indices.push(second, fourth, third);
    }

    return {
        position: initBuffer(gl, positions, 3),
        textureCoord: initBuffer(gl, textureCoordinates, 2),
        indices: initIndexBuffer(gl, indices),
        vertexCount: indices.length,
    };
}

// Управление камерой
let cameraOffsetX = 0;
let cameraOffsetY = 0;
let cameraOffsetZ = 0;
let zoom = -3;
let rotationX = 0;
let rotationY = 0;
let isDragging = false; // Флаг для проверки, двигает ли пользователь камеру
let offsetX = 0; // Смещение камеры по X
let offsetY = 0; // Смещение камеры по Y
let lastX = 0, lastY = 0;
let isPinching = false; // Флаг для жеста "пинч-зум"
let isTouchDragging = false; // Флаг для одиночного касания
let touchEndTimeout; // Таймер для предотвращения некорректного вращения

// Коэффициент чувствительности для движения камеры
const moveSpeed = 0.5;
canvas.addEventListener("wheel", (event) => {
    event.preventDefault();

    // Получаем координаты мыши относительно канваса
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Пересчёт координат мыши в нормализованные координаты [-1, 1]
    const normalizedMouseX = (mouseX / canvas.clientWidth) * 2 - 1;
    const normalizedMouseY = -((mouseY / canvas.clientHeight) * 2 - 1);

    // Смещаем камеру в сторону мыши при зуме
    offsetX += normalizedMouseX * (event.deltaY * 0.01);
    offsetY += normalizedMouseY * (event.deltaY * 0.01);

    // Увеличение/уменьшение зума
    zoom -= event.deltaY * 0.01;
    zoom = Math.max(-1000, Math.min(-3, zoom));
});

// Добавление управления мышью
let dragging = false;


// Функция остановки/запуска вращения
document.getElementById("toggleButton").addEventListener("click", () => {
    isPaused = !isPaused;

    // Обновляем текст кнопки
    const button = document.getElementById("toggleButton");
    button.textContent = isPaused ? "Start" : "Stop";
});

// Обновляем зум
canvas.addEventListener("wheel", (event) => {
    zoom -= event.deltaY * 0.01;
    zoom = Math.max(-80, Math.min(-3, zoom));
});

canvas.addEventListener("mousedown", (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
});

canvas.addEventListener("mouseup", () => dragging = false);
canvas.addEventListener("mousemove", (event) => {
    if (dragging) {
        const deltaX = event.clientX - lastX;
        const deltaY = event.clientY - lastY;

         // Если зажата левая кнопка мыши, двигаем камеру вверх/вниз и вперёд/назад
         if (event.buttons === 1) {
            cameraOffsetX += deltaX * moveSpeed * 0.05; // Движение влево/вправо
            cameraOffsetY -= deltaY * moveSpeed * 0.05; // Движение вверх/вниз
        }
        // Если зажата правая кнопка мыши, крутим по центру
        if (event.buttons === 2) {
            rotationX -= deltaY * 0.01
            rotationY += deltaX * 0.01; 
        }
        // Обновляем смещение
        offsetX += deltaX * 0.01; // Масштабируем движение
        offsetY -= deltaY * 0.01; // Инвертируем Y для правильного движения

        lastX = event.clientX;
        lastY = event.clientY;
    }
});

// Сенсорные устройства
let touchStartX = 0, touchStartY = 0;
let lastPinchDistance = null;

canvas.addEventListener("touchstart", (event) => {
    if (event.touches.length === 1) {
        isTouchDragging = true;
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
    if (event.touches.length === 2) {
        isPinching = true;
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
    }
    clearTimeout(touchEndTimeout); // Очищаем таймер
});

canvas.addEventListener("touchmove", (event) => {
    event.preventDefault();
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        // Перемещение одного пальца — вращение камеры
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        rotationX += deltaY * 0.03;
        rotationY += deltaX * 0.03;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
    if (event.touches.length === 2) {
        // Два пальца — жест масштабирования (пинч-зум)
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDistance) {
            zoom -= (lastPinchDistance - distance) * 0.01;
            zoom = Math.max(-100, Math.min(zoom, -3));
        }
        lastPinchDistance = distance;
    }
    event.preventDefault(); // Предотвращаем стандартное поведение браузера
});

canvas.addEventListener("touchend", () => {
    if (event.touches.length === 0) {
        isPinching = false; // Завершаем пинч-зум
        isTouchDragging = false;

        // Устанавливаем таймер перед включением вращения
        touchEndTimeout = setTimeout(() => {
            isTouchDragging = true;
        }, 200); // Задержка в 200 мс
    }
    //lastPinchDistance = null;
});

// Автоматическое изменение размера холста
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

// Текстуры для объектов
const textures = {
    sun: loadTexture(gl, "textures/sun.jpg"),
    earth: loadTexture(gl, "textures/earth.jpg"),
    moon: loadTexture(gl, "textures/moon.jpg"),
    stars: loadTexture(gl, "textures/stars_milky_way.jpg"),
    mercury: loadTexture(gl, "textures/mercury.jpg"),
    venus: loadTexture(gl, "textures/venus.jpg"),
    mars: loadTexture(gl, "textures/mars.jpg"),
    jupiter: loadTexture(gl, "textures/jupiter.jpg"),
    saturn: loadTexture(gl, "textures/saturn.jpg"),
    saturnRing: loadTexture(gl, "textures/saturn_rings.jpg"),
    uranus: loadTexture(gl, "textures/uranus.jpg"),
    neptune: loadTexture(gl, "textures/neptune.jpg"),
};

// Буферы для планет
const buffers = {
    sun: initBuffers(gl, 30, 30, 3),
    earth: initBuffers(gl, 30, 30, 1),
    moon: initBuffers(gl, 20, 20, 0.3),
    mercury: initBuffers(gl, 20, 20, 0.5),
    venus: initBuffers(gl, 30, 30, 0.9),
    mars: initBuffers(gl, 20, 20, 0.7),
    jupiter: initBuffers(gl, 30, 30, 2),
    saturn: initBuffers(gl, 30, 30, 1.8),
    saturnRing: initRingBuffers(gl, 2.2, 3.5, 64), // Внутренний и внешний радиус кольца
    uranus: initBuffers(gl, 30, 30, 1.6),
    neptune: initBuffers(gl, 30, 30, 1.5),
    stars: initBuffers(gl, 30, 30, 100),
};

// Орбиты планет
const orbits = {
    mercury: { distance: 5, speed: 1.6, angle: 0 },
    venus: { distance: 6.7, speed: 1.2, angle: 0 },
    earth: { distance: 9.5, speed: 1, angle: 0 },
    mars: { distance: 12, speed: 0.8, angle: 0 },
    jupiter: { distance: 15, speed: 0.4, angle: 0 },
    saturn: { distance: 20.8, speed: 0.3, angle: 0 },
    uranus: { distance: 26, speed: 0.2, angle: 0 },
    neptune: { distance: 30, speed: 0.1, angle: 0 },
    moon: { distance: 2, speed: 2.5, angle: 0 },
};

// Функция отрисовки объекта
function renderObject(gl, programInfo, buffers, texture, modelViewMatrix, projectionMatrix) {
    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, buffers.position.size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, buffers.textureCoord.size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    gl.useProgram(programInfo.program);

    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.sampler, 0);

    gl.drawElements(gl.TRIANGLES, buffers.vertexCount, gl.UNSIGNED_SHORT, 0);
}

let earthRotation = 0;
let moonRotation = 0;
let moonOrbit = 0;
let rotationAngle = 0;
let moonRotationAngle = 0;

// Функция отрисовки сцены
function drawScene(deltaTime) {
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, (45 * Math.PI) / 180, gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 200.0);

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [cameraOffsetX, cameraOffsetY, zoom + cameraOffsetZ]);
    rotationAngle += deltaTime * 0.5;

    mat4.rotate(modelViewMatrix, modelViewMatrix, Math.PI, [1, 0, 0]);// Поворот по X на 180 градусов, чтобы исправить "вверх ногами"
    mat4.scale(modelViewMatrix, modelViewMatrix, [1, 1, -1]);// Инвертируем ось Z для устранения зеркальности

    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX, [1, 0, 0]);// Вверх/вниз
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY, [0, 1, 0]);// Влево/вправо

    // Звёздный фон
    const starsMatrix = mat4.clone(modelViewMatrix);
    mat4.scale(starsMatrix, starsMatrix, [1, 1, -1]); // Инвертируем ось Z
    renderObject(gl, programInfo, buffers.stars, textures.stars, starsMatrix, projectionMatrix);
    
    // Рисуем орбиты
    Object.keys(orbitBuffers).forEach((orbit) => {
        renderOrbit(gl, orbitProgramInfo, orbitBuffers[orbit], modelViewMatrix, projectionMatrix);
    });

    // Земля
    const earthMatrix = mat4.clone(modelViewMatrix);
    earthRotation += deltaTime * 0.5; // Ожидаемое вращение Земли по оси Y
    mat4.rotate(earthMatrix, earthMatrix, orbits.earth.angle, [0, 1, 0]);
    mat4.translate(earthMatrix, earthMatrix, [orbits.earth.distance, 0, 0]);
    renderObject(gl, programInfo, buffers.earth, textures.earth, earthMatrix, projectionMatrix);

    // Луна
    const moonMatrix = mat4.clone(earthMatrix);
    mat4.rotate(moonMatrix, moonMatrix, orbits.moon.angle, [0, 1, 0]);
    mat4.translate(moonMatrix, moonMatrix, [orbits.moon.distance, 0, 0]);
    renderObject(gl, programInfo, buffers.moon, textures.moon, moonMatrix, projectionMatrix);

    moonOrbit -= deltaTime * 0.2; // Луна вращается вокруг Земли
    moonRotation += deltaTime * 1.0; // Луна вращается вокруг своей оси

    // Остальные планеты и Солнце появляются при уменьшении масштаба
    if (zoom < -10) {
        const sunMatrix = mat4.clone(modelViewMatrix);
        renderObject(gl, programInfo, buffers.sun, textures.sun, sunMatrix, projectionMatrix);

        Object.keys(orbits).forEach((planet) => {
            if (planet === "moon" || planet === "earth") return;

            const planetMatrix = mat4.clone(modelViewMatrix);
            mat4.rotate(planetMatrix, planetMatrix, orbits[planet].angle, [0, 1, 0]);
            mat4.translate(planetMatrix, planetMatrix, [orbits[planet].distance, 0, 0]);
            renderObject(gl, programInfo, buffers[planet], textures[planet], planetMatrix, projectionMatrix);

            if (planet === "saturn") {
                // Отрисовка кольца
                const ringMatrix = mat4.clone(planetMatrix);
                renderObject(gl, programInfo, buffers.saturnRing, textures.saturnRing, ringMatrix, projectionMatrix);
            }
        });
    }
}

// Анимация
let isPaused = false;
let lastTime = 0;
function animate(now) {
    now *= 0.001;
    const deltaTime = now - lastTime;
    lastTime = now;

    // Если пауза, не обновляем углы вращения
    if (!isPaused) {
        Object.keys(orbits).forEach((planet) => {
            orbits[planet].angle += deltaTime * orbits[planet].speed;
        });
    }    
    drawScene(deltaTime);
    requestAnimationFrame(animate);
    
}

// Инициализация программ
const orbitShaderProgram = initShaderProgram(gl, vsSourceOrbit, fsSourceOrbit);
const orbitProgramInfo = {
    program: orbitShaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(orbitShaderProgram, "aVertexPosition"),
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(orbitShaderProgram, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(orbitShaderProgram, "uModelViewMatrix"),
    },
};
// Инициализация программы
const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        textureCoord: gl.getAttribLocation(shaderProgram, "aTextureCoord"),
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        sampler: gl.getUniformLocation(shaderProgram, "uSampler"),
    },
};

requestAnimationFrame(animate);// Запуск анимации
