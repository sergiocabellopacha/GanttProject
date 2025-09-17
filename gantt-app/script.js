// Gantt Data Structure - Professional Format
let ganttData = {
    tasks: [
        { id: 1, name: "Esto es un Grupo de tareas", start: "2025-09-01", end: "2025-09-08", progress: 100, dependencies: [], resources: "Project Manager", color: "#007bff", group: true },
        { id: 2, name: "Esto es una tarea", start: "2025-09-01", end: "2025-09-08", progress: 100, dependencies: [], resources: "Business Analyst", color: "#28a745", group: false, parent: 1 },
        { id: 3, name: "Esto es otra tarea", start: "2025-09-04", end: "2025-09-08", progress: 80, dependencies: [2], resources: "Tech Lead", color: "#28a745", group: false, parent: 1 },
        
        { id: 4, name: "Puedes guardar en JSON y CSV", start: "2025-09-11", end: "2025-09-30", progress: 60, dependencies: [], resources: "Frontend Team", color: "#ffc107", group: true },
        { id: 5, name: "Y despues puedes cargarlo", start: "2025-09-11", end: "2025-09-16", progress: 90, dependencies: [3], resources: "UI Designer", color: "#17a2b8", group: false, parent: 4 },
        { id: 6, name: "La aplicación no mantiene nada en memoria", start: "2025-09-15", end: "2025-09-23", progress: 50, dependencies: [5], resources: "Frontend Dev", color: "#17a2b8", group: false, parent: 4 },
        { id: 7, name: "Usa los botones de la cabecera", start: "2025-09-19", end: "2025-09-30", progress: 0, dependencies: [6], resources: "QA Tester", color: "#17a2b8", group: false, parent: 4 }]
};

let zoomLevel = 1; // 1 = days, 2 = weeks, 3 = months
let dayWidth = 30; // pixels per day - Global variable for zoom
let currentEditingTask = null;
let isCreatingNewTask = false; // Para diferenciar entre crear y editar
let nextTaskId = 15;
let collapsedGroups = new Set(); // Para rastrear grupos colapsados

// Colores por defecto para tipos de tareas
const DEFAULT_COLORS = {
    group: '#616161',
    task: '#17A2B8',
};

// Rastrear si el usuario ha cambiado manualmente el color
let userChangedColor = false;

// Variables for drag and drop functionality
window.isDragging = false;
window.dragType = null; // 'move', 'resize-start', 'resize-end'
window.dragTaskId = null;
window.dragStartX = 0;
window.dragOriginalStart = null;
window.dragOriginalEnd = null;
window.dragElement = null;

// Date utilities
function parseDate(dateStr) {
    return new Date(dateStr);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function getDaysDifference(start, end) {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

// Función para verificar si un día es fin de semana
function isWeekend(date) {
    const day = parseDate(date).getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

// Función para obtener el siguiente día laborable
function getNextWorkday(date) {
    const nextDay = addDays(parseDate(date), 1);
    if (isWeekend(formatDate(nextDay))) {
        return getNextWorkday(formatDate(nextDay));
    }
    return formatDate(nextDay);
}

// Función para obtener el día laborable anterior
function getPreviousWorkday(date) {
    const prevDay = addDays(parseDate(date), -1);
    if (isWeekend(formatDate(prevDay))) {
        return getPreviousWorkday(formatDate(prevDay));
    }
    return formatDate(prevDay);
}

// Función para calcular días laborables entre dos fechas (excluyendo fines de semana)
function getWorkdaysDifference(start, end) {
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    let count = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const day = currentDate.getDay();
        if (day !== 0 && day !== 6) { // No es domingo (0) ni sábado (6)
            count++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
}

// Utility functions for drag and drop
function pixelsToDate(pixels, dateRange) {
    const daysSinceStart = Math.round(pixels / dayWidth);
    return formatDate(addDays(dateRange.start, daysSinceStart));
}

function dateToPixels(date, dateRange) {
    const daysSinceStart = getDaysDifference(formatDate(dateRange.start), date) - 1;
    return Math.max(0, daysSinceStart * dayWidth);
}

function getTaskBarZone(event, taskBar) {
    const rect = taskBar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    
    // Usar un área de detección más grande para mejor UX
    const edgeSize = Math.min(15, width * 0.2); // 15px o 20% del ancho, lo que sea menor
    
    if (x <= edgeSize) return 'resize-start';
    if (x >= width - edgeSize) return 'resize-end';
    return 'move';
}

function getProjectDateRange() {
    if (ganttData.tasks.length === 0) {
        const today = new Date();
        return { start: today, end: addDays(today, 30) };
    }
    
    let minDate = parseDate(ganttData.tasks[0].start);
    let maxDate = parseDate(ganttData.tasks[0].end);
    
    ganttData.tasks.forEach(task => {
        const start = parseDate(task.start);
        const end = parseDate(task.end);
        if (start < minDate) minDate = start;
        if (end > maxDate) maxDate = end;
    });
    
    // Add some padding
    minDate = addDays(minDate, -7);
    maxDate = addDays(maxDate, 7);
    
    return { start: minDate, end: maxDate };
}

// Timeline rendering
function renderTimeline() {
    const header = document.getElementById('timeline-header');
    const dateRange = getProjectDateRange();
    const totalDays = getDaysDifference(formatDate(dateRange.start), formatDate(dateRange.end));
    
    // Calcular el ancho total exacto
    const totalWidth = totalDays * dayWidth;
    
    let monthsHTML = '';
    let daysHTML = '';
    let currentMonth = -1;
    let monthStart = 0;
    let dayCount = 0;
    
    for (let i = 0; i < totalDays; i++) {
        const date = addDays(dateRange.start, i);
        const month = date.getMonth();
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        if (month !== currentMonth) {
            if (currentMonth !== -1) {
                // Close previous month
                monthsHTML += `<div class="timeline-month" style="width: ${dayCount * dayWidth}px; min-width: ${dayCount * dayWidth}px; max-width: ${dayCount * dayWidth}px;">${addDays(dateRange.start, monthStart).toLocaleDateString('es', { month: 'long', year: 'numeric' })}</div>`;
            }
            currentMonth = month;
            monthStart = i;
            dayCount = 0;
        }
        
        daysHTML += `
            <div class="timeline-day ${isWeekend ? 'weekend' : ''}" style="width: ${dayWidth}px; min-width: ${dayWidth}px; max-width: ${dayWidth}px; flex-shrink: 0;">
                <div class="day-number">${date.getDate()}</div>
                <div class="day-name">${date.toLocaleDateString('es', { weekday: 'short' })}</div>
            </div>
        `;
        dayCount++;
    }
    
    // Close last month
    if (currentMonth !== -1) {
        monthsHTML += `<div class="timeline-month" style="width: ${dayCount * dayWidth}px; min-width: ${dayCount * dayWidth}px; max-width: ${dayCount * dayWidth}px;">${addDays(dateRange.start, monthStart).toLocaleDateString('es', { month: 'long', year: 'numeric' })}</div>`;
    }
    
    header.innerHTML = `
        <div class="timeline-months-row" style="width: ${totalWidth}px; min-width: ${totalWidth}px; display: flex;">${monthsHTML}</div>
        <div class="timeline-days-row" style="width: ${totalWidth}px; min-width: ${totalWidth}px; display: flex;">${daysHTML}</div>
    `;
    
    // Asegurar que el header tenga dimensiones fijas
    header.style.width = totalWidth + 'px';
    header.style.minWidth = totalWidth + 'px';
    header.style.maxWidth = totalWidth + 'px';
}

// Función para ordenar tareas jerárquicamente
function getOrderedTasks() {
    const orderedTasks = [];
    
    // Primero, agregar todas las tareas raíz (sin padre) ordenadas por ID
    const rootTasks = ganttData.tasks
        .filter(task => !task.parent)
        .sort((a, b) => a.id - b.id);
    
    rootTasks.forEach(rootTask => {
        // Agregar la tarea raíz
        orderedTasks.push(rootTask);
        
        // Si es un grupo, agregar sus hijos inmediatamente después
        if (rootTask.group) {
            const children = ganttData.tasks
                .filter(task => task.parent === rootTask.id)
                .sort((a, b) => a.id - b.id); // Ordenar por ID
            
            orderedTasks.push(...children);
        }
    });
    
    return orderedTasks;
}

// Table rendering
function renderTaskTable() {
    const tbody = document.getElementById('task-table-body');
    let html = '';
    
    // Usar las tareas ordenadas jerárquicamente
    const orderedTasks = getOrderedTasks();
    
    orderedTasks.forEach(task => {
        const duration = getWorkdaysDifference(task.start, task.end);
        const isGroup = task.group;
        const isCollapsed = collapsedGroups.has(task.id);
        const hasParent = task.parent;
        const parentCollapsed = hasParent && collapsedGroups.has(task.parent);
        
        // No mostrar tareas hijas si el padre está colapsado
        if (parentCollapsed) return;
        
        const indent = hasParent ? '    ' : '';
        const expandIcon = isGroup ? (isCollapsed ? '▶' : '▼') : '';
        const dataParent = hasParent ? `data-parent="${task.parent}"` : '';
        
        html += `
            <div class="task-row ${isGroup ? 'group-row' : ''}" data-task-id="${task.id}" ${dataParent} style="${parentCollapsed ? 'display: none;' : ''}">
                <div class="task-cell task-name-cell" onclick="editTask(${task.id})" title="${task.name}">
                    ${isGroup ? `<span class="expand-icon ${isCollapsed ? 'collapsed' : ''}" onclick="toggleGroup(${task.id}); event.stopPropagation();">${expandIcon}</span>` : ''}
                    <span class="task-name-text">${indent}${task.name}</span>
                    ${isGroup ? ' <small>(Grupo)</small>' : ''}
                    ${hasParent ? ' <small>(Subtarea)</small>' : ''}
                </div>
                <div class="task-cell">${task.id}</div>
                <div class="task-cell">
                    <input type="date" value="${task.start}" onchange="validateWorkdayDate(this); updateTaskField(${task.id}, 'start', this.value)">
                </div>
                <div class="task-cell">
                    <input type="date" value="${task.end}" onchange="validateWorkdayDate(this); updateTaskField(${task.id}, 'end', this.value)">
                </div>
                <div class="task-cell">${duration} días</div>
                <div class="task-cell">
                    <input type="number" value="${task.progress}" min="0" max="100" style="width: 50px;" onchange="updateTaskField(${task.id}, 'progress', this.value)">
                </div>
                <div class="task-cell">${task.dependencies.join(', ')}</div>
                <div class="task-cell task-resource-cell">${task.resources || ''}</div>
                <div class="task-cell">
                    <div class="color-indicator" style="background-color: ${task.color}" data-task-id="${task.id}"></div>
                </div>
            </div>
        `;
    });
    
    tbody.innerHTML = html;
}

// Chart rendering
function renderChart() {
    const chartBody = document.getElementById('chart-body');
    const dateRange = getProjectDateRange();
    const totalDays = getDaysDifference(formatDate(dateRange.start), formatDate(dateRange.end));
    // dayWidth is now a global variable for zoom functionality
    
    let html = '';
    let svgContent = '';
    
    // Usar las tareas ordenadas jerárquicamente
    const orderedTasks = getOrderedTasks();
    
    orderedTasks.forEach((task, index) => {
        const hasParent = task.parent;
        const parentCollapsed = hasParent && collapsedGroups.has(task.parent);
        
        // No mostrar tareas hijas si el padre está colapsado
        if (parentCollapsed) return;
        
        const startOffset = Math.max(0, getDaysDifference(formatDate(dateRange.start), task.start) - 1);
        const duration = getDaysDifference(task.start, task.end);
        const left = startOffset * dayWidth;
        const width = Math.max(dayWidth, duration * dayWidth); // Mínimo ancho de 1 día
        
        const isGroup = task.group;
        
        html += `
            <div class="chart-row ${isGroup ? 'group-row' : ''}" style="height: 40px;">
                ${isGroup ? 
                    `<div class="group-bar" style="left: ${left}px; width: ${width}px; background: ${task.color} !important;">
                        ${task.name}
                        <span class="progress-percentage group-percentage">${task.progress}%</span>
                    </div>` :
                    `<div class="task-bar draggable-task" data-task-id="${task.id}" style="left: ${left}px; width: ${width}px; background-color: ${task.color};" title="${task.name}">
                        <div class="progress-bar" style="width: ${task.progress}%;"></div>
                        <span>${task.name}</span>
                        <span class="progress-percentage">${task.progress}%</span>
                    </div>`
                }
            </div>
        `;
        
        // Render dependencies
        if (!isGroup && task.dependencies.length > 0) {
            task.dependencies.forEach(depId => {
                const depTask = ganttData.tasks.find(t => t.id === depId);
                if (depTask) {
                    // Usar las tareas ordenadas para encontrar los índices correctos
                    const visibleOrderedTasks = orderedTasks.filter(t => {
                        const hasParent = t.parent;
                        const parentCollapsed = hasParent && collapsedGroups.has(t.parent);
                        return !parentCollapsed;
                    });
                    
                    const depIndex = visibleOrderedTasks.indexOf(depTask);
                    const taskIndex = visibleOrderedTasks.indexOf(task);
                    
                    if (depIndex >= 0 && taskIndex >= 0) {
                        // Calcular posiciones correctas
                        const depStartOffset = Math.max(0, getDaysDifference(formatDate(dateRange.start), depTask.start) - 1);
                        const depDuration = getDaysDifference(depTask.start, depTask.end);
                        const taskStartOffset = Math.max(0, getDaysDifference(formatDate(dateRange.start), task.start) - 1);
                        
                        // Punto de salida: final de la tarea dependencia (derecha)
                        const fromX = (depStartOffset + depDuration) * dayWidth;
                        const fromY = (depIndex + 0.5) * 40;
                        
                        // Punto de llegada: inicio de la tarea destino (izquierda)
                        const toX = taskStartOffset * dayWidth;
                        const toY = (taskIndex + 0.5) * 40;
                        
                        // Crear path con curva apropiada
                        let pathD = '';
                        const verticalGap = 20; // Separación vertical para la curva
                        const horizontalGap = 20; // Separación horizontal para la curva
                        
                        if (fromX < toX) {
                            // Caso normal: la dependencia está a la izquierda o misma posición
                            const midX = fromX + (toX - fromX) / 2;
                            pathD = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
                        } else {
                            // Caso especial: la dependencia está a la derecha, hacer curva hacia arriba
                            const curveX1 = fromX + horizontalGap; // Salir hacia la derecha
                            const curveX2 = toX - horizontalGap;   // Entrar desde la izquierda
                            
                            // Ir por arriba de la tarea dependiente (toY), no de la dependencia
                            const curveY = toY - verticalGap;   // Siempre por arriba de la tarea destino
                            
                            pathD = `M ${fromX} ${fromY} L ${curveX1} ${fromY} L ${curveX1} ${curveY} L ${curveX2} ${curveY} L ${curveX2} ${toY} L ${toX} ${toY}`;
                        }
                        
                        // Usar el color de la tarea dependiente (origen) para la línea
                        const dependencyColor = depTask.color || '#e67e22';
                        const markerId = `arrowhead-${depTask.id}`;
                        svgContent += `<path d="${pathD}" class="dependency-line" stroke="${dependencyColor}" marker-end="url(#${markerId})" />`;
                    }
                }
            });
        }
    });
    
    const visibleTasks = ganttData.tasks.filter(task => {
        const hasParent = task.parent;
        const parentCollapsed = hasParent && collapsedGroups.has(task.parent);
        return !parentCollapsed;
    });
    
    // Generar marcadores dinámicos para cada tarea
    let markerDefs = '';
    ganttData.tasks.forEach(task => {
        const color = task.color || '#e67e22';
        markerDefs += `
            <marker id="arrowhead-${task.id}" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="${color}" />
            </marker>
        `;
    });
    
    // Calcular el ancho total exacto (igual que en timeline)
    const totalWidth = totalDays * dayWidth;
    
    chartBody.innerHTML = `
        ${html}
        <svg class="gantt-svg" style="width: ${totalWidth}px; height: ${visibleTasks.length * 40}px;">
            <defs>
                ${markerDefs}
            </defs>
            ${svgContent}
        </svg>
    `;
    
    // Asegurar que el chart body tenga dimensiones fijas exactas
    chartBody.style.width = totalWidth + 'px';
    chartBody.style.minWidth = totalWidth + 'px';
    chartBody.style.maxWidth = totalWidth + 'px';
    
    // Agregar event listeners para arrastre después de renderizar
    setupDragAndDrop();
}

// Drag and Drop functionality
function setupDragAndDrop() {
    const chartBody = document.getElementById('chart-body');
    const taskBars = chartBody.querySelectorAll('.draggable-task');
    
    taskBars.forEach(taskBar => {
        taskBar.addEventListener('mousedown', handleTaskMouseDown);
        taskBar.addEventListener('dblclick', handleTaskDoubleClick);
    });
    
    // Global mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handleTaskMouseDown(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const taskBar = event.currentTarget || event.target;
    
    // Buscar el elemento con data-task-id si no es el target directo
    let taskElement = taskBar;
    while (taskElement && !taskElement.dataset.taskId) {
        taskElement = taskElement.parentElement;
    }
    
    if (!taskElement || !taskElement.dataset.taskId) return;
    
    const taskId = parseInt(taskElement.dataset.taskId);
    const task = ganttData.tasks.find(t => t.id === taskId);
    
    if (!task || task.group) return; // No permitir arrastrar grupos
    
    const zone = getTaskBarZone(event, taskElement);
    
    window.isDragging = true;
    window.dragType = zone;
    window.dragTaskId = taskId;
    window.dragStartX = event.clientX;
    window.dragOriginalStart = task.start;
    window.dragOriginalEnd = task.end;
    window.dragElement = taskElement;
    
    // Cambiar cursor según la zona
    document.body.style.cursor = zone === 'move' ? 'move' : 'col-resize';
    document.body.classList.add('dragging');
    
    // Agregar clase visual para indicar arrastre
    taskBar.classList.add('dragging');
}

function handleTaskDoubleClick(event) {
    event.stopPropagation();
    const taskId = parseInt(event.currentTarget.dataset.taskId);
    editTask(taskId);
}

function handleMouseMove(event) {
    if (!window.isDragging) {
        // Cambiar cursor según la zona cuando se hace hover
        if (event.target && typeof event.target.closest === 'function') {
            const taskBar = event.target.closest('.draggable-task');
            if (taskBar && !taskBar.closest('.group-row')) {
                const zone = getTaskBarZone(event, taskBar);
                taskBar.style.cursor = zone === 'move' ? 'move' : 'col-resize';
            }
        }
        return;
    }
    
    event.preventDefault();
    
    const deltaX = event.clientX - window.dragStartX;
    const deltaDays = Math.round(deltaX / dayWidth);
    
    const task = ganttData.tasks.find(t => t.id === window.dragTaskId);
    if (!task) return;
    
    const dateRange = getProjectDateRange();
    let newStart, newEnd;
    
    switch (window.dragType) {
        case 'move':
            // Mover toda la tarea manteniendo la duración
            newStart = formatDate(addDays(parseDate(window.dragOriginalStart), deltaDays));
            newEnd = formatDate(addDays(parseDate(window.dragOriginalEnd), deltaDays));
            break;
            
        case 'resize-start':
            // Cambiar fecha de inicio
            newStart = formatDate(addDays(parseDate(window.dragOriginalStart), deltaDays));
            newEnd = window.dragOriginalEnd;
            
            // Validar que la fecha de inicio no sea posterior a la de fin
            if (parseDate(newStart) >= parseDate(newEnd)) {
                newStart = formatDate(addDays(parseDate(newEnd), -1));
            }
            break;
            
        case 'resize-end':
            // Cambiar fecha de fin
            newStart = window.dragOriginalStart;
            newEnd = formatDate(addDays(parseDate(window.dragOriginalEnd), deltaDays));
            
            // Validar que la fecha de fin no sea anterior a la de inicio
            if (parseDate(newEnd) <= parseDate(newStart)) {
                newEnd = formatDate(addDays(parseDate(newStart), 1));
            }
            break;
    }
    
    // Crear una copia del objeto task para el preview sin modificar el original
    const previewTask = {
        ...task,
        start: newStart,
        end: newEnd
    };
    
    // Mostrar preview visual durante el arrastre usando la copia
    updateTaskBarVisual(window.dragElement, previewTask, dateRange);
}

function handleMouseUp(event) {
    if (!window.isDragging) return;
    
    document.body.style.cursor = '';
    document.body.classList.remove('dragging');
    
    // Limpiar cualquier preview visual de TODAS las filas del chart
    const chartBody = document.getElementById('chart-body');
    if (chartBody) {
        const allPreviews = chartBody.querySelectorAll('.task-preview');
        allPreviews.forEach(preview => preview.remove());
    }
    
    // Limpiar clase dragging del elemento
    if (window.dragElement) {
        window.dragElement.classList.remove('dragging');
    }
    
    // Aplicar los cambios finales a la tarea
    const task = ganttData.tasks.find(t => t.id === window.dragTaskId);
    if (task) {
        const deltaX = event.clientX - window.dragStartX;
        const deltaDays = Math.round(deltaX / dayWidth);
        
        switch (window.dragType) {
            case 'move':
                task.start = formatDate(addDays(parseDate(window.dragOriginalStart), deltaDays));
                task.end = formatDate(addDays(parseDate(window.dragOriginalEnd), deltaDays));
                break;
                
            case 'resize-start':
                let newStart = formatDate(addDays(parseDate(window.dragOriginalStart), deltaDays));
                // Validar que la fecha de inicio no sea posterior a la de fin
                if (parseDate(newStart) >= parseDate(task.end)) {
                    newStart = formatDate(addDays(parseDate(task.end), -1));
                }
                task.start = newStart;
                break;
                
            case 'resize-end':
                let newEnd = formatDate(addDays(parseDate(window.dragOriginalEnd), deltaDays));
                // Validar que la fecha de fin no sea anterior a la de inicio
                if (parseDate(newEnd) <= parseDate(task.start)) {
                    newEnd = formatDate(addDays(parseDate(task.start), 1));
                }
                task.end = newEnd;
                break;
        }
        
        // Actualizar fechas de grupos si la tarea modificada tiene padre
        if (task.parent) {
            updateGroupDates(task.parent);
        }
    }
    
    // Forzar un re-renderizado completo para asegurar que todo se actualiza correctamente
    renderAll();
    
    // Limpiar variables
    window.isDragging = false;
    window.dragType = null;
    window.dragTaskId = null;
    window.dragStartX = 0;
    window.dragOriginalStart = null;
    window.dragOriginalEnd = null;
    window.dragElement = null;
}

function updateTaskBarVisual(taskBar, task, dateRange) {
    // Durante el arrastre, crear un preview visual en lugar de modificar la barra original
    if (window.isDragging) {
        // Remover TODOS los previews anteriores del chart-row y del taskBar
        const parentChartRow = taskBar.closest('.chart-row');
        if (parentChartRow) {
            const allPreviews = parentChartRow.querySelectorAll('.task-preview');
            allPreviews.forEach(preview => preview.remove());
        }
        
        // También remover cualquier preview del taskBar directamente
        const taskBarPreviews = taskBar.querySelectorAll('.task-preview');
        taskBarPreviews.forEach(preview => preview.remove());
        
        // Obtener el rango actual del proyecto
        const currentRange = getProjectDateRange();
        
        // Expandir el rango si la nueva fecha está fuera del rango actual
        let effectiveStartDate = currentRange.start;
        let effectiveEndDate = currentRange.end;
        
        const newTaskStart = parseDate(task.start);
        const newTaskEnd = parseDate(task.end);
        
        if (newTaskStart < effectiveStartDate) {
            effectiveStartDate = newTaskStart;
        }
        if (newTaskEnd > effectiveEndDate) {
            effectiveEndDate = newTaskEnd;
        }
        
        // Calcular posición basada en el rango efectivo
        const startOffset = Math.max(0, getDaysDifference(formatDate(effectiveStartDate), task.start) - 1);
        const duration = getDaysDifference(task.start, task.end);
        const left = startOffset * dayWidth;
        const width = Math.max(dayWidth, duration * dayWidth);
        
        // Log para debug
        console.log("Creating preview:", {
            taskName: task.name,
            start: task.start,
            end: task.end,
            left: left,
            width: width,
            startOffset: startOffset,
            duration: duration,
            dayWidth: dayWidth
        });
        
        // Crear elemento preview
        const preview = document.createElement('div');
        preview.className = 'task-preview';
        
        // Usar cssText para establecer todos los estilos de una vez
        preview.style.cssText = `
            position: absolute;
            left: ${left}px;
            width: ${width}px;
            height: 34px;
            background-color: rgba(0, 123, 255, 0.4);
            border: 2px dashed #007bff;
            border-radius: 4px;
            pointer-events: none;
            z-index: 1000;
            top: 3px;
            box-shadow: 0 0 8px rgba(0, 123, 255, 0.6);
            opacity: 0.9;
        `;
        
        // Añadir información visual como fecha y nombre
        const infoElement = document.createElement('div');
        infoElement.style.cssText = `
            position: absolute;
            top: -25px;
            left: 0;
            white-space: nowrap;
            background-color: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            z-index: 1001;
        `;
        infoElement.textContent = `${task.name}: ${task.start} - ${task.end}`;
        preview.appendChild(infoElement);
        
        // Encontrar el contenedor correcto para el preview
        const chartRow = parentChartRow;
        if (chartRow) {
            // Asegurar que el contenedor tenga posición relativa
            if (getComputedStyle(chartRow).position === 'static') {
                chartRow.style.position = 'relative';
            }
            chartRow.appendChild(preview);
            
            // Forzar un reflow
            preview.offsetHeight;
        } else {
            console.warn("No se encontró el chart-row para el preview");
        }
        
    } else {
        // No estamos arrastrando, actualizar la barra normalmente
        const currentRange = getProjectDateRange();
        
        // Expandir el rango si la nueva fecha está fuera del rango actual
        let effectiveStartDate = currentRange.start;
        let effectiveEndDate = currentRange.end;
        
        const newTaskStart = parseDate(task.start);
        const newTaskEnd = parseDate(task.end);
        
        if (newTaskStart < effectiveStartDate) {
            effectiveStartDate = newTaskStart;
        }
        if (newTaskEnd > effectiveEndDate) {
            effectiveEndDate = newTaskEnd;
        }
        
        // Calcular posición basada en el rango efectivo
        const startOffset = Math.max(0, getDaysDifference(formatDate(effectiveStartDate), task.start) - 1);
        const duration = getDaysDifference(task.start, task.end);
        const left = startOffset * dayWidth;
        const width = Math.max(dayWidth, duration * dayWidth);
        
        // Actualizar visualmente la barra
        taskBar.style.left = left + 'px';
        taskBar.style.width = width + 'px';
    }
}

function updateDependencyLines() {
    // Re-renderizar solo las líneas SVG sin tocar las barras de tareas
    const svg = document.querySelector('.gantt-svg');
    if (!svg) return;
    
    const dateRange = getProjectDateRange();
    const orderedTasks = getOrderedTasks();
    let svgContent = '';
    
    orderedTasks.forEach((task, index) => {
        const hasParent = task.parent;
        const parentCollapsed = hasParent && collapsedGroups.has(task.parent);
        
        if (parentCollapsed || task.group) return;
        
        if (task.dependencies.length > 0) {
            task.dependencies.forEach(depId => {
                const depTask = ganttData.tasks.find(t => t.id === depId);
                if (depTask) {
                    const visibleOrderedTasks = orderedTasks.filter(t => {
                        const hasParent = t.parent;
                        const parentCollapsed = hasParent && collapsedGroups.has(t.parent);
                        return !parentCollapsed;
                    });
                    
                    const depIndex = visibleOrderedTasks.indexOf(depTask);
                    const taskIndex = visibleOrderedTasks.indexOf(task);
                    
                    if (depIndex >= 0 && taskIndex >= 0) {
                        const depStartOffset = Math.max(0, getDaysDifference(formatDate(dateRange.start), depTask.start) - 1);
                        const depDuration = getDaysDifference(depTask.start, depTask.end);
                        const taskStartOffset = Math.max(0, getDaysDifference(formatDate(dateRange.start), task.start) - 1);
                        
                        const fromX = (depStartOffset + depDuration) * dayWidth;
                        const fromY = (depIndex + 0.5) * 40;
                        const toX = taskStartOffset * dayWidth;
                        const toY = (taskIndex + 0.5) * 40;
                        
                        let pathD = '';
                        const verticalGap = 20;
                        const horizontalGap = 20;
                        
                        if (fromX < toX) {
                            const midX = fromX + (toX - fromX) / 2;
                            pathD = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;
                        } else {
                            const curveX1 = fromX + horizontalGap;
                            const curveX2 = toX - horizontalGap;
                            const curveY = toY - verticalGap;
                            
                            pathD = `M ${fromX} ${fromY} L ${curveX1} ${fromY} L ${curveX1} ${curveY} L ${curveX2} ${curveY} L ${curveX2} ${toY} L ${toX} ${toY}`;
                        }
                        
                        // Usar el color de la tarea dependiente (origen) para la línea
                        const dependencyColor = depTask.color || '#e67e22';
                        const markerId = `arrowhead-${depTask.id}`;
                        svgContent += `<path d="${pathD}" class="dependency-line" stroke="${dependencyColor}" marker-end="url(#${markerId})" />`;
                    }
                }
            });
        }
    });
    
    // Actualizar solo el contenido de paths del SVG
    const paths = svg.querySelectorAll('path.dependency-line');
    paths.forEach(path => path.remove());
    
    // Actualizar marcadores dinámicos
    const existingDefs = svg.querySelector('defs');
    if (existingDefs) {
        // Limpiar marcadores existentes
        const existingMarkers = existingDefs.querySelectorAll('marker[id^="arrowhead-"]');
        existingMarkers.forEach(marker => marker.remove());
        
        // Generar nuevos marcadores para cada tarea
        ganttData.tasks.forEach(task => {
            const color = task.color || '#e67e22';
            const markerHTML = `
                <marker id="arrowhead-${task.id}" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="${color}" />
                </marker>
            `;
            existingDefs.insertAdjacentHTML('beforeend', markerHTML);
        });
    }
    
    if (svgContent) {
        svg.insertAdjacentHTML('beforeend', svgContent);
    }
}

// Task management functions
function validateWorkdayDate(inputElement) {
    const selectedDate = inputElement.value;
    if (selectedDate && isWeekend(selectedDate)) {
        // Si es fin de semana, buscar el siguiente día laborable
        const nextWorkday = getNextWorkday(selectedDate);
        inputElement.value = nextWorkday;
        
        // Mostrar mensaje al usuario
        //alert(`Los fines de semana no están permitidos. Se ha ajustado la fecha al siguiente día laborable: ${nextWorkday}`);
    }
}

function updateTaskField(taskId, field, value) {
    const task = ganttData.tasks.find(t => t.id === taskId);
    if (task) {
        if (field === 'progress') {
            task[field] = parseInt(value);
        } else {
            task[field] = value;
        }
        renderAll();
    }
}

function changeTaskColor(taskId) {
    const task = ganttData.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Cerrar cualquier popup de color existente
    const existingPopup = document.querySelector('.color-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Guardar color original para poder cancelar
    const originalColor = task.color;
    
    // Crear popup de color
    const popup = document.createElement('div');
    popup.className = 'color-popup';
    popup.innerHTML = `
        <div class="color-popup-content">
            <label>Cambiar color de la tarea:</label>
            <input type="color" id="temp-color-input" value="${task.color}">
            <div class="color-popup-buttons">
                <button class="btn btn-primary btn-sm" id="apply-color">Aplicar</button>
                <button class="btn btn-sm" id="cancel-color">Cancelar</button>
            </div>
        </div>
    `;
    
    // Estilos del popup
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1001;
        min-width: 220px;
    `;
    
    // Agregar al DOM
    document.body.appendChild(popup);
    
    // Event listeners
    const colorInput = popup.querySelector('#temp-color-input');
    const applyBtn = popup.querySelector('#apply-color');
    const cancelBtn = popup.querySelector('#cancel-color');
    
    // Vista previa en tiempo real
    colorInput.oninput = function() {
        task.color = this.value;
        renderAll();
    };
    
    applyBtn.onclick = function() {
        // El color ya está aplicado por la vista previa
        popup.remove();
    };
    
    cancelBtn.onclick = function() {
        // Restaurar color original
        task.color = originalColor;
        renderAll();
        popup.remove();
    };
    
    // Cerrar con ESC (cancelar)
    const handleKeyDown = function(e) {
        if (e.key === 'Escape') {
            task.color = originalColor;
            renderAll();
            popup.remove();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Enfocar el input de color
    colorInput.focus();
}

function editTask(taskId) {
    const task = ganttData.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    currentEditingTask = task;
    isCreatingNewTask = false; // Estamos editando, no creando
    userChangedColor = false; // Resetear la bandera al abrir el modal
    
    document.getElementById('task-name').value = task.name;
    document.getElementById('task-start').value = task.start;
    document.getElementById('task-end').value = task.end;
    document.getElementById('task-progress').value = task.progress;
    document.getElementById('task-resources').value = task.resources || '';
    document.getElementById('task-dependencies').value = task.dependencies.join(', ');
    document.getElementById('task-color').value = task.color;
    
    // Configurar tipo (grupo o tarea)
    document.getElementById('task-type').value = task.group ? 'group' : 'task';
    
    // Actualizar campos según el tipo (esto llama a populateParentDropdown internamente)
    toggleTaskFields();
    
    // Configurar grupo padre DESPUÉS de toggleTaskFields para que no se pierda el valor
    document.getElementById('task-parent').value = task.parent || '';
    
    // Mostrar/ocultar botón eliminar según si estamos creando o editando
    const deleteButton = document.getElementById('delete-task');
    if (isCreatingNewTask) {
        deleteButton.style.display = 'none';
    } else {
        deleteButton.style.display = 'inline-block';
    }
    
    document.getElementById('task-modal').style.display = 'block';
}

function addNewTask() {
    // Obtener fecha inicial que sea día laborable
    let startDate = formatDate(new Date());
    if (isWeekend(startDate)) {
        startDate = getNextWorkday(startDate);
    }
    
    // Calcular fecha de fin que también sea día laborable (después de 3 días laborables)
    let endDate = startDate;
    let workdaysAdded = 0;
    while (workdaysAdded < 2) { // Solo necesitamos agregar 2 días laborables más porque ya tenemos el día de inicio
        endDate = getNextWorkday(endDate);
        workdaysAdded++;
    }
    
    const newTask = {
        id: nextTaskId++,
        name: "Nueva Tarea",
        start: startDate,
        end: endDate,
        progress: 0,
        dependencies: [],
        resources: "",
        color: DEFAULT_COLORS.task, // Usar color por defecto para tareas
        group: false
    };
    
    ganttData.tasks.push(newTask);
    currentEditingTask = newTask;
    isCreatingNewTask = true; // Estamos creando una nueva tarea
    userChangedColor = false; // Resetear la bandera al crear una nueva tarea
    
    // Configurar el formulario con los valores de la nueva tarea
    document.getElementById('task-name').value = newTask.name;
    document.getElementById('task-start').value = newTask.start;
    document.getElementById('task-end').value = newTask.end;
    document.getElementById('task-progress').value = newTask.progress;
    document.getElementById('task-resources').value = newTask.resources;
    document.getElementById('task-dependencies').value = '';
    document.getElementById('task-color').value = newTask.color;
    document.getElementById('task-type').value = 'task';
    
    // Poblar dropdown de grupos padre
    populateParentDropdown();
    document.getElementById('task-parent').value = '';
    
    // Actualizar campos según el tipo
    toggleTaskFields();
    
    // Ocultar botón eliminar para nuevas tareas
    const deleteButton = document.getElementById('delete-task');
    deleteButton.style.display = 'none';
    
    document.getElementById('task-modal').style.display = 'block';
    renderAll();
}

// Función para poblar el dropdown de grupos padre
function populateParentDropdown() {
    const parentSelect = document.getElementById('task-parent');
    parentSelect.innerHTML = '<option value="">Ninguno (Raíz)</option>';
    
    // Verificar si la tarea actual es un grupo
    const taskType = document.getElementById('task-type').value;
    const isGroup = taskType === 'group';
    
    // Si es un grupo, no mostrar opciones de padre (los grupos no pueden tener padre)
    if (isGroup) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Los grupos no pueden tener padre';
        option.disabled = true;
        parentSelect.appendChild(option);
        parentSelect.disabled = true;
        return;
    }
    
    // Para tareas normales, habilitar la selección de padre
    parentSelect.disabled = false;
    
    // Obtener solo los grupos (tareas con group: true)
    const groups = ganttData.tasks.filter(task => task.group);
    
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = `${group.id} - ${group.name}`;
        parentSelect.appendChild(option);
    });
}

// Función para alternar campos según el tipo seleccionado
function toggleTaskFields() {
    const taskType = document.getElementById('task-type').value;
    const isGroup = taskType === 'group';
    const colorInput = document.getElementById('task-color');
    
    // Solo cambiar el color si el usuario no lo ha modificado manualmente
    if (!userChangedColor) {
        const defaultColor = isGroup ? DEFAULT_COLORS.group : DEFAULT_COLORS.task;
        colorInput.value = defaultColor;
        
        // Actualizar el color en el objeto actual si estamos editando
        if (currentEditingTask) {
            currentEditingTask.color = defaultColor;
        }
    }
    
    // Los grupos normalmente no tienen fechas específicas tan estrictas
    // pero vamos a mantener todos los campos disponibles
    
    // Cambiar el placeholder del progreso para grupos
    const progressInput = document.getElementById('task-progress');
    if (isGroup) {
        progressInput.placeholder = "Progreso promedio del grupo";
    } else {
        progressInput.placeholder = "0";
    }
    
    // Para recursos, cambiar el placeholder
    const resourcesInput = document.getElementById('task-resources');
    if (isGroup) {
        resourcesInput.placeholder = "Equipo o departamento...";
    } else {
        resourcesInput.placeholder = "Asignado a...";
    }
    
    // Actualizar dropdown de padre según el tipo
    populateParentDropdown();
    
    // Limpiar dependencias si es un grupo (los grupos no deben tener dependencias)
    const dependenciesInput = document.getElementById('task-dependencies');
    if (isGroup) {
        dependenciesInput.value = '';
        dependenciesInput.placeholder = 'Los grupos no tienen dependencias';
        dependenciesInput.disabled = true;
    } else {
        dependenciesInput.placeholder = 'Ej: 1,2,3';
        dependenciesInput.disabled = false;
    }
}

// Función para actualizar automáticamente las fechas de un grupo basándose en sus tareas hijas
function updateGroupDates(groupId) {
    const childTasks = ganttData.tasks.filter(task => task.parent === groupId && !task.group);
    
    if (childTasks.length === 0) return;
    
    const group = ganttData.tasks.find(task => task.id === groupId);
    if (!group) return;
    
    // Encontrar la fecha más temprana y más tardía
    let earliestStart = parseDate(childTasks[0].start);
    let latestEnd = parseDate(childTasks[0].end);
    let totalProgress = 0;
    
    childTasks.forEach(task => {
        const taskStart = parseDate(task.start);
        const taskEnd = parseDate(task.end);
        
        if (taskStart < earliestStart) earliestStart = taskStart;
        if (taskEnd > latestEnd) latestEnd = taskEnd;
        
        totalProgress += task.progress;
    });
    
    // Actualizar el grupo
    group.start = formatDate(earliestStart);
    group.end = formatDate(latestEnd);
    group.progress = Math.round(totalProgress / childTasks.length);
}

// Función para actualizar todos los grupos automáticamente
function updateAllGroupDates() {
    const groups = ganttData.tasks.filter(task => task.group);
    groups.forEach(group => {
        updateGroupDates(group.id);
    });
}

// Función para expandir/colapsar grupos
function toggleGroup(groupId) {
    if (collapsedGroups.has(groupId)) {
        collapsedGroups.delete(groupId);
    } else {
        collapsedGroups.add(groupId);
    }
    renderAll();
}

// Función para expandir todos los grupos
function expandAll() {
    collapsedGroups.clear();
    renderAll();
}

// Función para colapsar todos los grupos
function collapseAll() {
    ganttData.tasks.forEach(task => {
        if (task.group) {
            collapsedGroups.add(task.id);
        }
    });
    renderAll();
}

function renderAll() {
    try {
        renderTimeline();
        renderChart();
        renderTaskTable();
        
        // CORRECCIÓN IMPORTANTE: Asegurar que timeline y chart tengan exactamente el mismo ancho
        const timelineHeader = document.getElementById('timeline-header');
        const chartBody = document.getElementById('chart-body');
        const chartContainer = document.querySelector('.gantt-chart');
        
        if (timelineHeader && chartBody && chartContainer) {
            // El contenido interno debe ser del ancho total
            const dateRange = getProjectDateRange();
            const totalDays = getDaysDifference(formatDate(dateRange.start), formatDate(dateRange.end));
            const exactWidth = totalDays * dayWidth;
            
            // CLAVE: Verificar si las dimensiones ya están correctas
            if (timelineHeader.offsetWidth !== exactWidth) {
                timelineHeader.style.width = exactWidth + 'px';
                timelineHeader.style.minWidth = exactWidth + 'px';
            }
            
            if (chartBody.offsetWidth !== exactWidth) {
                chartBody.style.width = exactWidth + 'px';
                chartBody.style.minWidth = exactWidth + 'px';
            }
            
            // Verificar las filas internas del timeline
            const monthsRow = timelineHeader.querySelector('.timeline-months-row');
            const daysRow = timelineHeader.querySelector('.timeline-days-row');
            
            if (monthsRow && monthsRow.offsetWidth !== exactWidth) {
                monthsRow.style.width = exactWidth + 'px';
                monthsRow.style.minWidth = exactWidth + 'px';
            }
            if (daysRow && daysRow.offsetWidth !== exactWidth) {
                daysRow.style.width = exactWidth + 'px';
                daysRow.style.minWidth = exactWidth + 'px';
            }
        }
        
        // Configurar drag and drop después de renderizar
        setupDragAndDrop();
        
        // Re-initialize scroll sync after rendering
        initScrollSync();
        
    } catch (error) {
        console.error('Error rendering Gantt:', error);
        // Fallback en caso de error
        document.getElementById('task-table-body').innerHTML = '<div style="padding: 20px; color: red;">Error al renderizar. Revisa la consola.</div>';
    }
}

// Initialize scroll synchronization between table and chart
function initScrollSync() {
    const tableContainer = document.querySelector('.table-container');
    const ganttChart = document.querySelector('.gantt-chart');
    
    if (!tableContainer || !ganttChart) {
        console.warn('Could not find scroll containers for synchronization');
        return;
    }
    
    let isScrolling = false;
    
    // Sync vertical scroll from table to chart
    tableContainer.addEventListener('scroll', function() {
        if (isScrolling) return;
        isScrolling = true;
        ganttChart.scrollTop = tableContainer.scrollTop;
        requestAnimationFrame(() => {
            isScrolling = false;
        });
    });
    
    // Sync vertical scroll from chart to table
    ganttChart.addEventListener('scroll', function() {
        if (isScrolling) return;
        isScrolling = true;
        tableContainer.scrollTop = ganttChart.scrollTop;
        requestAnimationFrame(() => {
            isScrolling = false;
        });
    });
}

// Splitter functionality for resizing table width
function initSplitter() {
    const splitter = document.getElementById('splitter');
    const ganttTable = document.getElementById('gantt-table');
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    const minWidth = 400; // Minimum table width
    const maxWidth = window.innerWidth * 0.8; // Maximum 80% of window width
    
    splitter.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startWidth = ganttTable.offsetWidth;
        
        // Add visual feedback
        document.body.style.cursor = 'col-resize';
        splitter.style.background = '#007bff';
        
        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const newWidth = startWidth + deltaX;
        
        // Apply constraints
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            ganttTable.style.width = newWidth + 'px';
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            
            // Remove visual feedback
            document.body.style.cursor = '';
            splitter.style.background = '';
            document.body.style.userSelect = '';
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        const currentWidth = ganttTable.offsetWidth;
        const newMaxWidth = window.innerWidth * 0.8;
        
        if (currentWidth > newMaxWidth) {
            ganttTable.style.width = newMaxWidth + 'px';
        }
    });
}

// Load test data from test-data-2026.json if available
async function loadTestData() {
    try {
        const response = await fetch('./test-data-2026.json');
        if (response.ok) {
            const testData = await response.json();
            ganttData = testData;
            console.log('Test data loaded successfully:', testData.tasks.length, 'tasks');
        }
    } catch (error) {
        console.log('Test data file not found or error loading, using default data');
    }
}

// Event Listeners - Wrap in DOMContentLoaded to ensure DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    
document.getElementById('add-task').onclick = addNewTask;

document.getElementById('task-form').onsubmit = function(e) {
    e.preventDefault();
    
    if (currentEditingTask) {
        const taskType = document.getElementById('task-type').value;
        const isGroup = (taskType === 'group');
        const parentId = document.getElementById('task-parent').value;
        const dependencies = document.getElementById('task-dependencies').value
            .split(',')
            .map(d => parseInt(d.trim()))
            .filter(d => !isNaN(d));
        
        // Validaciones para grupos
        if (isGroup) {
            // Regla 1: Un grupo no puede tener un grupo padre
            if (parentId) {
                alert('Error: Un grupo no puede tener un grupo padre. Los grupos deben estar en el nivel raíz.');
                return;
            }
            
            // Regla 2: Un grupo no debe tener dependencias
            if (dependencies.length > 0) {
                alert('Error: Un grupo no puede tener dependencias. Solo las tareas individuales pueden depender de otras.');
                return;
            }
            
            // Verificar si alguna tarea tiene como dependencia a este grupo
            const tasksWithThisGroupAsDependency = ganttData.tasks.filter(task => 
                task.dependencies && task.dependencies.includes(currentEditingTask.id)
            );
            
            if (tasksWithThisGroupAsDependency.length > 0) {
                const taskNames = tasksWithThisGroupAsDependency.map(t => t.name).join(', ');
                if (!confirm(`Advertencia: Las siguientes tareas dependen de este elemento: ${taskNames}.\n\nAl convertir esto en un grupo, se eliminarán estas dependencias. ¿Desea continuar?`)) {
                    return;
                }
                
                // Eliminar las dependencias de este elemento de todas las tareas
                ganttData.tasks.forEach(task => {
                    if (task.dependencies) {
                        task.dependencies = task.dependencies.filter(dep => dep !== currentEditingTask.id);
                    }
                });
            }
        } else {
            // Validación para tareas: no pueden depender de grupos
            const invalidDependencies = dependencies.filter(depId => {
                const depTask = ganttData.tasks.find(t => t.id === depId);
                return depTask && depTask.group;
            });
            
            if (invalidDependencies.length > 0) {
                const invalidGroupNames = invalidDependencies.map(depId => {
                    const group = ganttData.tasks.find(t => t.id === depId);
                    return `${group.id} - ${group.name}`;
                }).join(', ');
                alert(`Error: Una tarea no puede depender de grupos. Los siguientes elementos son grupos: ${invalidGroupNames}.\n\nLas tareas solo pueden depender de otras tareas individuales.`);
                return;
            }
        }
        
        // Si estamos convirtiendo una tarea a grupo, verificar si es padre de otras tareas
        if (isGroup && !currentEditingTask.group) {
            const childTasks = ganttData.tasks.filter(task => task.parent === currentEditingTask.id);
            if (childTasks.length === 0) {
                if (!confirm('Este elemento se convertirá en un grupo vacío. ¿Desea continuar?')) {
                    return;
                }
            }
        }
        
        // Actualizar los datos de la tarea
        currentEditingTask.name = document.getElementById('task-name').value;
        currentEditingTask.start = document.getElementById('task-start').value;
        currentEditingTask.end = document.getElementById('task-end').value;
        currentEditingTask.progress = parseInt(document.getElementById('task-progress').value);
        currentEditingTask.resources = document.getElementById('task-resources').value;
        currentEditingTask.color = document.getElementById('task-color').value;
        
        // Asignar dependencias (será array vacío para grupos)
        currentEditingTask.dependencies = dependencies;
        
        // Actualizar tipo
        currentEditingTask.group = isGroup;
        
        // Actualizar grupo padre solo para tareas (no para grupos)
        if (!isGroup && parentId) {
            currentEditingTask.parent = parseInt(parentId);
        } else {
            delete currentEditingTask.parent; // Eliminar la propiedad si no hay padre o es un grupo
        }
        
        // Si se cambió a grupo, actualizar las fechas automáticamente basándose en las tareas hijas
        if (currentEditingTask.group) {
            updateGroupDates(currentEditingTask.id);
        }
    }
    
    // Resetear variables después de guardar
    currentEditingTask = null;
    isCreatingNewTask = false;
    
    document.getElementById('task-modal').style.display = 'none';
    renderAll();
};

document.getElementById('delete-task').onclick = function() {
    if (!currentEditingTask) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
        ganttData.tasks = ganttData.tasks.filter(t => t.id !== currentEditingTask.id);
        
        // Remove dependencies to this task
        ganttData.tasks.forEach(task => {
            task.dependencies = task.dependencies.filter(d => d !== currentEditingTask.id);
        });
        
        // Resetear variables después de eliminar
        currentEditingTask = null;
        isCreatingNewTask = false;
        
        document.getElementById('task-modal').style.display = 'none';
        renderAll();
    }
};

document.querySelector('.close').onclick = function() {
    cancelTask();
};

// Función para manejar la cancelación del modal
function cancelTask() {
    if (isCreatingNewTask && currentEditingTask) {
        // Si estamos creando una nueva tarea, la eliminamos al cancelar
        const taskIndex = ganttData.tasks.findIndex(t => t.id === currentEditingTask.id);
        if (taskIndex !== -1) {
            ganttData.tasks.splice(taskIndex, 1);
        }
        renderAll();
    }
    
    // Resetear variables
    currentEditingTask = null;
    isCreatingNewTask = false;
    
    // Cerrar modal
    document.getElementById('task-modal').style.display = 'none';
}

// Event listener para el botón cancelar
document.getElementById('cancel-task').onclick = function() {
    cancelTask();
};

// Event listener para cambios en el tipo de tarea
document.getElementById('task-type').addEventListener('change', function() {
    toggleTaskFields();
});

// Event listener para cambios en el color - vista previa en tiempo real
document.getElementById('task-color').addEventListener('input', function() {
    // Este evento se dispara mientras el usuario está cambiando el color
    // Marcar que el usuario ha cambiado el color manualmente
    userChangedColor = true;
});

document.getElementById('task-color').addEventListener('change', function() {
    // Este evento se dispara cuando el usuario termina de cambiar el color
    // Marcar que el usuario ha cambiado el color manualmente
    userChangedColor = true;
    
    if (currentEditingTask) {
        currentEditingTask.color = this.value;
        // No renderizar aquí para evitar conflictos, el color se guardará al enviar el formulario
    }
});

// Event listener delegado para los indicadores de color
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('color-indicator')) {
        e.preventDefault();
        e.stopPropagation();
        const taskId = parseInt(e.target.getAttribute('data-task-id'));
        if (taskId) {
            changeTaskColor(taskId);
        }
    }
});

document.getElementById('import-json').onclick = () => {
    document.getElementById('file-input').click();
};

document.getElementById('file-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.tasks) {
                ganttData = data;
            } else {
                // Convert old format
                ganttData.tasks = [];
                let id = 1;
                data.groups?.forEach(group => {
                    group.tasks?.forEach(task => {
                        ganttData.tasks.push({
                            ...task,
                            color: task.color || "#007bff",
                            progress: task.progress || 0,
                            resources: task.resources || "",
                            group: false
                        });
                        if (task.id >= id) id = task.id + 1;
                    });
                });
            }
            nextTaskId = Math.max(...ganttData.tasks.map(t => t.id)) + 1;
            renderAll();
        } catch (err) {
            alert('JSON inválido: ' + err.message);
        }
    };
    reader.readAsText(file);
};

document.getElementById('export-json').onclick = () => {
    const dataStr = JSON.stringify(ganttData, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gantt-professional.json';
    a.click();
    URL.revokeObjectURL(url);
};

// CSV Export/Import functionality
function convertToCSV(data) {
    const headers = [
        'ID', 'Nombre', 'Inicio', 'Fin', 'Progreso', 'Dependencias', 
        'Recursos', 'Color', 'Es Grupo', 'Grupo Padre'
    ];
    
    const csvContent = [headers.join(',')];
    
    data.tasks.forEach(task => {
        const row = [
            task.id,
            `"${task.name.replace(/"/g, '""')}"`, // Escape quotes in names
            task.start,
            task.end,
            task.progress || 0,
            `"${(task.dependencies || []).join('|')}"`, // Dependencies separated by pipe
            `"${(task.resources || '').replace(/"/g, '""')}"`, // Escape quotes in resources
            task.color || '#007bff',
            task.group ? 'true' : 'false',
            task.parent || ''
        ];
        csvContent.push(row.join(','));
    });
    
    return csvContent.join('\n');
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('El archivo CSV debe contener al menos una fila de encabezados y una fila de datos');
    
    // Skip header row
    const dataLines = lines.slice(1);
    const tasks = [];
    
    dataLines.forEach((line, index) => {
        try {
            // Simple CSV parser - handles quoted fields
            const values = parseCSVLine(line);
            
            if (values.length < 10) {
                console.warn(`Fila ${index + 2}: Datos insuficientes, completando con valores por defecto`);
            }
            
            const task = {
                id: parseInt(values[0]) || (index + 1),
                name: values[1] ? values[1].replace(/^"|"$/g, '').replace(/""/g, '"') : `Tarea ${index + 1}`,
                start: values[2] || new Date().toISOString().split('T')[0],
                end: values[3] || new Date().toISOString().split('T')[0],
                progress: parseInt(values[4]) || 0,
                dependencies: values[5] ? values[5].replace(/^"|"$/g, '').split('|').filter(d => d.trim()).map(d => parseInt(d.trim())).filter(d => !isNaN(d)) : [],
                resources: values[6] ? values[6].replace(/^"|"$/g, '').replace(/""/g, '"') : '',
                color: values[7] || '#007bff',
                group: values[8] === 'true',
                parent: values[9] ? parseInt(values[9]) : undefined
            };
            
            // Remove parent property if undefined
            if (task.parent === undefined) {
                delete task.parent;
            }
            
            tasks.push(task);
        } catch (error) {
            console.error(`Error procesando fila ${index + 2}:`, error);
            throw new Error(`Error en fila ${index + 2}: ${error.message}`);
        }
    });
    
    return { tasks };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add the last field
    result.push(current);
    
    return result;
}

document.getElementById('export-csv').onclick = () => {
    try {
        const csvData = convertToCSV(ganttData);
        // Agregar BOM UTF-8 para que Excel reconozca correctamente los caracteres especiales
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvData], {type: 'text/csv;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gantt-project.csv';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Error al exportar CSV: ' + error.message);
    }
};

document.getElementById('import-csv').onclick = () => {
    document.getElementById('csv-file-input').click();
};

document.getElementById('csv-file-input').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const csvText = evt.target.result;
            const data = parseCSV(csvText);
            
            if (data.tasks && data.tasks.length > 0) {
                ganttData = data;
                nextTaskId = Math.max(...ganttData.tasks.map(t => t.id)) + 1;
                renderAll();
                alert(`CSV importado exitosamente. ${data.tasks.length} tareas cargadas.`);
            } else {
                alert('El archivo CSV no contiene tareas válidas.');
            }
        } catch (err) {
            alert('Error al procesar CSV: ' + err.message);
        }
    };
    reader.readAsText(file, 'UTF-8');
};

document.getElementById('new-project').onclick = () => {
    if (confirm('¿Crear un nuevo proyecto? Se perderán los cambios no guardados.')) {
        ganttData.tasks = [];
        nextTaskId = 1;
        renderAll();
    }
};

// Zoom controls
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomFitBtn = document.getElementById('zoom-fit');

if (zoomInBtn) {
    zoomInBtn.onclick = () => {
        // Guardar la posición de scroll actual
        const chartContainer = document.querySelector('.gantt-chart');
        const currentScrollRatio = chartContainer.scrollLeft / (chartContainer.scrollWidth - chartContainer.clientWidth);
        
        // Aumentar el ancho del día para hacer zoom in
        if (dayWidth < 60) {  // Límite máximo
            const oldDayWidth = dayWidth;
            dayWidth += 5;
            renderAll();
            
            // Restaurar la posición de scroll proporcional
            setTimeout(() => {
                const newScrollMax = chartContainer.scrollWidth - chartContainer.clientWidth;
                chartContainer.scrollLeft = currentScrollRatio * newScrollMax;
            }, 10);
        }
    };
}

if (zoomOutBtn) {
    zoomOutBtn.onclick = () => {
        // Guardar la posición de scroll actual
        const chartContainer = document.querySelector('.gantt-chart');
        const currentScrollRatio = chartContainer.scrollLeft / (chartContainer.scrollWidth - chartContainer.clientWidth);
        
        // Disminuir el ancho del día para hacer zoom out
        if (dayWidth > 15) {  // Límite mínimo
            const oldDayWidth = dayWidth;
            dayWidth -= 5;
            renderAll();
            
            // Restaurar la posición de scroll proporcional
            setTimeout(() => {
                const newScrollMax = chartContainer.scrollWidth - chartContainer.clientWidth;
                chartContainer.scrollLeft = currentScrollRatio * newScrollMax;
            }, 10);
        }
    };
}

if (zoomFitBtn) {
    zoomFitBtn.onclick = () => {
        // Ajustar el zoom para que todo el proyecto quepa en la ventana
        const chartContainer = document.querySelector('.gantt-chart');
        const containerWidth = chartContainer.clientWidth - 50; // Margen
        
        if (ganttData && ganttData.tasks.length > 0) {
            const allDates = ganttData.tasks.flatMap(task => [task.start, task.end]);
            const minDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
            const maxDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
            const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
            
            const optimalDayWidth = Math.max(15, Math.min(60, containerWidth / totalDays));
            dayWidth = optimalDayWidth;
            renderAll();
        }
    };
}

// Expand/Collapse controls
document.getElementById('expand-all').onclick = () => {
    expandAll();
};

document.getElementById('collapse-all').onclick = () => {
    collapseAll();
};

document.getElementById('update-groups').onclick = function() {
    updateAllGroupDates();
    renderAll();
    alert('Fechas de grupos actualizadas automáticamente');
};

// About modal controls
const aboutBtn = document.getElementById('about-btn');
const aboutModal = document.getElementById('about-modal');
const aboutClose = document.querySelector('.about-close');

if (aboutBtn) {
    aboutBtn.onclick = () => {
        aboutModal.style.display = 'block';
    };
}

if (aboutClose) {
    aboutClose.onclick = () => {
        aboutModal.style.display = 'none';
    };
}

// Close about modal when clicking outside
window.onclick = function(event) {
    if (event.target === aboutModal) {
        aboutModal.style.display = 'none';
    }
    if (event.target === helpModal) {
        helpModal.style.display = 'none';
    }
};

// Help modal controls
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const helpClose = document.querySelector('.help-close');

if (helpBtn) {
    helpBtn.onclick = () => {
        helpModal.style.display = 'block';
    };
}

if (helpClose) {
    helpClose.onclick = () => {
        helpModal.style.display = 'none';
    };
}

// Modal close on outside click - DISABLED
// The modal should only close when clicking specific buttons (Save, Delete, Cancel, X)
// window.onclick = function(event) {
//     const modal = document.getElementById('task-modal');
//     if (event.target === modal) {
//         modal.style.display = 'none';
//     }
// };

// Make functions globally available
window.toggleGroup = toggleGroup;
window.editTask = editTask;
window.updateTaskField = updateTaskField;
window.changeTaskColor = changeTaskColor;
window.validateWorkdayDate = validateWorkdayDate;

    // Load test data if available and then initialize
    loadTestData().then(() => {
        renderAll();
    });

    // Initialize scroll synchronization
    initScrollSync();

    // Sync scroll between timeline header and chart body
    const chartContainer = document.querySelector('.gantt-chart');
    const timelineHeader = document.getElementById('timeline-header');
    const chartBody = document.getElementById('chart-body');

    // Splitter functionality for resizing table width
    initSplitter();

}); // End of DOMContentLoaded