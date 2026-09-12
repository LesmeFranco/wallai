-- Habilita Row Level Security (RLS) en todas las tablas del esquema publico.
--
-- QUE PROBLEMA ARREGLA, desde la raiz:
--
-- Supabase no expone la base solo a traves de nuestro backend. Todo proyecto
-- tiene ademas una API REST automatica (PostgREST) que publica cada tabla en
-- https://<proyecto>.supabase.co/rest/v1/<tabla>, y a esa API se entra con la
-- clave anonima. Esa clave es publica por diseno: viaja dentro del APK, asi que
-- cualquiera que abra el archivo la puede leer. No es un secreto y no puede
-- serlo.
--
-- Lo que hace segura a esa clave es RLS: sin politicas que permitan algo, la
-- base no devuelve ni acepta nada. Y RLS viene DESACTIVADO por defecto en las
-- tablas que uno crea con sus propias migraciones (solo las que se crean desde
-- el panel de Supabase lo traen activado). Este proyecto creo todo con Drizzle,
-- asi que nunca se activo.
--
-- Consecuencia, comprobada contra la base real antes de escribir esto: con solo
-- la clave anonima se podia leer la tabla `gastos`, leer `usuarios` con sus
-- emails, listar los `codigo_invitacion` de todos los hogares, e insertar filas
-- (el intento fallo por una violacion de NOT NULL, 23502, no por permisos: con
-- datos validos habria entrado). Todas las reglas de autorizacion del backend
-- -que el servidor decide el hogar, que solo el autor edita o borra, que no se
-- puede leer un grupo ajeno- se saltean yendo directo a PostgREST.
--
-- POR QUE ALCANZA CON ACTIVARLO Y NO HACE FALTA ESCRIBIR NINGUNA POLITICA:
--
-- Activar RLS sin definir politicas significa "nadie puede hacer nada", que es
-- exactamente lo que queremos para los roles `anon` y `authenticated`: en esta
-- arquitectura el cliente NUNCA habla con la base directamente, siempre pasa
-- por tRPC. La app mobile usa la clave anonima solo para Supabase Auth, que
-- vive en el esquema `auth` y no lo toca esta migracion.
--
-- El backend sigue funcionando sin cambiar una linea porque se conecta con el
-- rol `postgres`, que es el DUENIO de las tablas, y en PostgreSQL el duenio
-- ignora RLS salvo que se use FORCE ROW LEVEL SECURITY (que a proposito no
-- usamos aca). O sea: se cierra la puerta de atras sin tocar la de adelante.
--
-- Si algun dia se quisiera que el cliente lea directo de la base (por ejemplo
-- para Supabase Realtime, que es una de las decisiones abiertas del proyecto),
-- ESE es el momento de escribir politicas concretas tabla por tabla. Hasta
-- entonces, denegar todo es lo correcto y lo mas simple de auditar.
--
-- Es idempotente: activar RLS en una tabla que ya lo tiene no hace nada.

ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hogares" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "usuario_hogar" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "categorias" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gastos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reglas_tageo" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "objetivos" ENABLE ROW LEVEL SECURITY;
