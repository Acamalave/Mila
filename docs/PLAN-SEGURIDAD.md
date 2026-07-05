# Plan de seguridad — Mila Concept

_Estado al 2026-07-04. Redactado tras la auditoría del módulo contable._

## Situación actual (por qué esto es urgente)

- **No hay Firebase Auth.** La "sesión" es un registro en `localStorage` y el login
  solo pide un número de teléfono — sin OTP, sin contraseña. Quien conozca el
  teléfono de una cuenta entra como esa cuenta. (Se encontró y ocultó una cuenta
  admin de prueba cuyo teléfono era el número público del salón.)
- **Las reglas de Firestore permiten lectura pública total** y escritura con
  validación de forma solamente (`firestore.rules` lo documenta como deuda).
  Cualquiera con la API key del bundle JS —es decir, cualquiera— puede leer
  clientes, facturas y comisiones, marcar facturas como pagadas o cambiar tasas
  de comisión. Los roles solo se validan en la interfaz.
- **No hay respaldos** programados de Firestore.

## Fase 1 — Firebase Auth con teléfono (requiere consola de Firebase)

1. Consola → Authentication → Sign-in method → habilitar **Phone**.
2. Reemplazar el login casero por `signInWithPhoneNumber` (OTP por SMS) y ligar
   `users/{uid}` al `uid` real de Auth (migrar los ids `user-<phone>` actuales).
3. Guardar el rol (`admin | stylist | accountant | client`) como **custom claim**
   (vía Cloud Function o Admin SDK) — nunca como campo editable por el cliente.
4. Costo: SMS de verificación (~USD 0.01–0.06 por envío). Panamá está soportado.

## Fase 2 — App Check

1. Consola → App Check → registrar la web app con **reCAPTCHA Enterprise/v3**.
2. `initializeAppCheck` en `src/lib/firebase.ts`.
3. Activar enforcement en Firestore cuando el porcentaje de tráfico verificado
   sea ~100%. Esto corta el acceso por API key desde fuera del sitio.

## Fase 3 — Reglas por rol (después de Fase 1)

Esqueleto objetivo para `firestore.rules`:

```
function role() { return request.auth.token.role; }
match /invoices/{id} {
  allow read: if role() in ['admin', 'accountant']
    || (role() == 'stylist' && resource.data.stylistId == request.auth.uid);
  allow write: if role() == 'admin';
}
match /commissions/{id} {
  allow read: if role() in ['admin', 'accountant']
    || (role() == 'stylist' && resource.data.stylistId == request.auth.uid);
  allow write: if role() == 'admin';   // + webhook vía Admin SDK (bypassa reglas)
}
match /users/{uid} {
  allow read: if role() == 'admin' || request.auth.uid == uid;
  ...
}
```

Nota: el webhook de pagos hoy usa el SDK cliente desde el servidor; al endurecer
las reglas debe migrar a **firebase-admin** con una service account (bypassa
reglas de forma legítima).

## Respaldos (se puede hacer HOY, sin tocar código)

Opción A — consola: Firebase → Firestore → *Disaster recovery* → habilitar
**backups programados** (diario, retención 7–35 días). Un clic.

Opción B — exports a Cloud Storage (más control):
```bash
gcloud firestore export gs://<bucket-de-backups> --project <project-id>
# programable con Cloud Scheduler (diario 3:00 AM America/Panama)
```

## Mitigaciones ya aplicadas (2026-07-04)

- Cuentas de prueba con rol admin/stylist ocultadas (`users-config/deleted`),
  incluida la cuenta admin con el teléfono público del salón.
- Eliminada la limpieza automática que podía tombstonear comisiones válidas;
  los deletes cross-device ahora hacen unión (no sobrescriben tombstones).
- El sistema de restauración (`<domain>-config/restored`) permite revertir
  cualquier ocultamiento hecho por error.

## Orden recomendado

1. **Respaldos** (hoy, 5 minutos, consola).
2. **Fase 1 Auth** (el grueso del trabajo de código; se puede hacer por rol:
   primero admin/contador, luego estilistas, clientes al final).
3. **Fase 2 App Check** (1–2 horas).
4. **Fase 3 reglas** (con Auth ya desplegado; probar en el emulador antes).
