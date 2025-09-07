// Gantt Data Structure - Professional Format
let ganttData = {
    tasks: [
        { id: 1, name: "Planificación del Proyecto", start: "2025-09-01", end: "2025-09-05", progress: 100, dependencies: [], resources: "Project Manager", color: "#007bff", group: true },
        { id: 2, name: "Análisis de Requisitos", start: "2025-09-01", end: "2025-09-03", progress: 100, dependencies: [], resources: "Business Analyst", color: "#28a745", group: false, parent: 1 },
        { id: 3, name: "Diseño de Arquitectura", start: "2025-09-04", end: "2025-09-05", progress: 80, dependencies: [2], resources: "Tech Lead", color: "#28a745", group: false, parent: 1 },
        
        { id: 4, name: "Desarrollo Frontend", start: "2025-09-06", end: "2025-09-20", progress: 60, dependencies: [3], resources: "Frontend Team", color: "#ffc107", group: true },
        { id: 5, name: "Diseño UI/UX", start: "2025-09-06", end: "2025-09-10", progress: 90, dependencies: [3], resources: "UI Designer", color: "#17a2b8", group: false, parent: 4 },
        { id: 6, name: "Implementación Componentes", start: "2025-09-11", end: "2025-09-18", progress: 50, dependencies: [5], resources: "Frontend Dev", color: "#17a2b8", group: false, parent: 4 },
        { id: 7, name: "Testing Frontend", start: "2025-09-19", end: "2025-09-20", progress: 0, dependencies: [6], resources: "QA Tester", color: "#17a2b8", group: false, parent: 4 },
        
        { id: 8, name: "Desarrollo Backend", start: "2025-09-08", end: "2025-09-22", progress: 40, dependencies: [3], resources: "Backend Team", color: "#dc3545", group: true },
        { id: 9, name: "API Development", start: "2025-09-08", end: "2025-09-16", progress: 70, dependencies: [3], resources: "Backend Dev", color: "#6f42c1", group: false, parent: 8 },
        { id: 10, name: "Database Setup", start: "2025-09-08", end: "2025-09-12", progress: 100, dependencies: [3], resources: "DBA", color: "#6f42c1", group: false, parent: 8 },
        { id: 11, name: "Integration Testing", start: "2025-09-17", end: "2025-09-22", progress: 0, dependencies: [9, 10], resources: "QA Team", color: "#6f42c1", group: false, parent: 8 },
        
        { id: 12, name: "Deployment", start: "2025-09-23", end: "2025-09-25", progress: 0, dependencies: [7, 11], resources: "DevOps", color: "#20c997", group: false },
        { id: 13, name: "Bug Fix Critical", start: "2025-09-15", end: "2025-09-16", progress: 100, dependencies: [9], resources: "Dev Team", color: "#fd7e14", group: false },
        { id: 14, name: "Security Review", start: "2025-09-10", end: "2025-09-14", progress: 50, dependencies: [10], resources: "Security Team", color: "#e83e8c", group: false }
    ]
};

let zoomLevel = 1; // 1 = days, 2 = weeks, 3 = months
let dayWidth = 30; // pixels per day - Global variable for zoom
let currentEditingTask = null;
let isCreatingNewTask = false; // Para diferenciar entre crear y editar
let nextTaskId = 15;
let collapsedGroups = new Set(); // Para rastrear grupos colapsados

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
        const duration = getDaysDifference(task.start, task.end);
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
                <div class="task-cell task-name-cell" onclick="editTask(${task.id})">
                    ${isGroup ? `<span class="expand-icon ${isCollapsed ? 'collapsed' : ''}" onclick="toggleGroup(${task.id}); event.stopPropagation();">${expandIcon}</span>` : ''}
                    ${indent}${task.name}
                    ${isGroup ? ' <small>(Grupo)</small>' : ''}
                    ${hasParent ? ' <small>(Subtarea)</small>' : ''}
                </div>
                <div class="task-cell">${task.id}</div>
                <div class="task-cell">
                    <input type="date" value="${task.start}" onchange="updateTaskField(${task.id}, 'start', this.value)">
                </div>
                <div class="task-cell">
                    <input type="date" value="${task.end}" onchange="updateTaskField(${task.id}, 'end', this.value)">
                </div>
                <div class="task-cell">${duration} días</div>
                <div class="task-cell">
                    <input type="number" value="${task.progress}" min="0" max="100" style="width: 50px;" onchange="updateTaskField(${task.id}, 'progress', this.value)">
                </div>
                <div class="task-cell">${task.dependencies.join(', ')}</div>
                <div class="task-cell">${task.resources || ''}</div>
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
                    `<div class="group-bar" style="left: ${left}px; width: ${width}px; background: ${task.color} !important;">${task.name}</div>` :
                    `<div class="task-bar" style="left: ${left}px; width: ${width}px; background-color: ${task.color};" onclick="editTask(${task.id})" title="${task.name}">
                        <div class="progress-bar" style="width: ${task.progress}%;"></div>
                        <span>${task.name}</span>
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
                        
                        svgContent += `<path d="${pathD}" class="dependency-line" />`;
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
    
    // Calcular el ancho total exacto (igual que en timeline)
    const totalWidth = totalDays * dayWidth;
    
    chartBody.innerHTML = `
        ${html}
        <svg class="gantt-svg" style="width: ${totalWidth}px; height: ${visibleTasks.length * 40}px;">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" class="dependency-arrow" />
                </marker>
            </defs>
            ${svgContent}
        </svg>
    `;
    
    // Asegurar que el chart body tenga dimensiones fijas exactas
    chartBody.style.width = totalWidth + 'px';
    chartBody.style.minWidth = totalWidth + 'px';
    chartBody.style.maxWidth = totalWidth + 'px';
}

// Task management functions
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
    
    document.getElementById('task-name').value = task.name;
    document.getElementById('task-start').value = task.start;
    document.getElementById('task-end').value = task.end;
    document.getElementById('task-progress').value = task.progress;
    document.getElementById('task-resources').value = task.resources || '';
    document.getElementById('task-dependencies').value = task.dependencies.join(', ');
    document.getElementById('task-color').value = task.color;
    
    // Configurar tipo (grupo o tarea)
    document.getElementById('task-type').value = task.group ? 'group' : 'task';
    
    // Poblar dropdown de grupos padre
    populateParentDropdown();
    
    // Configurar grupo padre
    document.getElementById('task-parent').value = task.parent || '';
    
    // Actualizar campos según el tipo
    toggleTaskFields();
    
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
    const newTask = {
        id: nextTaskId++,
        name: "Nueva Tarea",
        start: formatDate(new Date()),
        end: formatDate(addDays(new Date(), 3)),
        progress: 0,
        dependencies: [],
        resources: "",
        color: "#007bff",
        group: false
    };
    
    ganttData.tasks.push(newTask);
    currentEditingTask = newTask;
    isCreatingNewTask = true; // Estamos creando una nueva tarea
    
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
        
    } catch (error) {
        console.error('Error rendering Gantt:', error);
        // Fallback en caso de error
        document.getElementById('task-table-body').innerHTML = '<div style="padding: 20px; color: red;">Error al renderizar. Revisa la consola.</div>';
    }
}

// Event Listeners - Wrap in DOMContentLoaded to ensure DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    
document.getElementById('add-task').onclick = addNewTask;

document.getElementById('task-form').onsubmit = function(e) {
    e.preventDefault();
    
    if (currentEditingTask) {
        currentEditingTask.name = document.getElementById('task-name').value;
        currentEditingTask.start = document.getElementById('task-start').value;
        currentEditingTask.end = document.getElementById('task-end').value;
        currentEditingTask.progress = parseInt(document.getElementById('task-progress').value);
        currentEditingTask.resources = document.getElementById('task-resources').value;
        currentEditingTask.color = document.getElementById('task-color').value;
        currentEditingTask.dependencies = document.getElementById('task-dependencies').value
            .split(',')
            .map(d => parseInt(d.trim()))
            .filter(d => !isNaN(d));
        
        // Actualizar tipo y grupo padre
        const taskType = document.getElementById('task-type').value;
        currentEditingTask.group = (taskType === 'group');
        
        const parentId = document.getElementById('task-parent').value;
        if (parentId) {
            currentEditingTask.parent = parseInt(parentId);
        } else {
            delete currentEditingTask.parent; // Eliminar la propiedad si no hay padre
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

// Event listener para cambios en el color - vista previa en tiempo real
document.getElementById('task-color').addEventListener('input', function() {
    // Este evento se dispara mientras el usuario está cambiando el color
    // Útil para vista previa en tiempo real si se desea
});

document.getElementById('task-color').addEventListener('change', function() {
    // Este evento se dispara cuando el usuario termina de cambiar el color
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
};

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

// Initialize
renderAll();

// Sync scroll between timeline header and chart body
const chartContainer = document.querySelector('.gantt-chart');
const timelineHeader = document.getElementById('timeline-header');
const chartBody = document.getElementById('chart-body');


}); // End of DOMContentLoaded
