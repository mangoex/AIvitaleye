# Feature 002: Auditar y Corregir Flujo de Imágenes

## Problema
El sistema AI Studio generó un "simulador de cámara" en `App.tsx` como método de seguridad por si fallaba la webcam. Este simulador dibuja un ojo usando HTML5 Canvas.
Los usuarios en producción (Railway) a menudo rechazan los permisos de cámara o sus navegadores los bloquean. Cuando esto sucede, el simulador se activa, mostrando un ojo dibujado.
El usuario cree que la IA está alucinando e "inventando/generando imágenes de ojos", y se frustra porque la IA analiza este ojo de caricatura (que siempre es el mismo) y da resultados idénticos, ignorando su verdadero iris.

## Requerimientos de la Solución
1. **Eliminar Simulador**: El código fuente no debe contener la función `generateProceduralIris` ni ninguna referencia a simulación gráfica de iris.
2. **Fallo Gracioso (Graceful Degradation)**: Si la cámara falla o el usuario niega el permiso, la UI debe volver a su estado base con un mensaje de error claro en texto rojo (e.g. "Permiso de cámara denegado. Suba una foto usando el botón de seleccionar archivo.")
3. **Validación del Upload**: Confirmar que la subida de archivos clásica (`input type="file"`) captura correctamente la imagen y la almacena en el estado `photoPreview` sin interferencias.
