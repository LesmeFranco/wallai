CREATE TYPE "public"."medio_de_pago" AS ENUM('efectivo', 'debito', 'credito', 'transferencia', 'otro');--> statement-breakpoint
CREATE TYPE "public"."origen_categoria" AS ENUM('automatico', 'manual');--> statement-breakpoint
CREATE TYPE "public"."periodo_objetivo" AS ENUM('semanal', 'mensual');--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"fecha_alta" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "hogares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"codigo_invitacion" text NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hogares_codigo_invitacion_unique" UNIQUE("codigo_invitacion"),
	CONSTRAINT "hogares_codigo_formato" CHECK ("hogares"."codigo_invitacion" ~ '^[A-Z2-9]{6}$')
);
--> statement-breakpoint
CREATE TABLE "usuario_hogar" (
	"usuario_id" uuid NOT NULL,
	"hogar_id" uuid NOT NULL,
	"unido_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_hogar_usuario_id_hogar_id_pk" PRIMARY KEY("usuario_id","hogar_id")
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"clave" text,
	"hogar_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gastos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"hogar_id" uuid,
	"monto_centavos" bigint NOT NULL,
	"texto_original" text NOT NULL,
	"categoria_id" uuid NOT NULL,
	"origen_categoria" "origen_categoria" DEFAULT 'automatico' NOT NULL,
	"fecha" date DEFAULT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date NOT NULL,
	"medio_de_pago" "medio_de_pago",
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gastos_monto_valido" CHECK ("gastos"."monto_centavos" > 0 and "gastos"."monto_centavos" <= 1000000000000),
	CONSTRAINT "gastos_texto_no_vacio" CHECK (length(trim("gastos"."texto_original")) > 0)
);
--> statement-breakpoint
CREATE TABLE "reglas_tageo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hogar_id" uuid,
	"usuario_id" uuid,
	"patron" text NOT NULL,
	"patron_normalizado" text NOT NULL,
	"categoria_id" uuid NOT NULL,
	"veces_confirmada" integer DEFAULT 1 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reglas_tageo_un_solo_duenio" CHECK (num_nonnulls("reglas_tageo"."hogar_id", "reglas_tageo"."usuario_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "objetivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"hogar_id" uuid,
	"categoria_id" uuid,
	"monto_limite_centavos" bigint NOT NULL,
	"periodo" "periodo_objetivo" NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "objetivos_un_solo_duenio" CHECK (num_nonnulls("objetivos"."usuario_id", "objetivos"."hogar_id") = 1),
	CONSTRAINT "objetivos_monto_valido" CHECK ("objetivos"."monto_limite_centavos" > 0)
);
--> statement-breakpoint
ALTER TABLE "usuario_hogar" ADD CONSTRAINT "usuario_hogar_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_hogar" ADD CONSTRAINT "usuario_hogar_hogar_id_hogares_id_fk" FOREIGN KEY ("hogar_id") REFERENCES "public"."hogares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_hogar_id_hogares_id_fk" FOREIGN KEY ("hogar_id") REFERENCES "public"."hogares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_hogar_id_hogares_id_fk" FOREIGN KEY ("hogar_id") REFERENCES "public"."hogares"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglas_tageo" ADD CONSTRAINT "reglas_tageo_hogar_id_hogares_id_fk" FOREIGN KEY ("hogar_id") REFERENCES "public"."hogares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglas_tageo" ADD CONSTRAINT "reglas_tageo_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglas_tageo" ADD CONSTRAINT "reglas_tageo_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_hogar_id_hogares_id_fk" FOREIGN KEY ("hogar_id") REFERENCES "public"."hogares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usuario_hogar_por_hogar" ON "usuario_hogar" USING btree ("hogar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_global_nombre_unico" ON "categorias" USING btree ("nombre") WHERE "categorias"."hogar_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_hogar_nombre_unico" ON "categorias" USING btree ("hogar_id","nombre") WHERE "categorias"."hogar_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_clave_unica" ON "categorias" USING btree ("clave") WHERE "categorias"."clave" is not null;--> statement-breakpoint
CREATE INDEX "categorias_por_hogar" ON "categorias" USING btree ("hogar_id");--> statement-breakpoint
CREATE INDEX "gastos_por_hogar_y_fecha" ON "gastos" USING btree ("hogar_id","fecha");--> statement-breakpoint
CREATE INDEX "gastos_por_usuario_y_fecha" ON "gastos" USING btree ("usuario_id","fecha");--> statement-breakpoint
CREATE INDEX "gastos_por_categoria" ON "gastos" USING btree ("categoria_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reglas_tageo_patron_por_hogar" ON "reglas_tageo" USING btree ("hogar_id","patron_normalizado") WHERE "reglas_tageo"."hogar_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reglas_tageo_patron_por_usuario" ON "reglas_tageo" USING btree ("usuario_id","patron_normalizado") WHERE "reglas_tageo"."usuario_id" is not null;--> statement-breakpoint
CREATE INDEX "reglas_tageo_por_hogar" ON "reglas_tageo" USING btree ("hogar_id");--> statement-breakpoint
CREATE INDEX "reglas_tageo_por_usuario" ON "reglas_tageo" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "objetivos_unico_usuario_categoria" ON "objetivos" USING btree ("usuario_id","categoria_id","periodo") WHERE "objetivos"."usuario_id" is not null and "objetivos"."categoria_id" is not null and "objetivos"."activo";--> statement-breakpoint
CREATE UNIQUE INDEX "objetivos_unico_usuario_total" ON "objetivos" USING btree ("usuario_id","periodo") WHERE "objetivos"."usuario_id" is not null and "objetivos"."categoria_id" is null and "objetivos"."activo";--> statement-breakpoint
CREATE UNIQUE INDEX "objetivos_unico_hogar_categoria" ON "objetivos" USING btree ("hogar_id","categoria_id","periodo") WHERE "objetivos"."hogar_id" is not null and "objetivos"."categoria_id" is not null and "objetivos"."activo";--> statement-breakpoint
CREATE UNIQUE INDEX "objetivos_unico_hogar_total" ON "objetivos" USING btree ("hogar_id","periodo") WHERE "objetivos"."hogar_id" is not null and "objetivos"."categoria_id" is null and "objetivos"."activo";