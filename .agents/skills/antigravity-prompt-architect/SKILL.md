---
name: antigravity-prompt-architect
description: Transforma ideas, requerimientos o descripciones de tareas de desarrollo de software en prompts altamente estructurados, viables y optimizados para entornos agenticos como Google Antigravity, Cursor, Windsurf y Claude Code. Usa esta skill siempre que el usuario pida generar, optimizar, estructurar u orquestar un prompt para desarrollar una aplicacion, implementar una feature, corregir un bug, refactorizar codigo o coordinar subagentes.
---
# Antigravity Prompt Architect

Convierte descripciones de funcionalidades, bugs o arquitecturas en prompts de alta densidad semantica disenados para disparar los flujos de trabajo nativos mas eficientes en IDEs agenticos (Google Antigravity, Cursor, Windsurf, Claude Code). Prioriza el ahorro del presupuesto de atencion (context engineering), el uso de disparadores lexicos exactos, el anclaje de archivos y los bucles de verificacion determinista.

## When to Use

- El usuario quiere crear, estructurar o mejorar un prompt para desarrollar una aplicacion o funcionalidad en Antigravity u otro IDE agentico.
- El usuario describe una tarea tecnica (feature, refactorizacion, migracion, bugfix o arquitectura desde cero) y solicita el prompt optimo para delegarla al agente.
- El usuario busca saber que comandos slash (`/plan`, `/grill-me`, `/goal`, `/boost`, `/teamwork`, `/browser`), menciones (`@archivo`, `@subagente`) o artefactos (`implementation_plan.md`, `task.md`, `walkthrough.md`) activar para su caso de uso.

## Steps

### Paso 1: Clasificar la Tarea y Seleccionar el Disparador de Modo (Slash Command)

Analiza la solicitud del usuario y asigna el comando raiz que activa la arquitectura de ejecucion correcta en Antigravity:

1. **Requisitos ambiguos o arquitectura por definir**: Usa `/grill-me` o la combinacion `/plan /grill-me` para forzar al agente a inspeccionar el repositorio primero y entrevistar al desarrollador pregunta por pregunta (proponiendo una respuesta recomendada para cada una) antes de tocar codigo.
2. **Features multi-archivo, refactorizaciones o cambios de alto riesgo**: Usa `/plan` para activar el ciclo de 4 fases (Exploracion sin efectos secundarios -> Clarificacion -> Creacion del artefacto `implementation_plan.md` -> Pausa para aprobacion humana).
3. **Ejecucion autonoma con criterio de exito determinista (tests/builds)**: Usa `/goal` cuando los requisitos estan cerrados y el agente debe iterar continuamente (escribir codigo -> correr tests -> reparar fallos) sin pausas intermedias hasta cumplir el 100% del objetivo.
4. **Bugs complejos, condiciones de carrera o cuellos de botella algoritmicos**: Usa `/boost` para activar la jerarquia de razonamiento en 3 niveles (`Orchestrator -> DeepCoder / DeepInvestigator -> isolated workers`) con verificacion de hipotesis en paralelo.
5. **Migraciones a escala de repositorio o proyectos multi-dia**: Usa `/teamwork` para iniciar equipos colaborativos de subagentes liderados por la entrevista de alcance del *Sentinel*.
6. **Validacion visual, DOM o flujos E2E en navegador**: Incluye `/browser` en la fase de verificacion para que el subagente de Chrome inspeccione la UI en vivo y adjunte capturas en `walkthrough.md`.

### Paso 2: Aplicar Disparadores Lexicos de Alta Eficiencia (Lexical Triggers)

Sustituye verbos vagos ("haz", "arregla", "mejora", "crea") por verbos operativos que activan herramientas especificas del arnes agentico:

- **Disparadores de Exploracion Just-in-Time (Fase Read-Only)**:
  - Usa: *"Inspecciona `@ruta/archivo`"*, *"Traza el grafo de llamadas de `FuncionX`"*, *"Analiza las convenciones existentes en `@directorio/` antes de proponer cambios"*.
  - Por que funciona: Evita que el agente contamine su ventana de contexto con busquedas `grep` masivas o invente abstracciones duplicadas.

- **Disparadores de Planificacion y Artefactos (Fase Blueprint)**:
  - Usa: *"Genera un `implementation_plan.md` detallando los archivos afectados, cambios de interfaz y riesgos"*, *"Desglosa el trabajo en hitos atomicos dentro de `task.md`"*, *"Deten la ejecucion y solicita revision antes de modificar archivos fuente"*.
  - Por que funciona: Sincroniza el estado mental del agente con el sistema nativo de artefactos de Antigravity.

- **Disparadores de Alcance y Restricciones (Boundary Control)**:
  - Usa: *"Modifica UNICAMENTE `@archivoA` y `@archivoB`"*, *"Preserva intactas las firmas publicas y contratos de API en `@tipos`"*, *"No instales nuevas dependencias sin autorizacion explicita"*, *"Reutiliza el patron de manejo de errores implementado en `@referencia`"*.
  - Por que funciona: Previene regresiones colaterales y refactorizaciones no solicitadas fuera del alcance.

- **Disparadores de Delegacion a Subagentes (Context Isolation)**:
  - Usa: *"Delega la exploracion inicial a `@research`"*, *"Ejecuta las modificaciones de modulos independientes mediante subagentes en paralelo usando worktrees aislados (`branch`)"*.
  - Por que funciona: Mantiene limpia la ventana de contexto del agente principal recibiendo solo resumenes destilados (1,000 a 2,000 tokens).

- **Disparadores de Verificacion en Bucle Cerrado (Closed-Loop Verification)**:
  - Usa: *"Verifica la implementacion ejecutando `<comando exacto de test/build/lint>`"*, *"Itera sobre cualquier error de compilacion o test fallido hasta obtener codigo de salida 0"*, *"Documenta los cambios y la evidencia de pruebas en `walkthrough.md`"*.
  - Por que funciona: El mecanismo mas potente para garantizar codigo funcional en Antigravity es atar el final del prompt a un oraculo determinista (test suite, typechecker o linter).

### Paso 3: Estructurar el Prompt con la Arquitectura de 5 Bloques

Construye siempre el prompt resultante utilizando esta plantilla modular en Markdown/XML (disenada en la "zona Goldilocks" de altitud: lo suficientemente especifica para acotar archivos y comandos, pero flexible en la implementacion interna):

```markdown
[COMANDO SLASH OPCIONAL: /plan | /plan /grill-me | /goal | /boost | /teamwork]

## 1. Objetivo y Resultado Esperado (Goal & Target State)
[1-2 oraciones declarativas con verbos de accion precisos que definan exactamente que cambio arquitectonico o funcional debe lograrse y por que.]

## 2. Anclaje de Contexto (@Mentions & Grounding)
- **Archivos objetivo a modificar**: `@ruta/exacta/archivo1`, `@ruta/exacta/archivo2`
- **Referencias de patron / contratos a respetar**: `@ruta/referencia_patron`, `@AGENTS.md`
- **Contexto del sistema**: [Stack tecnologico relevante y estado actual en 2-3 lineas concisas]

## 3. Protocolo de Ejecucion por Fases (Execution Trajectory)
1. **Exploracion (Read-Only)**: Inspecciona `@archivos` para mapear dependencias y contratos actuales sin editar codigo.
2. **Planificacion (Artifact Gate)**: Genera o actualiza `implementation_plan.md` y `task.md` con los pasos atomicos. [Incluir si aplica: Pausa para revision antes de editar.]
3. **Implementacion Acotada**: Aplica los cambios siguiendo la arquitectura existente. [Si la tarea es grande: Delega subtareas independientes a subagentes en paralelo.]

## 4. Restricciones e Invariantes (Strict Boundaries)
- **Fuera de alcance (NO tocar)**: [Archivos, contratos publicos o configuraciones que no deben alterarse]
- **Invariantes tecnicos**: [Tipado estricto, manejo de errores, convenciones de nombres, cero dependencias nuevas]

## 5. Bucle de Verificacion y Criterio de Exito (Verification Loop)
- **Validacion determinista**: Ejecuta `[comando exacto: ej. npm run test -- ruta/test.spec.ts && npm run typecheck]` e itera hasta que pase con 0 errores.
- **Validacion visual / E2E (si aplica)**: Usa `/browser` en `[URL local]` para comprobar el renderizado y el flujo de usuario.
- **Cierre**: Registra las decisiones clave y la salida de los tests en `walkthrough.md`.
```

### Paso 4: Entregar el Prompt Orquestado y Recomendaciones de Entorno

Al responder al usuario con el prompt generado:

1. **Entrega el bloque del prompt listo para copiar y pegar**: Si el usuario no conoce aun los nombres exactos de sus archivos, coloca marcadores `@ruta/a/tu_archivo` claramente visibles e indicale que en Antigravity basta con escribir `@` para autocompletarlos.
2. **Justifica brevemente la seleccion de disparadores**: Explica en 2 o 3 puntos por que elegiste ese comando slash (`/plan`, `/goal`, `/boost`, etc.) y esa estrategia de verificacion.
3. **Sugiere extraccion a Reglas o Skills si detectas instrucciones repetitivas**: Si el usuario incluye estandares globales (ej. "usa siempre Zod", "nunca uses `any`", "estructura de carpetas X"), recomiendale mover esas invariantes a `AGENTS.md` o `.agents/rules/*.md` (usando `trigger: glob` o `trigger: model_decision`) o ejecutar `/learn` al finalizar la sesion para no gastar tokens repitiendolas en cada prompt.

## Gotchas

- **Evita el "Context Rot" (Prompts enciclopedicos)**: No generes prompts de miles de palabras intentando explicar como programar en React o Python. El agente ya conoce el lenguaje; lo que necesita son punteros exactos al repositorio (`@archivo`), restricciones de negocio y el comando de verificacion.
- **No mezcles exploracion abierta con `/goal`**: Si los requisitos tienen incognitas arquitectonicas, nunca uses `/goal` de entrada porque el agente tomara decisiones asumidas sin pausar. Usa `/plan /grill-me` primero y pasa a `/goal` una vez aprobado el `implementation_plan.md`.
- **Especifica siempre el comando de verificacion**: Un prompt sin un comando ejecutable de prueba (`pytest`, `cargo test`, `npm run build`, `/browser`) obliga al agente a confiar ciegamente en su primera generacion de codigo en lugar de activar su bucle de auto-reparacion.
